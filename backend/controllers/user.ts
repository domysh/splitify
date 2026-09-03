import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AddUser, AuthRequest, ConfirmEmailChange, RequestEmailChange, Role, UpdateUser } from '../models/types';
import { emitAdminUpdate, emitUserUpdate, emitBoardUpdate } from '../utils/socket';
import { deleteBoardAction } from './board/board';
import { generateOtp, OTP_RESEND_COOLDOWN_SECONDS, OTP_VALIDITY_MINUTES } from './auth';
import { sendInfoMail, sendOtpMail } from '../utils/mailer';

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

const MAX_EMAIL_CHANGE_ATTEMPTS = 5;

/**
 * Starts (or restarts) an email change: a one-time code is sent to the new
 * address, which becomes the account email only once that code is confirmed.
 * The code lives in its own table, so it can never be used to log in.
 */
export const requestEmailChange = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { email }: RequestEmailChange = req.body;
  const newEmail = email.toLowerCase();

  if (newEmail === user.email) {
    return res.status(400).json({ message: 'La nuova email è uguale a quella attuale' });
  }

  const existingUser = await prisma.user.findFirst({ where: { email: newEmail } });
  if (existingUser) {
    return res.status(400).json({ message: 'L\'email esiste già' });
  }

  const pending = await prisma.emailChangeRequest.findUnique({ where: { userId: user.id } });
  // The cooldown only applies while re-sending to the same address, so that
  // fixing a typo does not force the user to wait a minute.
  if (pending && pending.newEmail === newEmail && pending.nextResendAt > new Date()) {
    return res.status(429).json({ message: 'Attendi prima di richiedere un nuovo codice' });
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_VALIDITY_MINUTES * 60 * 1000);
  const nextResendAt = new Date(Date.now() + OTP_RESEND_COOLDOWN_SECONDS * 1000);

  await prisma.emailChangeRequest.upsert({
    where: { userId: user.id },
    update: { newEmail, code, expiresAt, nextResendAt, attempts: 0 },
    create: { userId: user.id, newEmail, code, expiresAt, nextResendAt, attempts: 0 }
  });

  try {
    await sendOtpMail(newEmail, code, {
      subject: 'Conferma la tua nuova email Splitify',
      title: 'Cambio Email',
      intro: 'Hai richiesto di associare questo indirizzo al tuo account Splitify. Usa questo codice monouso per confermare il cambio:',
      validityMinutes: OTP_VALIDITY_MINUTES
    });
  } catch (e) {
    console.error('Error sending email change code:', e);
    await prisma.emailChangeRequest.deleteMany({ where: { userId: user.id } });
    return res.status(500).json({ message: 'Errore durante l\'invio dell\'email' });
  }

  emitUserUpdate(user.id, ['me']);
  return res.json({ newEmail, expiresAt, nextResendAt });
};

export const confirmEmailChange = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const { code }: ConfirmEmailChange = req.body;

  const pending = await prisma.emailChangeRequest.findUnique({ where: { userId: user.id } });
  if (!pending) {
    return res.status(400).json({ message: 'Nessun cambio email in corso' });
  }

  if (pending.attempts >= MAX_EMAIL_CHANGE_ATTEMPTS) {
    return res.status(429).json({ message: 'Troppi tentativi errati. Richiedi un nuovo codice.' });
  }

  if (pending.expiresAt < new Date()) {
    return res.status(400).json({ message: 'Codice scaduto. Richiedine uno nuovo.' });
  }

  if (pending.code !== code) {
    await prisma.emailChangeRequest.update({
      where: { userId: user.id },
      data: { attempts: { increment: 1 } }
    });
    return res.status(400).json({ message: 'Codice errato' });
  }

  // Re-check now: the address may have been taken while the code was pending.
  const existingUser = await prisma.user.findFirst({ where: { email: pending.newEmail } });
  if (existingUser) {
    await prisma.emailChangeRequest.delete({ where: { userId: user.id } });
    return res.status(400).json({ message: 'L\'email esiste già' });
  }

  const oldEmail = user.email;

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { email: pending.newEmail } }),
    prisma.emailChangeRequest.delete({ where: { userId: user.id } })
  ]);

  // Warn the previous address, so a hijacked account cannot be moved silently.
  try {
    await sendInfoMail(oldEmail, {
      subject: 'Email del tuo account Splitify modificata',
      title: 'Email modificata',
      body: `L'email del tuo account Splitify è stata cambiata in ${pending.newEmail}. Se non sei stato tu, contatta al più presto un amministratore.`
    });
  } catch (e) {
    console.error('Error sending email change notification:', e);
  }

  emitUserUpdate(user.id, ['me']);
  emitAdminUpdate(['users', `users/${user.id}`]);

  return res.json({ id: user.id, email: pending.newEmail });
};

export const cancelEmailChange = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  await prisma.emailChangeRequest.deleteMany({ where: { userId: user.id } });
  emitUserUpdate(user.id, ['me']);
  return res.json({ success: true });
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

    const accesses = await prisma.boardAccess.findMany({ where: { userId } });

    await prisma.user.delete({ where: { id: userId } });
    
    accesses.forEach((access) => emitBoardUpdate(access.boardId));
    emitAdminUpdate(['users', `users/${userId}`, 'stats']);
    emitUserUpdate(userId, ['me']);
    res.json({ id: userId });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: 'Failed to delete user' });
  }
};
