import { Router } from "express";
import { hasRole } from "../middleware/auth";
import {
    validateAddBoard,
    validateAddCategory,
    validateAddMember,
    validateAddProduct,
    validateAddBoardAccess,
    validateBoardTransfer,
    validateUpdateBoardAccess,
} from "../middleware/validation";
import { Role } from "../models/types";
import {
    createBoard,
    deleteBoard,
    getBoard,
    getBoards,
    updateBoard,
} from "../controllers/board/board";
import {
    createCategory,
    deleteCategory,
    getBoardCategories,
    updateCategory,
} from "../controllers/board/category";
import {
    createMember,
    deleteMember,
    getBoardMembers,
    updateMember,
} from "../controllers/board/member";
import {
    createProduct,
    deleteProduct,
    getBoardProducts,
    updateProduct,
} from "../controllers/board/product";
import {
    addBoardAccess,
    getBoardAccesses,
    removeBoardAccess,
    transferBoardOwnership,
    updateBoardAccess,
} from "../controllers/board/access";
import { voidReturn as r } from "../utils";

const router = Router();

router.get("/", hasRole(Role.GUEST), r(getBoards));
router.get("/:id", r(getBoard));
router.post("/", r(validateAddBoard), hasRole(Role.GUEST), r(createBoard));
router.put("/:id", r(validateAddBoard), hasRole(Role.GUEST), r(updateBoard));
router.delete("/:id", hasRole(Role.GUEST), r(deleteBoard));

router.get("/:id/access", r(getBoardAccesses));
router.post(
    "/:id/access",
    r(validateAddBoardAccess),
    hasRole(Role.GUEST),
    r(addBoardAccess),
);
router.put(
    "/:id/access/:userId",
    r(validateUpdateBoardAccess),
    hasRole(Role.GUEST),
    r(updateBoardAccess),
);
router.delete("/:id/access/:userId", hasRole(Role.GUEST), r(removeBoardAccess));
router.put(
    "/:id/transfer",
    r(validateBoardTransfer),
    hasRole(Role.GUEST),
    r(transferBoardOwnership),
);

router.get("/:id/categories", r(getBoardCategories));
router.post(
    "/:id/categories",
    r(validateAddCategory),
    hasRole(Role.GUEST),
    r(createCategory),
);
router.put(
    "/:id/categories/:category_id",
    r(validateAddCategory),
    hasRole(Role.GUEST),
    r(updateCategory),
);
router.delete(
    "/:id/categories/:category_id",
    hasRole(Role.GUEST),
    r(deleteCategory),
);

router.get("/:id/members", r(getBoardMembers));
router.post(
    "/:id/members",
    r(validateAddMember),
    hasRole(Role.GUEST),
    r(createMember),
);
router.put(
    "/:id/members/:member_id",
    r(validateAddMember),
    hasRole(Role.GUEST),
    r(updateMember),
);
router.delete("/:id/members/:member_id", hasRole(Role.GUEST), r(deleteMember));

router.get("/:id/products", r(getBoardProducts));
router.post(
    "/:id/products",
    r(validateAddProduct),
    hasRole(Role.GUEST),
    r(createProduct),
);
router.put(
    "/:id/products/:product_id",
    r(validateAddProduct),
    hasRole(Role.GUEST),
    r(updateProduct),
);
router.delete(
    "/:id/products/:product_id",
    hasRole(Role.GUEST),
    r(deleteProduct),
);

export default router;
