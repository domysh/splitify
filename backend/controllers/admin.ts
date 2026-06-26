import { Response } from "express";
import { AuthRequest } from "../models/types";
import { prisma } from "../utils/prisma";

export const getStats = async (req: AuthRequest, res: Response) => {
    const [userCount, boardCount, transactionCount] = await Promise.all([
        prisma.user.count(),
        prisma.board.count(),
        prisma.transaction.count()
    ]);
    res.json({
        users: userCount,
        boards: boardCount,
        transactions: transactionCount
    });
};