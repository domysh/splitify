import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AddTransaction, AuthRequest, BoardPermission } from '../models/types';
import { emitBoardUpdate } from '../utils/socket';
import { getAuthenticatedBoard } from '../utils';

export const createTransactionHelper = async (
  boardId: string,
  fromMemberId: string | null | undefined,
  toMemberId: string | null | undefined,
  amount: number,
  description: string,
  productId?: string | null
) => {
  const transaction = await prisma.transaction.create({
    data: {
      boardId,
      fromMemberId: fromMemberId || null,
      toMemberId: toMemberId || null,
      amount,
      description,
      productId: productId || null,
      timestamp: new Date()
    }
  });

  if (fromMemberId) {
    await prisma.member.update({
      where: { id: fromMemberId },
      data: { paid: { increment: amount } }
    });
  }

  if (toMemberId) {
    await prisma.member.update({
      where: { id: toMemberId },
      data: { paid: { decrement: amount } }
    });
  }

  emitBoardUpdate(boardId, ['transactions', 'members']);
  return transaction;
};

export const getBoardTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId } = req.params;

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(boardId, userId, BoardPermission.VIEWER);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }
    const transactions = await prisma.transaction.findMany({
      where: { boardId },
      orderBy: { timestamp: 'desc' }
    });
    
    const formatted = transactions.map(t => ({
      ...t,
      id: t.id
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    return res.status(400).json({ message: 'Failed to fetch transactions' });
  }
};

export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId } = req.params;
    const transactionData: AddTransaction = req.body;

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(boardId, userId, BoardPermission.EDITOR);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    if (!transactionData.fromMemberId && !transactionData.toMemberId) {
      return res.status(400).json({ message: 'Specify at least one member' });
    }

    if (transactionData.productId) {
      if (!transactionData.fromMemberId && transactionData.toMemberId) {
        transactionData.fromMemberId = transactionData.toMemberId;
        transactionData.toMemberId = null;
      }

      if (transactionData.fromMemberId && transactionData.toMemberId) {
        return res.status(400).json({ message: 'For product transactions, specify only one member' });
      }
    }

    if (transactionData.fromMemberId) {
      const fromMember = await prisma.member.findFirst({ where: { id: transactionData.fromMemberId } });
      if (!fromMember || fromMember.boardId !== boardId) {
        return res.status(400).json({ message: 'From member not found' });
      }
    }

    if (transactionData.toMemberId) {
      const toMember = await prisma.member.findFirst({ where: { id: transactionData.toMemberId } });
      if (!toMember || toMember.boardId !== boardId) {
        res.status(400).json({ message: 'To member not found' });
        return;
      }
    }

    if (transactionData.productId) {
      const product = await prisma.product.findFirst({ where: { id: transactionData.productId } });
      if (!product || product.boardId !== boardId) {
        res.status(400).json({ message: 'Product not found' });
        return;
      }
    }

    const transaction = await createTransactionHelper(
      boardId,
      transactionData.fromMemberId,
      transactionData.toMemberId,
      transactionData.amount,
      transactionData.description,
      transactionData.productId
    );

    res.status(201).json({ id: transaction.id });
  } catch (err) {
    console.error('Error creating transaction:', err);
    res.status(400).json({ message: 'Failed to create transaction' });
  }
};

export const cancelTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { boardId, transactionId } = req.params;
    const userId = req.user?.id;

    const [board, perm] = await getAuthenticatedBoard(boardId, userId, BoardPermission.EDITOR);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, boardId }
    });
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.cancelled) {
      return res.status(400).json({ message: 'Transaction already cancelled' });
    }

    // Reverse the transaction effects
    if (transaction.fromMemberId) {
      await prisma.member.update({
        where: { id: transaction.fromMemberId },
        data: { paid: { decrement: transaction.amount } }
      });
    }

    if (transaction.toMemberId) {
      await prisma.member.update({
        where: { id: transaction.toMemberId },
        data: { paid: { increment: transaction.amount } }
      });
    }

    if (transaction.productId) {
      await prisma.product.delete({ where: { id: transaction.productId } }).catch(() => {});
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { cancelled: true, productId: null }
    });

    emitBoardUpdate(boardId, ['transactions', 'members', 'products']);
    res.json({ status: 'ok', message: 'Transaction cancelled' });

  } catch (err) {
    console.error('Error cancelling transaction:', err);
    res.status(400).json({ message: 'Failed to cancel transaction' });
  }
};
