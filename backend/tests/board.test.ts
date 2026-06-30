import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { getAgent, clearDatabase, createTestUser, loginTestUser } from "./setup";
import { Role } from "../models/types";

describe("Board API", () => {
    const agent = getAgent();
    let guestToken: string;
    let boardId: string;

    beforeAll(async () => {
        await clearDatabase();
        await createTestUser("board_tester@test.com", undefined, Role.GUEST);

        guestToken = await loginTestUser(agent as any, "board_tester@test.com");
    });

    afterAll(async () => {
        await clearDatabase();
    });

    it("should create a new board", async () => {
        const res = await agent.post("/api/boards").set("Authorization", `Bearer ${guestToken}`).send({
            name: "Test Board",
            isPublic: false
        });
        expect(res.status).toBe(201);
        expect(res.body.id).toBeDefined();
        boardId = res.body.id;
    });

    it("should list boards for user", async () => {
        const res = await agent.get("/api/boards").set("Authorization", `Bearer ${guestToken}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].name).toBe("Test Board");
    });

    it("should get specific board", async () => {
        const res = await agent.get(`/api/boards/${boardId}`).set("Authorization", `Bearer ${guestToken}`);
        expect(res.status).toBe(200);
        expect(res.body.name).toBe("Test Board");
    });

    it("should update a board", async () => {
        const res = await agent.put(`/api/boards/${boardId}`).set("Authorization", `Bearer ${guestToken}`).send({
            name: "Updated Test Board",
            isPublic: true
        });
        expect([200, 204]).toContain(res.status);
    });

    it("should add a category to board", async () => {
        const res = await agent.post(`/api/boards/${boardId}/categories`).set("Authorization", `Bearer ${guestToken}`).send({
            name: "Food",
            order: 0
        });
        expect([200, 201]).toContain(res.status);
        expect(res.body.id).toBeDefined();
    });

    it("should add a member to board", async () => {
        const res = await agent.post(`/api/boards/${boardId}/members`).set("Authorization", `Bearer ${guestToken}`).send({
            name: "Alice",
            paid: 0,
            categories: []
        });
        expect([200, 201]).toContain(res.status);
        expect(res.body.id).toBeDefined();
    });

    it("should delete a board", async () => {
        const res = await agent.delete(`/api/boards/${boardId}`).set("Authorization", `Bearer ${guestToken}`);
        expect(res.status).toBe(200);
    });
});
