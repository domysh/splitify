import { mock } from "bun:test";

mock.module("../utils/socket", () => ({
    emitAdminUpdate: () => {},
    emitUserUpdate: () => {},
    emitBoardUpdate: () => {},
    broadCastUpdate: () => {},
    initializeSocketIO: async () => {},
}));

import { prisma } from "../utils/prisma";
import { Role } from "../models/types";
import { hashPassword } from "../utils/auth";
import app from "../app";
import request from "supertest";

export const getAgent = () => request(app);

export const clearDatabase = async () => {
    // Delete all records in relevant tables
    await prisma.boardAccess.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.member.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.board.deleteMany();
    await prisma.user.deleteMany();
};

export const createTestUser = async (email = "test@example.com", _password?: string, role = Role.GUEST) => {
    return await prisma.user.create({
        data: {
            email,
            role,
        }
    });
};

export const loginTestUser = async (agent: request.SuperAgentTest, email = "test@example.com") => {
    await agent.post("/api/login").send({ email });
    const otpRec = await prisma.otpCode.findUnique({ where: { email } });
    if (!otpRec) throw new Error('OTP not created');
    const res = await agent.post("/api/verify-otp").send({ email, code: otpRec.code });
    return res.body.access_token;
};
