import { Router } from "express";
import authRouter from "./auth";
import boardRouter from "./board";
import userRouter from "./user";
import transactionRouter from "./transaction";
import adminRouter from "./admin";
import { requestUserInfo } from "../middleware/auth";

const router = Router();
router.all(/.*/, requestUserInfo);
router.use("/", authRouter);
router.use("/boards", boardRouter);
router.use("/users", userRouter);
router.use("/transactions", transactionRouter);
router.use("/admin", adminRouter);

export default router;
