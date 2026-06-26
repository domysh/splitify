import express from "express";
import cors from "cors";
import { json, urlencoded } from "body-parser";
import path from "path";
import apiRoutes from "./routes";
import { DEBUG, CORS_ALLOW, TRUST_PROXY } from "./config";

const app = express();

if (TRUST_PROXY) {
    if (TRUST_PROXY.toLowerCase() === "true") {
        app.set("trust proxy", true);
    } else if (!isNaN(Number(TRUST_PROXY))) {
        app.set("trust proxy", Number(TRUST_PROXY));
    } else {
        app.set("trust proxy", TRUST_PROXY);
    }
}

app.use(
    cors({
        origin: CORS_ALLOW || DEBUG ? "*" : false,
        credentials: true,
    }),
);
app.use(json());
app.use(urlencoded({ extended: true }));

app.use("/api", apiRoutes);

if (!DEBUG) {
    app.use(express.static(path.join(__dirname, "frontend")));

    app.get(/.*/, (req, res) => {
        if (req.path.startsWith("/api") || req.path.startsWith("/sock")) {
            res.status(404).send("Not Found");
            return;
        }
        res.sendFile(path.join(__dirname, "frontend", "index.html"));
    });
}

export default app;
