import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { getAgent, clearDatabase, createTestUser, loginTestUser } from "./setup";
import { Role } from "../models/types";

describe("Admin API", () => {
    const agent = getAgent();
    let adminToken: string;
    let guestToken: string;

    beforeAll(async () => {
        await clearDatabase();
        await createTestUser("admin_test@test.com", undefined, Role.ADMIN);
        await createTestUser("guest_test@test.com", undefined, Role.GUEST);

        adminToken = await loginTestUser(agent as any, "admin_test@test.com");
        guestToken = await loginTestUser(agent as any, "guest_test@test.com");
    });

    afterAll(async () => {
        await clearDatabase();
    });

    it("should reject non-admin users", async () => {
        const res = await agent.get("/api/admin/stats").set("Authorization", `Bearer ${guestToken}`);
        expect(res.status).toBe(401);
    });

    it("should allow admin users to get stats", async () => {
        const res = await agent.get("/api/admin/stats").set("Authorization", `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.body.users).toBeDefined();
        expect(res.body.boards).toBeDefined();
    });
});
