import { Router } from "express";
import {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    dismissPasskeyPrompt
} from "../controllers/user";
import { hasRole } from "../middleware/auth";
import {
    validateAddUser,
    validateUpdateUser,
} from "../middleware/validation";
import { Role } from "../models/types";
import { voidReturn as r } from "../utils";

const router = Router();

// Common user APIs
router.delete("/", r(deleteUser));
router.put("/me/passkey-prompt-dismiss", r(dismissPasskeyPrompt));

// Admin user APIs
router.get("/", hasRole(Role.ADMIN), r(getUsers));
router.get("/:id", hasRole(Role.ADMIN), r(getUser));
router.post("/", r(validateAddUser), hasRole(Role.ADMIN), r(createUser));
router.put("/:id", r(validateUpdateUser), hasRole(Role.ADMIN), r(updateUser));
router.delete("/:id", hasRole(Role.ADMIN), r(deleteUser));

export default router;
