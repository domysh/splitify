import { Response } from "express";
import { prisma } from "../../utils/prisma";
import { emitBoardUpdate } from "../../utils/socket";
import { AddProduct, AuthRequest, BoardPermission } from "../../models/types";
import { createTransactionHelper } from "../transaction";
import { getAuthenticatedBoard } from "../../utils";

export const getBoardProducts = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const userId = req.user?.id;
        const [board, perm] = await getAuthenticatedBoard(
            id,
            userId,
            BoardPermission.VIEWER,
        );
        if (!board || !perm) {
            return res.status(404).json({ message: "Board not found" });
        }

        const products = await prisma.product.findMany({
            where: { boardId: id },
            include: { categories: true }
        });

        const formattedProducts = products.map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            categories: product.categories.map(c => c.categoryId),
        }));

        res.json(formattedProducts);
    } catch (err) {
        res.status(400).json({ message: "Failed to fetch products" });
    }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const productData: AddProduct = req.body;

        const userId = req.user?.id;
        const [board, perm] = await getAuthenticatedBoard(
            id,
            userId,
            BoardPermission.EDITOR,
        );
        if (!board || !perm) {
            return res.status(404).json({ message: "Board not found" });
        }

        const memberId = productData.memberId || null;

        const newProduct = await prisma.product.create({
            data: {
                boardId: id,
                name: productData.name,
                price: productData.price || 0,
                categories: {
                    create: productData.categories?.map(categoryId => ({
                        categoryId
                    })) || []
                }
            }
        });

        const productId = newProduct.id;

        if (memberId) {
            const member = await prisma.member.findFirst({
                where: { id: memberId, boardId: id }
            });

            if (member) {
                await createTransactionHelper(
                    id,
                    memberId,
                    null,
                    productData.price || 0,
                    `${member.name} ha pagato per ${productData.name}`,
                    productId,
                );
            }
        }

        emitBoardUpdate(id, ["products"]);
        res.status(201).json({ id: productId });
    } catch (err) {
        console.error("Error creating product:", err);
        res.status(400).json({ message: "Failed to create product" });
    }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
    try {
        const { id, product_id } = req.params;
        const productData: AddProduct = req.body;
        const { updateOnly } = req.query;
        const updateOnlyFlag = updateOnly === "true";
        let transactionUpdated = false;
        const userId = req.user?.id;
        const [board, perm] = await getAuthenticatedBoard(
            id,
            userId,
            BoardPermission.EDITOR,
        );
        if (!board || !perm) {
            return res.status(404).json({ message: "Board not found" });
        }

        const currentProduct = await prisma.product.findFirst({
            where: { id: product_id, boardId: id }
        });

        if (!currentProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        const memberId = req.body.memberId;

        if (!updateOnlyFlag) {
            const transactions = await prisma.transaction.findMany({
                where: { productId: product_id, boardId: id }
            });

            if (transactions.length === 1) {
                const transaction = transactions[0];
                let priceChanged = productData.price !== undefined && productData.price !== currentProduct.price;
                let payerChanged = memberId !== undefined && transaction.fromMemberId !== memberId;
                
                if (priceChanged || payerChanged) {
                    const newPrice = priceChanged ? (productData.price || 0) : transaction.amount;
                    const oldPrice = transaction.amount;
                    
                    const oldPayer = transaction.fromMemberId;
                    const newPayer = payerChanged ? memberId : transaction.fromMemberId;
                    
                    if (oldPayer) {
                        await prisma.member.update({
                            where: { id: oldPayer },
                            data: { paid: { decrement: oldPrice } }
                        });
                    }
                    if (newPayer) {
                        await prisma.member.update({
                            where: { id: newPayer },
                            data: { paid: { increment: newPrice } }
                        });
                    }
                    
                    await prisma.transaction.update({
                        where: { id: transaction.id },
                        data: { amount: newPrice, fromMemberId: newPayer }
                    });
                    
                    transactionUpdated = true;
                }
            }
        }

        await prisma.categoryToProduct.deleteMany({
            where: { productId: product_id }
        });

        const updatedProduct = await prisma.product.update({
            where: { id: product_id },
            data: {
                name: productData.name,
                price: productData.price,
                categories: {
                    create: productData.categories?.map(categoryId => ({
                        categoryId
                    })) || []
                }
            }
        });

        if (!updatedProduct) {
            res.status(400).json({ message: "Board or product not found" });
            return;
        }
        
        if (transactionUpdated) {
            emitBoardUpdate(id, ["transactions", "members"]);
        } else {
            emitBoardUpdate(id, ["products"]);
        }
        res.json({ id: product_id });
    } catch (err) {
        console.error("Error updating product:", err);
        res.status(400).json({ message: "Failed to update product" });
    }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
    try {
        const { id, product_id } = req.params;
        const { deleteOnly } = req.query;
        const deleteOnlyFlag = deleteOnly === "true";

        const userId = req.user?.id;
        const [board, perm] = await getAuthenticatedBoard(
            id,
            userId,
            BoardPermission.EDITOR,
        );
        if (!board || !perm) {
            return res.status(404).json({ message: "Board not found" });
        }

        if (!deleteOnlyFlag) {
            const transactions = await prisma.transaction.findMany({
                where: { productId: product_id, boardId: id }
            });

            for (const transaction of transactions) {
                if (transaction.fromMemberId) {
                    await prisma.member.update({
                        where: { id: transaction.fromMemberId },
                        data: { paid: { decrement: transaction.amount } }
                    });
                }

                if (transaction.toMemberId) {
                    await prisma.member.update({
                        where: { id: transaction.toMemberId },
                        data: { paid: { increment: transaction.amount } }
                    });
                }

                await prisma.transaction.update({
                    where: { id: transaction.id },
                    data: { productId: null, cancelled: true }
                });
            }
        }

        await prisma.product.delete({
            where: { id: product_id }
        });

        if (!deleteOnlyFlag) {
            emitBoardUpdate(id, ["members", "transactions"]);
        } else {
            emitBoardUpdate(id, ["products"]);
        }
        res.json({ id: product_id });
    } catch (err) {
        res.status(400).json({ message: "Failed to delete product" });
    }
};
