import { Response } from 'express';
import Member from '../../models/Member';
import Transaction from '../../models/Transaction';
import Product from '../../models/Product';
import { emitBoardUpdate } from '../../utils/socket';
import { ObjectId } from 'mongodb';
import { AddMember, AuthRequest, BoardPermission } from '../../models/types';
import { generateRandomObjectId } from '../../utils';
import { getAuthenticatedBoard } from '../../utils';

export const getBoardMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.VIEWER);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const members = await Member.find({ boardId: new ObjectId(id) as any });

    const formattedMembers = members.map(member => ({
      id: member._id.toString(),
      name: member.name,
      paid: member.paid,
      categories: member.categories
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

    const newMember = await Member.create({
      _id: generateRandomObjectId(),
      boardId: new ObjectId(id) as any,
      name: memberData.name,
      paid: memberData.paid || 0,
      categories: memberData.categories.map(a => new ObjectId(a) as any) || []
    });

    emitBoardUpdate(id, ['members']);
    res.status(201).json({ id: newMember._id.toString() });
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

    const memberBefore = await Member.findOne({
      _id: new ObjectId(member_id),
      boardId: new ObjectId(id) as any
    });

    if (!memberBefore) {
      res.status(400).json({ message: 'Board or member not found' });
      return;
    }

    const updatedMember = await Member.findByIdAndUpdate(
      member_id,
      { $set: memberData },
      { new: true }
    );

    if (!updatedMember) {
      res.status(400).json({ message: 'Board or member not found' });
      return;
    }

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

    const memberObjectId = new ObjectId(member_id);
    const boardObjectId = new ObjectId(id);

    if (transferToMemberId) {
      const transferObjectId = new ObjectId(transferToMemberId as string);
      
      const newMember = await Member.findOne({ _id: transferObjectId, boardId: boardObjectId as any });
      if (!newMember) return res.status(400).json({ message: 'Transfer member not found' });
      
      const oldMember = await Member.findOne({ _id: memberObjectId, boardId: boardObjectId as any });
      if (!oldMember) return res.status(400).json({ message: 'Member not found' });

      await Member.findByIdAndUpdate(newMember._id, { $inc: { paid: oldMember.paid } });

      const transactions = await Transaction.find({
        boardId: boardObjectId as any,
        $or: [ { fromMemberId: memberObjectId }, { toMemberId: memberObjectId } ]
      });

      for (const t of transactions) {
        let newFrom = t.fromMemberId?.toString() === memberObjectId.toString() ? newMember._id : t.fromMemberId;
        let newTo = t.toMemberId?.toString() === memberObjectId.toString() ? newMember._id : t.toMemberId;
        
        if (newFrom?.toString() === newTo?.toString() && newFrom != null) {
          await Transaction.findByIdAndDelete(t._id);
        } else {
          await Transaction.findByIdAndUpdate(t._id, { fromMemberId: newFrom, toMemberId: newTo });
        }
      }

      await Member.findByIdAndDelete(memberObjectId);
    } else {
      const transactions = await Transaction.find({
        boardId: boardObjectId as any,
        $or: [
          { fromMemberId: memberObjectId },
          { toMemberId: memberObjectId }
        ]
      });

      for (const transaction of transactions) {
        if (!transaction.cancelled) {
          if (transaction.fromMemberId && transaction.fromMemberId.toString() !== memberObjectId.toString()) {
            await Member.findByIdAndUpdate(
              transaction.fromMemberId,
              { $inc: { paid: -transaction.amount } }
            );
          }

          if (transaction.toMemberId && transaction.toMemberId.toString() !== memberObjectId.toString()) {
            await Member.findByIdAndUpdate(
              transaction.toMemberId,
              { $inc: { paid: transaction.amount } }
            );
          }

          if (transaction.productId) {
            await Product.findByIdAndDelete(transaction.productId);
          }
        }
        await Transaction.findByIdAndDelete(transaction._id);
      }

      await Member.findOneAndDelete({
        _id: memberObjectId,
        boardId: boardObjectId as any
      });
    }

    emitBoardUpdate(id, ['members', 'transactions', 'products']);
    res.json({ id: member_id });
  } catch (err) {
    console.error("Error deleting member:", err);
    res.status(400).json({ message: 'Failed to delete member' });
  }
};
