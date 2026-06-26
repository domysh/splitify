import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { getAgent, clearDatabase, createTestUser } from "./setup";

describe("Auth API", () => {
    const agent = getAgent();

    beforeAll(async () => {
        await clearDatabase();
        await createTestUser("testuser", "password123");
    });

    afterAll(async () => {
        await clearDatabase();
    });

    it("should fail to login with wrong credentials", async () => {
        const res = await agent.post("/api/login").send({
            username: "testuser",
            password: "wrongpassword",
        });
        expect(res.status).toBe(406);
        expect(res.body.message).toBe("Wrong password!");
    });

    it("should login successfully with correct credentials", async () => {
        const res = await agent.post("/api/login").send({
            username: "testuser",
            password: "password123",
        });
        expect(res.status).toBe(200);
        expect(res.body.access_token).toBeDefined();
    });

    it("should get current user info (me) when authenticated", async () => {
        const loginRes = await agent.post("/api/login").send({
            username: "testuser",
            password: "password123",
        });
        const token = loginRes.body.access_token;

        const res = await agent.get("/api/me").set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.username).toBe("testuser");
    });

    it("should register a new user successfully", async () => {
        const res = await agent.post("/api/register").send({
            username: "newuser",
            password: "newpassword123",
        });
        // By default REGISTRATION_MODE is PRIVATE. It will return 403 or 201 depending on the env.
        // The default fallback in the code is PRIVATE if no DB env is set. Let's see what happens.
        if (res.status === 403) {
            expect(res.body.message).toBe("Registration is closed");
        } else {
            expect(res.status).toBe(201);
            expect(res.body.access_token).toBeDefined();
        }
    });
});
