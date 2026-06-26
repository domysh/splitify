import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { emitBoardUpdate } from '../../utils/socket';
import { AddMember, AuthRequest, BoardPermission } from '../../models/types';
import { getAuthenticatedBoard } from '../../utils';

export const getBoardMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.VIEWER);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const members = await prisma.member.findMany({
      where: { boardId: id },
      include: { categories: true }
    });

    const formattedMembers = members.map(member => ({
      id: member.id,
      name: member.name,
      paid: member.paid,
      categories: member.categories.map(c => c.categoryId)
    }));

    res.json(formattedMembers);
  } catch (err) {
    res.status(400).json({ message: 'Failed to fetch members' });
  }
};

export const createMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const memberData: AddMember = req.body;

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.EDITOR);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const newMember = await prisma.member.create({
      data: {
        boardId: id,
        name: memberData.name,
        paid: memberData.paid || 0,
        categories: {
          create: memberData.categories.map(categoryId => ({
            categoryId
          }))
        }
      }
    });

    emitBoardUpdate(id, ['members']);
    res.status(201).json({ id: newMember.id });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create member' });
  }
};

export const updateMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, member_id } = req.params;
    const memberData: AddMember = req.body;

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.EDITOR);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const existingMember = await prisma.member.findFirst({
      where: { id: member_id, boardId: id }
    });

    if (!existingMember) {
      return res.status(404).json({ message: 'Board or member not found' });
    }

    // Delete existing categories and create new ones
    await prisma.categoryToMember.deleteMany({
      where: { memberId: member_id }
    });

    const updatedMember = await prisma.member.update({
      where: { id: member_id },
      data: {
        name: memberData.name,
        paid: memberData.paid,
        categories: {
          create: memberData.categories?.map(categoryId => ({
            categoryId
          })) || []
        }
      }
    });

    emitBoardUpdate(id, ['members']);
    res.json({ id: member_id });
  } catch (err) {
    console.error('Error updating member:', err);
    res.status(400).json({ message: 'Failed to update member' });
  }
};

export const deleteMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, member_id } = req.params;
    const { transferToMemberId } = req.query;

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.EDITOR);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    if (transferToMemberId) {
      const transferId = transferToMemberId as string;
      
      const newMember = await prisma.member.findFirst({ where: { id: transferId, boardId: id } });
      if (!newMember) return res.status(400).json({ message: 'Transfer member not found' });
      
      const oldMember = await prisma.member.findFirst({ where: { id: member_id, boardId: id } });
      if (!oldMember) return res.status(400).json({ message: 'Member not found' });

      await prisma.member.update({
        where: { id: newMember.id },
        data: { paid: { increment: oldMember.paid } }
      });

      const transactions = await prisma.transaction.findMany({
        where: {
          boardId: id,
          OR: [ { fromMemberId: member_id }, { toMemberId: member_id } ]
        }
      });

      for (const t of transactions) {
        let newFrom = t.fromMemberId === member_id ? newMember.id : t.fromMemberId;
        let newTo = t.toMemberId === member_id ? newMember.id : t.toMemberId;
        
        if (newFrom === newTo && newFrom !== null) {
          await prisma.transaction.delete({ where: { id: t.id } });
        } else {
          await prisma.transaction.update({
            where: { id: t.id },
            data: { fromMemberId: newFrom, toMemberId: newTo }
          });
        }
      }

      await prisma.member.delete({ where: { id: member_id } });
    } else {
      const transactions = await prisma.transaction.findMany({
        where: {
          boardId: id,
          OR: [ { fromMemberId: member_id }, { toMemberId: member_id } ]
        }
      });

      for (const transaction of transactions) {
        if (!transaction.cancelled) {
          if (transaction.fromMemberId && transaction.fromMemberId !== member_id) {
            await prisma.member.update({
              where: { id: transaction.fromMemberId },
              data: { paid: { decrement: transaction.amount } }
            });
          }

          if (transaction.toMemberId && transaction.toMemberId !== member_id) {
            await prisma.member.update({
              where: { id: transaction.toMemberId },
              data: { paid: { increment: transaction.amount } }
            });
          }

          if (transaction.productId) {
            await prisma.product.delete({ where: { id: transaction.productId } }).catch(() => {});
          }
        }
        await prisma.transaction.delete({ where: { id: transaction.id } }).catch(() => {});
      }

      await prisma.member.delete({
        where: { id: member_id }
      });
    }

    emitBoardUpdate(id, ['members', 'transactions', 'products']);
    res.json({ id: member_id });
  } catch (err) {
    console.error("Error deleting member:", err);
    res.status(400).json({ message: 'Failed to delete member' });
  }
};
