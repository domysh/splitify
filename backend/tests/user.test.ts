import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { getAgent, clearDatabase, createTestUser, loginTestUser } from "./setup";
import { Role } from "../models/types";

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
