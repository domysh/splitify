import { Router } from "express";
import {
    getBoardTransactions,
    createTransaction,
} from "../controllers/transaction";
import { hasRole } from "../middleware/auth";
import { validateAddTransaction } from "../middleware/validation";
import { Role } from "../models/types";
import { voidReturn as r } from "../utils";

const router = Router();

router.get("/:boardId", r(getBoardTransactions));
router.post(
    "/:boardId",
    r(validateAddTransaction),
    hasRole(Role.GUEST),
    r(createTransaction),
);

export default router;
