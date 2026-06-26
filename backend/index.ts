import http from "http";
import app from "./app";
import { initializeSocketIO } from "./utils/socket";
import crypto from "crypto";
import { prisma } from "./utils/prisma";
import { Role } from "./models/types";
import { hashPassword } from "./utils/auth";

const PORT = process.env.PORT || 8080;
const server = http.createServer(app);

initializeSocketIO(server).then(() => {
    console.log("Socket.IO initialized");
});

const initAdminUser = async () => {
    try {
        const adminUser = await prisma.user.findFirst({ where: { role: Role.ADMIN } });

        if (!adminUser) {
            const DEFAULT_PSW =
                process.env.DEFAULT_PSW ||
                crypto.randomBytes(16).toString("hex");
            const hashedPassword = await hashPassword(DEFAULT_PSW);

            await prisma.user.create({
                data: {
                    username: "admin",
                    password: hashedPassword,
                    role: Role.ADMIN,
                }
            });

            console.log("'admin' Created! Password:", DEFAULT_PSW);
        }
    } catch (error) {
        console.error("Error creating admin user:", error);
    }
};

prisma.$connect()
    .then(() => {
        console.log("Connected to the database");
        initAdminUser().then(() => {
            server.listen(PORT, () => {
                console.log(`Server started on port ${PORT}`);
            });
        });
    })
    .catch((err: any) => {
        console.error("Failed to connect to the database:", err);
    });

process.on("SIGINT", async () => {
    try {
        await prisma.$disconnect();
        console.log("Database connection closed");
        process.exit(0);
    } catch (err) {
        console.error("Error shutting down:", err);
        process.exit(1);
    }
});
