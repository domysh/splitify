import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { getAgent, clearDatabase, createTestUser } from "./setup";
import { Role } from "../models/types";

describe("Transaction API", () => {
    const agent = getAgent();
    let guestToken: string;
    let boardId: string;
    let memberId: string;

    beforeAll(async () => {
        await clearDatabase();
        await createTestUser("tx_tester", "password", Role.GUEST);

        const res = await agent.post("/api/login").send({ username: "tx_tester", password: "password" });
        guestToken = res.body.access_token;

        // Create board and member for transactions
        const boardRes = await agent.post("/api/boards").set("Authorization", `Bearer ${guestToken}`).send({
            name: "Tx Board"
        });
        boardId = boardRes.body.id;

        const memberRes = await agent.post(`/api/boards/${boardId}/members`).set("Authorization", `Bearer ${guestToken}`).send({
            name: "Tx Member",
            paid: 0,
            categories: []
        });
        memberId = memberRes.body.id;
    });

    afterAll(async () => {
        await clearDatabase();
    });

    it("should list empty transactions", async () => {
        const res = await agent.get(`/api/transactions/${boardId}`).set("Authorization", `Bearer ${guestToken}`);
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(0);
    });

    it("should create a new transaction", async () => {
        const res = await agent.post(`/api/transactions/${boardId}`).set("Authorization", `Bearer ${guestToken}`).send({
            fromMemberId: memberId,
            amount: 50.0,
            description: "Test Transaction",
        });
        // Sometimes APIs return 200 or 201
        expect([200, 201]).toContain(res.status);
        expect(res.body.id).toBeDefined();
    });
});
