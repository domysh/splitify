import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { getAgent, clearDatabase, createTestUser, loginTestUser } from "./setup";
import { Role } from "../models/types";
import { prisma } from "../utils/prisma";

describe("User API", () => {
    const agent = getAgent();
    let adminToken: string;
    let guestToken: string;
    let targetUserId: string;

    beforeAll(async () => {
        await clearDatabase();
        await createTestUser("admin_user@test.com", undefined, Role.ADMIN);
        const guestUser = await createTestUser("guest_user@test.com", undefined, Role.GUEST);
        targetUserId = guestUser.id;

        adminToken = await loginTestUser(agent as any, "admin_user@test.com");
        guestToken = await loginTestUser(agent as any, "guest_user@test.com");
    });

    afterAll(async () => {
        await clearDatabase();
    });

    it("should allow admin to get all users", async () => {
        const res = await agent.get("/api/users").set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it("should prevent guest from getting all users", async () => {
        const res = await agent.get("/api/users").set("Authorization", `Bearer ${guestToken}`);
        expect(res.status).toBe(401);
    });
});

describe("Email change API", () => {
    const agent = getAgent();
    let token: string;
    let userId: string;

    beforeAll(async () => {
        await clearDatabase();
        const user = await createTestUser("change_me@test.com");
        userId = user.id;
        await createTestUser("taken@test.com");
        token = await loginTestUser(agent as any, "change_me@test.com");
    });

    afterAll(async () => {
        await clearDatabase();
    });

    const requestChange = (email: string) =>
        agent.post("/api/users/me/email").set("Authorization", `Bearer ${token}`).send({ email });

    const confirmChange = (code: string) =>
        agent.post("/api/users/me/email/verify").set("Authorization", `Bearer ${token}`).send({ code });

    it("should require authentication", async () => {
        const res = await agent.post("/api/users/me/email").send({ email: "new@test.com" });
        expect(res.status).toBe(401);
    });

    it("should reject an email already in use", async () => {
        const res = await requestChange("taken@test.com");
        expect(res.status).toBe(400);
        expect(await prisma.emailChangeRequest.findUnique({ where: { userId } })).toBeNull();
    });

    it("should reject the current email", async () => {
        const res = await requestChange("change_me@test.com");
        expect(res.status).toBe(400);
    });

    it("should reject a malformed email", async () => {
        const res = await requestChange("not-an-email");
        expect(res.status).toBe(400);
    });

    it("should create a pending request without touching the account email", async () => {
        const res = await requestChange("New_Email@test.com");
        expect(res.status).toBe(200);
        expect(res.body.newEmail).toBe("new_email@test.com");

        const pending = await prisma.emailChangeRequest.findUnique({ where: { userId } });
        expect(pending?.newEmail).toBe("new_email@test.com");
        expect(pending?.code.length).toBe(6);

        const user = await prisma.user.findUnique({ where: { id: userId } });
        expect(user?.email).toBe("change_me@test.com");
    });

    it("should not let the pending code be used to log in", async () => {
        const pending = await prisma.emailChangeRequest.findUnique({ where: { userId } });
        const res = await agent.post("/api/verify-otp").send({
            email: "new_email@test.com",
            code: pending?.code,
        });
        expect(res.status).toBe(400);
    });

    it("should expose the pending change on /me", async () => {
        const res = await agent.get("/api/me").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.email).toBe("change_me@test.com");
        expect(res.body.pendingEmailChange?.newEmail).toBe("new_email@test.com");
    });

    it("should reject a wrong code and count the attempt", async () => {
        const res = await confirmChange("000000");
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Codice errato");

        const pending = await prisma.emailChangeRequest.findUnique({ where: { userId } });
        expect(pending?.attempts).toBe(1);
    });

    it("should reject an expired code", async () => {
        await prisma.emailChangeRequest.update({
            where: { userId },
            data: { expiresAt: new Date(Date.now() - 1000) }
        });
        const pending = await prisma.emailChangeRequest.findUnique({ where: { userId } });
        const res = await confirmChange(pending!.code);
        expect(res.status).toBe(400);
        expect(res.body.message).toContain("scaduto");

        await prisma.emailChangeRequest.update({
            where: { userId },
            data: { expiresAt: new Date(Date.now() + 60 * 1000) }
        });
    });

    it("should enforce the resend cooldown for the same address", async () => {
        const res = await requestChange("new_email@test.com");
        expect(res.status).toBe(429);
    });

    it("should allow retargeting the request to another address", async () => {
        const res = await requestChange("other@test.com");
        expect(res.status).toBe(200);

        const pending = await prisma.emailChangeRequest.findUnique({ where: { userId } });
        expect(pending?.newEmail).toBe("other@test.com");
        expect(pending?.attempts).toBe(0);
    });

    it("should cancel a pending request", async () => {
        const res = await agent.delete("/api/users/me/email").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(await prisma.emailChangeRequest.findUnique({ where: { userId } })).toBeNull();
    });

    it("should refuse to confirm when nothing is pending", async () => {
        const res = await confirmChange("123456");
        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Nessun cambio email in corso");
    });

    it("should apply the change on a correct code", async () => {
        expect((await requestChange("final@test.com")).status).toBe(200);
        const pending = await prisma.emailChangeRequest.findUnique({ where: { userId } });

        const res = await confirmChange(pending!.code);
        expect(res.status).toBe(200);
        expect(res.body.email).toBe("final@test.com");

        const user = await prisma.user.findUnique({ where: { id: userId } });
        expect(user?.email).toBe("final@test.com");
        expect(await prisma.emailChangeRequest.findUnique({ where: { userId } })).toBeNull();
    });

    it("should keep the existing session valid after the change", async () => {
        const res = await agent.get("/api/me").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.email).toBe("final@test.com");
        expect(res.body.pendingEmailChange).toBeNull();
    });
});
