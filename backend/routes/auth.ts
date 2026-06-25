import { Router } from "express";
import {
    login,
    getMe,
    register,
    refreshToken,
    registrationInfo,
    setRegistrationInfo,
    passkeyRegisterStart,
    passkeyRegisterVerify,
    passkeyLoginStart,
    passkeyLoginVerify,
    deleteSession,
    deletePasskey,
    renamePasskey,
    deleteCurrentSession
} from "../controllers/auth";
import { authenticate, hasRole } from "../middleware/auth";
import { voidReturn as r } from "../utils";
import {
    validateLogin,
    validateRegistration,
    validateSetRegistrationMode,
} from "../middleware/validation";
import { Role } from "../models/types";

const router = Router();

router.post("/login", r(validateLogin), r(login));
router.get("/me", authenticate, getMe);
router.post("/register", r(validateRegistration), r(register));
router.post("/register/:token", r(validateRegistration), r(register));
router.post("/token/refresh", r(refreshToken));
router.get("/register/info", r(registrationInfo));
router.put(
    "/register/set",
    hasRole(Role.ADMIN),
    r(validateSetRegistrationMode),
    r(setRegistrationInfo),
);

router.delete("/logout", authenticate, r(deleteCurrentSession));
router.delete("/sessions/:sessionId", authenticate, r(deleteSession));

router.post("/passkey/register/options", authenticate, r(passkeyRegisterStart));
router.post("/passkey/register/verify", authenticate, r(passkeyRegisterVerify));
router.post("/passkey/login/options", r(passkeyLoginStart));
router.post("/passkey/login/verify", r(passkeyLoginVerify));
router.delete("/passkeys/:id", authenticate, r(deletePasskey));
router.put("/passkeys/:id/name", authenticate, r(renamePasskey));

export default router;
