import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { getAgent, clearDatabase, createTestUser } from "./setup";
import { Role } from "../models/types";

describe("Admin API", () => {
    const agent = getAgent();
    let adminToken: string;
    let guestToken: string;

    beforeAll(async () => {
        await clearDatabase();
        await createTestUser("admin_test", "password", Role.ADMIN);
        await createTestUser("guest_test", "password", Role.GUEST);

        const adminRes = await agent.post("/api/login").send({ username: "admin_test", password: "password" });
        adminToken = adminRes.body.access_token;

        const guestRes = await agent.post("/api/login").send({ username: "guest_test", password: "password" });
        guestToken = guestRes.body.access_token;
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
