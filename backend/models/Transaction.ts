import mongoose, { Schema } from "mongoose";
import { defaultOption, setAggregateDefaultOperations } from "../config";

const TransactionSchema = new mongoose.Schema(
    {
        boardId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Board",
            required: true,
            index: true,
        },
        fromMemberId: {
            type: Schema.Types.ObjectId,
            default: null,
            ref: "Member",
        },
        toMemberId: {
            type: Schema.Types.ObjectId,
            default: null,
            ref: "Member",
        },
        amount: {
            type: Number,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        productId: {
            type: Schema.Types.ObjectId,
            default: null,
            ref: "Product",
        },
        timestamp: {
            type: Date,
            default: Date.now,
        },
        cancelled: {
            type: Boolean,
            default: false,
        },
    },
    defaultOption,
);

import { Transaction } from "./types";

setAggregateDefaultOperations(TransactionSchema);

export default mongoose.model<Transaction & mongoose.Document>("Transaction", TransactionSchema);
