import { Router } from "express";
import { voidReturn as r } from "../utils";
import { getStats } from "../controllers/admin";
import { hasRole } from "../middleware/auth";
import { Role } from "../models/types";

const router = Router();
router.use(hasRole(Role.ADMIN));

router.get("/stats", r(getStats));

export default router;
