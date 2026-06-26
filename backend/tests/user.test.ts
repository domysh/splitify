import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { getAgent, clearDatabase, createTestUser } from "./setup";
import { Role } from "../models/types";

describe("User API", () => {
    const agent = getAgent();
    let adminToken: string;
    let guestToken: string;
    let targetUserId: string;

    beforeAll(async () => {
        await clearDatabase();
        await createTestUser("admin_user", "password", Role.ADMIN);
        const guestUser = await createTestUser("guest_user", "password", Role.GUEST);
        targetUserId = guestUser.id;

        const adminRes = await agent.post("/api/login").send({ username: "admin_user", password: "password" });
        adminToken = adminRes.body.access_token;

        const guestRes = await agent.post("/api/login").send({ username: "guest_user", password: "password" });
        guestToken = guestRes.body.access_token;
    });

    afterAll(async () => {
        await clearDatabase();
    });

    it("should search users", async () => {
        const res = await agent.get("/api/users/utils/search?q=guest").set("Authorization", `Bearer ${guestToken}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].username).toBe("guest_user");
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

    it("should update own username", async () => {
        const res = await agent.put("/api/users/me/username").set("Authorization", `Bearer ${guestToken}`).send({
            username: "guest_user_updated"
        });
        expect(res.status).toBe(200);
        
        const meRes = await agent.get("/api/me").set("Authorization", `Bearer ${guestToken}`);
        expect(meRes.body.username).toBe("guest_user_updated");
    });
});
