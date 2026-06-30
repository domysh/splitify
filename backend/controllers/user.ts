import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AddUser, AuthRequest, Role, UpdateUser } from '../models/types';
import { emitAdminUpdate, emitUserUpdate } from '../utils/socket';
import { deleteBoardAction } from './board/board';

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        _count: { select: { boards: true } },
        sessions: {
          orderBy: { lastUsed: 'desc' },
          take: 1
        }
      }
    });

    const formattedUsers = users.map((user: any) => {
      const lastAccess = user.sessions.length > 0 ? user.sessions[0].lastUsed : null;
      const boardsCount = user._count.boards;
      return { ...user, lastAccess, boardsCount, _count: undefined, sessions: undefined };
    });

    res.json(formattedUsers);
  } catch (err) {
    res.status(400).json({ message: 'Failed to fetch users' });
  }
};

const canRemoveAnAdmin = async () => {
  const adminsCount = await prisma.user.count({ where: { role: Role.ADMIN } });
  return adminsCount > 1;
}

export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: { select: { boards: true } },
        sessions: {
          orderBy: { lastUsed: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    const lastAccess = user.sessions.length > 0 ? user.sessions[0].lastUsed : null;
    const boardsCount = user._count.boards;
    res.json([{ ...user, lastAccess, boardsCount, _count: undefined, sessions: undefined }]);
  } catch (err) {
    res.status(400).json({ message: 'Failed to fetch user' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, role }: AddUser = req.body;    
    const lowercaseEmail = email.toLowerCase();
    
    const existingUser = await prisma.user.findFirst({ where: { email: lowercaseEmail } });
    if (existingUser) {
      return res.status(400).json({ message: 'L\'email esiste già' });
    }
    
    const user = await prisma.user.create({
      data: {
        email: lowercaseEmail,
        role: role || Role.GUEST
      }
    });
    
    emitAdminUpdate(['users']);
    return res.status(201).json({ id: user.id });
  } catch (err) {
    return res.status(400).json({ message: 'Failed to create user' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { email, role }: UpdateUser = req.body;

    const lowercaseEmail = email?.toLowerCase();
    
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const dataToUpdate: any = {};

    if (lowercaseEmail && lowercaseEmail !== user.email) {
      const existingUser = await prisma.user.findFirst({ where: { email: lowercaseEmail } });
      if (existingUser) {
        return res.status(400).json({ message: 'L\'email esiste già' });
      }
      dataToUpdate.email = lowercaseEmail;
    }
    
    if (role) {
      if (user.role === Role.ADMIN && role !== Role.ADMIN && !await canRemoveAnAdmin()) {
        return res.status(400).json({ message: "At least one admin is required" });
      }
      dataToUpdate.role = role;
    }
    
    await prisma.user.update({
      where: { id },
      data: dataToUpdate
    });

    emitAdminUpdate(['users', `users/${id}`]);
    emitUserUpdate(user.id, ['me']);
    
    res.json({ id: user.id });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(400).json({ message: 'Failed to update user' });
  }
};

export const dismissPasskeyPrompt = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(400).json({ message: 'User not found' });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { passkeyPromptDismissed: true }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error dismissing passkey prompt:', err);
    res.status(500).json({ message: 'Failed to dismiss passkey prompt' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = id || req.user?.id;
    
    if (!userId) {
      return res.status(400).json({ message: 'User not found' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.role === Role.ADMIN && !await canRemoveAnAdmin()) {
      return res.status(400).json({ message: "At least one admin is required" });
    }

    const ownedBoards = await prisma.board.findMany({ where: { creatorId: userId } });
    await Promise.all(ownedBoards.map((board: any) => deleteBoardAction(board.id)));

    await prisma.user.delete({ where: { id: userId } });
    
    emitAdminUpdate(['users', `users/${userId}`, 'stats']);
    emitUserUpdate(userId, ['me']);
    res.json({ id: userId });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: 'Failed to delete user' });
  }
};
