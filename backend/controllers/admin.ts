import { Response } from "express";
import { AuthRequest } from "../models/types";
import User from "../models/User";
import Board from "../models/Board";
import Transaction from "../models/Transaction";

export const getStats = async (req: AuthRequest, res: Response) => {
    const [userCount, boardCount, transactionCount] = await Promise.all([
        User.countDocuments(),
        Board.countDocuments(),
        Transaction.countDocuments()
    ]);
    res.json({
        users: userCount,
        boards: boardCount,
        transactions: transactionCount
    });
};