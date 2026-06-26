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

export const createTestUser = async (username = "testuser", password = "password123", role = Role.GUEST) => {
    const hashedPassword = await hashPassword(password);
    return await prisma.user.create({
        data: {
            username,
            password: hashedPassword,
            role,
        }
    });
};

export const loginTestUser = async (agent: request.SuperAgentTest, username = "testuser", password = "password123") => {
    const res = await agent.post("/api/login").send({ username, password });
    return res.headers["set-cookie"]; // Extract cookies for future requests
};
