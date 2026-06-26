import { Response } from 'express';
import { AddBoardAccess, AuthRequest, BoardPermission, Role, TransferBoardOwnership } from '../../models/types';
import { prisma } from '../../utils/prisma';
import { emitBoardUpdate, emitUserUpdate } from '../../utils/socket';
import { getAuthenticatedBoard } from '../../utils';

export const getBoardAccesses = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [board] = await getAuthenticatedBoard(id, req.user?.id, BoardPermission.VIEWER);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const accesses = await prisma.boardAccess.findMany({
      where: { boardId: id },
      include: { user: { select: { username: true } } }
    });

    const userDetails = accesses.map(acc => ({
      userId: acc.userId,
      permission: acc.permission,
      username: acc.user.username
    }));

    res.json(userDetails);
  } catch (err) {
    console.error('Error fetching board accesses:', err);
    res.status(400).json({ message: 'Failed to fetch board accesses' });
  }
};

export const addBoardAccess = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const accessData: AddBoardAccess = req.body;

    const [board] = await getAuthenticatedBoard(id, req.user?.id, BoardPermission.OWNER);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: accessData.userId } });
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    if (board.creatorId === accessData.userId) {
      return res.status(400).json({ message: 'Cannot add access for the board owner' });
    }

    const existingAccess = await prisma.boardAccess.findFirst({
      where: { userId: accessData.userId, boardId: id }
    });
    
    if (existingAccess) {
      return res.status(400).json({ message: 'User already has access to this board' });
    }

    const access = await prisma.boardAccess.create({
      data: {
        userId: accessData.userId,
        boardId: id,
        permission: accessData.permission
      }
    });

    emitUserUpdate(accessData.userId, ['boards', `boards/${id}`]);
    emitBoardUpdate(id);
    res.status(201).json({ id: access.id });
  } catch (err) {
    console.error('Error adding board access:', err);
    res.status(400).json({ message: 'Failed to add board access' });
  }
};

export const removeBoardAccess = async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const [board] = await getAuthenticatedBoard(id, req.user?.id, BoardPermission.OWNER);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    if (targetUserId === req.user?.id && req.user?.role !== Role.ADMIN) {
      return res.status(400).json({ message: 'Cannot remove your own access' });
    }

    await prisma.boardAccess.deleteMany({
      where: { userId: targetUserId, boardId: id }
    });

    emitBoardUpdate(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing board access:', err);
    res.status(400).json({ message: 'Failed to remove board access' });
  }
};

export const transferBoardOwnership = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const transferData: TransferBoardOwnership = req.body;

    const [board] = await getAuthenticatedBoard(id, userId, BoardPermission.OWNER);
    
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const newOwner = await prisma.user.findUnique({ where: { id: transferData.newOwnerId } });
    if (!newOwner) {
      return res.status(404).json({ message: 'New owner not found' });
    }

    // Remove any access record for the new owner
    await prisma.boardAccess.deleteMany({
      where: { userId: transferData.newOwnerId, boardId: id }
    });

    // Make old owner an editor
    const existingOldOwnerAccess = await prisma.boardAccess.findFirst({
      where: { userId: board.creatorId, boardId: id }
    });

    if (existingOldOwnerAccess) {
      await prisma.boardAccess.update({
        where: { id: existingOldOwnerAccess.id },
        data: { permission: BoardPermission.EDITOR }
      });
    } else {
      await prisma.boardAccess.create({
        data: { userId: board.creatorId, boardId: id, permission: BoardPermission.EDITOR }
      });
    }

    await prisma.board.update({
      where: { id },
      data: { creatorId: transferData.newOwnerId }
    });

    emitBoardUpdate(id);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error transferring board ownership:', err);
    res.status(400).json({ message: 'Failed to transfer board ownership' });
  }
};

export const updateBoardAccess = async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId } = req.params;
    const { permission } = req.body;
    const currentUserId = req.user?.id;
    
    const [board] = await getAuthenticatedBoard(id, currentUserId, BoardPermission.OWNER);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    
    const accesses = await prisma.boardAccess.findMany({
      where: { boardId: id, userId }
    });

    if (accesses.length === 0) {
      return res.status(404).json({ message: 'Access entry not found' });
    }

    const updatedAccess = await prisma.boardAccess.update({
      where: { id: accesses[0].id },
      data: { permission }
    });

    emitBoardUpdate(id);
    return res.json({ id: updatedAccess.id });
  } catch (err) {
    console.error('Error updating board access:', err);
    return res.status(400).json({ message: 'Failed to update board access' });
  }
};
