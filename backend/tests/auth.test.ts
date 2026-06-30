import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { getAgent, clearDatabase, createTestUser, loginTestUser } from "./setup";
import { prisma } from "../utils/prisma";

describe("Auth API", () => {
    const agent = getAgent();

    beforeAll(async () => {
        await clearDatabase();
        await createTestUser("testuser@test.com", undefined);
    });

    afterAll(async () => {
        await clearDatabase();
    });

    it("should initiate login and create OTP", async () => {
        const res = await agent.post("/api/login").send({
            email: "testuser@test.com",
        });
        expect(res.status).toBe(200);
        expect(res.body.requiresOtp).toBe(true);

        const otpRec = await prisma.otpCode.findUnique({ where: { email: "testuser@test.com" } });
        expect(otpRec).toBeDefined();
        expect(otpRec?.code.length).toBe(6);
    });

    it("should fail to verify with wrong OTP", async () => {
        const res = await agent.post("/api/verify-otp").send({
            email: "testuser@test.com",
            code: "000000",
        });
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Codice errato");
    });

    it("should verify successfully with correct OTP", async () => {
        const otpRec = await prisma.otpCode.findUnique({ where: { email: "testuser@test.com" } });
        const res = await agent.post("/api/verify-otp").send({
            email: "testuser@test.com",
            code: otpRec?.code,
        });
        expect(res.status).toBe(200);
        expect(res.body.access_token).toBeDefined();
    });

    it("should get current user info (me) when authenticated", async () => {
        const token = await loginTestUser(agent as any, "testuser@test.com");

        const res = await agent.get("/api/me").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.email).toBe("testuser@test.com");
    });
});
