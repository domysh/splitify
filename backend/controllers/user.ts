import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { hashPassword, verifyPassword, verifyChallengeToken } from '../utils/auth';
import { AddUser, AuthRequest, ChangePassword, Role, UpdateUser, UpdateUsername } from '../models/types';
import { emitAdminUpdate, emitUserUpdate } from '../utils/socket';
import { deleteBoardAction } from './board/board';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { RP_ID, RP_ORIGIN } from '../config';

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        sessions: {
          orderBy: { lastUsed: 'desc' },
          take: 1
        }
      }
    });

    const formattedUsers = users.map((user: any) => {
      const { password, ...rest } = user;
      const lastAccess = user.sessions.length > 0 ? user.sessions[0].lastUsed : null;
      return { ...rest, lastAccess };
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
        sessions: {
          orderBy: { lastUsed: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    
    const { password, ...rest } = user;
    const lastAccess = user.sessions.length > 0 ? user.sessions[0].lastUsed : null;
    res.json([{ ...rest, lastAccess }]);
  } catch (err) {
    res.status(400).json({ message: 'Failed to fetch user' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, role }: AddUser = req.body;    
    const lowercaseUsername = username.toLowerCase();
    
    const existingUser = await prisma.user.findFirst({ where: { username: lowercaseUsername } });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: lowercaseUsername,
        password: hashedPassword,
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
    const { username, password, role }: UpdateUser = req.body;

    const lowercaseUsername = username?.toLowerCase();
    
    if (lowercaseUsername === 'admin' && req.user?.role !== Role.ADMIN) {
      return res.status(400).json({ message: "'admin' is reserved" });
    }
    
    const user = await prisma.user.findUnique({ where: { id } });
    
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const dataToUpdate: any = {};

    if (lowercaseUsername && lowercaseUsername !== user.username) {
      const existingUser = await prisma.user.findFirst({ where: { username: lowercaseUsername } });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      dataToUpdate.username = lowercaseUsername;
    }
    
    if (password) {
      dataToUpdate.password = await hashPassword(password);
    }
    
    if (role) {
      if (role !== Role.ADMIN && (dataToUpdate.username || user.username) === 'admin') {
        return res.status(400).json({ message: "'admin' can only be an administrator" });
      }
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

export const updateUsername = async (req: AuthRequest, res: Response) => {
  try {
    const { username }: UpdateUsername = req.body;
    const lowercaseUsername = username?.toLowerCase();
    
    if (lowercaseUsername === 'admin' && req.user?.role !== Role.ADMIN) {
      return res.status(400).json({ message: "'admin' is reserved" });
    }
    
    if (!req.user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (lowercaseUsername && lowercaseUsername !== req.user.username) {      
      const existingUser = await prisma.user.findFirst({ where: { username: lowercaseUsername } });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      await prisma.user.update({
        where: { id: req.user.id },
        data: { username: lowercaseUsername }
      });
    }
    
    emitAdminUpdate(['users', `users/${req.user.id}`]);
    emitUserUpdate(req.user.id, ['me']);
    
    res.json({ id: req.user.id });
  } catch (err) {
    console.error('Error updating username:', err);
    res.status(400).json({ message: 'Failed to update username' });
  }
};

export const changeUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword }: ChangePassword = req.body;
    const { expireSessions } = req.query;

    if (!req.user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const validPassword = await verifyPassword(oldPassword, req.user.password);
    if (!validPassword) {
      return res.status(406).json({ message: 'Wrong password!' });
    }

    const hashedPassword = await hashPassword(newPassword);

    if (expireSessions?.toString().toLowerCase() === 'true' && req.token) {
      await prisma.userSession.deleteMany({
        where: { userId: req.user.id, sessionId: { not: req.token.sid } }
      });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });
    
    emitAdminUpdate(['users', `users/${req.user.id}`]);
    emitUserUpdate(req.user.id, ['me']);
    
    res.json({ id: req.user.id });
  } catch (err) {
    console.error('Error changing password:', err);
    res.status(400).json({ message: 'Failed to change password' });
  }
}

export const changePasswordWithPasskey = async (req: AuthRequest, res: Response) => {
  try {
    const { newPassword, response, token } = req.body;
    const { expireSessions } = req.query;

    if (!req.user) return res.status(400).json({ message: 'User not found' });

    const expectedChallenge = await verifyChallengeToken(token);
    if (!expectedChallenge) {
      return res.status(400).json({ message: 'Invalid or expired challenge' });
    }

    const userWithPasskeys = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { passkeys: true }
    });

    const passkey = userWithPasskeys?.passkeys.find((pk: any) => pk.id === response.id);
    if (!passkey) {
      return res.status(400).json({ message: 'Passkey non trovata per questo utente' });
    }

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: RP_ORIGIN,
        expectedRPID: RP_ID,
        credential: {
          id: passkey.id,
          publicKey: passkey.publicKey,
          counter: passkey.counter,
          transports: passkey.transports as any,
        },
      });
    } catch (error: any) {
      console.error(error);
      return res.status(400).json({ message: error.message });
    }

    if (!verification.verified) {
      return res.status(400).json({ message: 'Autenticazione passkey fallita' });
    }

    await prisma.passkey.update({
      where: { id: passkey.id },
      data: { counter: verification.authenticationInfo.newCounter }
    });

    const hashedPassword = await hashPassword(newPassword);

    if (expireSessions?.toString().toLowerCase() === 'true' && req.token) {
      await prisma.userSession.deleteMany({
        where: { userId: req.user.id, sessionId: { not: req.token.sid } }
      });
    }

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    emitAdminUpdate(['users', `users/${req.user.id}`]);
    emitUserUpdate(req.user.id, ['me']);
    
    res.json({ id: req.user.id });
  } catch (err) {
    console.error('Error changing password with passkey:', err);
    res.status(400).json({ message: 'Failed to change password' });
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

    // Cascade delete on user should handle everything else, but if not we can delete explicitly.
    await prisma.user.delete({ where: { id: userId } });
    
    emitAdminUpdate(['users', `users/${userId}`, 'stats']);
    emitUserUpdate(userId, ['me']);
    res.json({ id: userId });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: 'Failed to delete user' });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    
    const users = await prisma.user.findMany({
      where: {
        username: { startsWith: q, mode: 'insensitive' }
      },
      select: { id: true, username: true },
      take: 15
    });
    
    res.json(users);
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(400).json({ message: 'Failed to search users' });
  }
};
