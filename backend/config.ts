import dotenv from "dotenv";

dotenv.config();

export const DEBUG =
    process.env.DEBUG?.toLowerCase() === "true" || process.env.DEBUG === "1";
export const CORS_ALLOW =
    process.env.CORS_ALLOW?.toLowerCase() === "true" ||
    process.env.CORS_ALLOW === "1";
export const TRUST_PROXY = process.env.TRUST_PROXY;
export const DEFAULT_PSW = process.env.DEFAULT_PSW;
export const JWT_ALGORITHM = "HS256";
export const RP_ID = process.env.RP_ID || "localhost";
export const RP_ORIGIN = process.env.RP_ORIGIN || (DEBUG ? "http://localhost:5173" : `http://localhost:${process.env.PORT || 8080}`);
export const RP_NAME = "Splitify";
