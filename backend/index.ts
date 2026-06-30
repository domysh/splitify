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
            if (!process.env.ADMIN_EMAIL) {
                console.error("FATAL ERROR: Nessun admin presente nel database e variabile ADMIN_EMAIL non impostata.");
                process.exit(1);
            }
            await prisma.user.create({
                data: {
                    email: process.env.ADMIN_EMAIL,
                    role: Role.ADMIN,
                }
            });
            console.log(`Admin user created with email ${process.env.ADMIN_EMAIL}!`);
        }
    } catch (error) {
        console.error("Error creating admin user:", error);
    }
};

prisma.$connect()
    .then(() => {
        console.log("Connected to the database");
        if (!process.env.SMTP_HOST) {
            console.error("FATAL ERROR: La configurazione SMTP (SMTP_HOST) non è impostata nelle variabili d'ambiente.");
            process.exit(1);
        }

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
