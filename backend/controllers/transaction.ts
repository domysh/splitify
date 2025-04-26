import { Response } from 'express';
import Transaction from '../models/Transaction';
import Member from '../models/Member';
import Product from '../models/Product';
import { ObjectId } from 'mongodb';
import { AddTransaction, AuthRequest, BoardPermission } from '../models/types';
import { emitBoardUpdate } from '../utils/socket';
import { generateRandomObjectId } from '../utils';
import { getAuthenticatedBoard } from '../utils';

export const createTransactionHelper = async (
  boardId: string ,
  fromMemberId: string | null | undefined,
  toMemberId: string | null | undefined,
  amount: number,
  description: string,
  productId?: string | null 
) => {
  const transaction = new Transaction({
    _id: generateRandomObjectId(),
    boardId: new ObjectId(boardId),
    fromMemberId: fromMemberId? new ObjectId(fromMemberId) : null,
    toMemberId: toMemberId? new ObjectId(toMemberId) : null,
    amount,
    description,
    productId: productId? new ObjectId(productId) : null,
    timestamp: new Date()
  });

  await transaction.save();
  
  if (fromMemberId) {
    await Member.findByIdAndUpdate(
      fromMemberId,
      { $inc: { paid: amount } }
    );
  }
  
  if (toMemberId) {
    await Member.findByIdAndUpdate(
      toMemberId,
      { $inc: { paid: -amount } }
    );
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
    const transactions = await Transaction.find({ boardId: new ObjectId(boardId) }).sort({ timestamp: -1 });
    res.json(transactions);
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
        const fromMember = await Member.findById(transactionData.fromMemberId);
        if (!fromMember || fromMember.boardId.toString() !== boardId) {
            return res.status(400).json({ message: 'From member not found' });
        }
    }
    
    if (transactionData.toMemberId) {
        const toMember = await Member.findById(transactionData.toMemberId);
        if (!toMember || toMember.boardId.toString() !== boardId) {
            res.status(400).json({ message: 'To member not found' });
            return;
        }
    }
    
    
    if (transactionData.productId) {
        const product = await Product.findById(transactionData.productId);
        if (!product || product.boardId.toString() !== boardId) {
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

    res.status(201).json({ id: transaction._id.toString() });
  } catch (err) {
    console.error('Error creating transaction:', err);
    res.status(400).json({ message: 'Failed to create transaction' });
  }
};
