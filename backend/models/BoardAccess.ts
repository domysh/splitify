import mongoose, { Schema, Document } from "mongoose";
import { BoardAccess as BoardAccessType, BoardPermission } from "./types";
import { defaultOption, setAggregateDefaultOperations } from "../config";

const BoardAccessSchema: Schema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
        boardId: { type: Schema.Types.ObjectId, required: true, ref: "Board" },
        permission: {
            type: String,
            enum: Object.values(BoardPermission),
            default: BoardPermission.VIEWER,
            required: true,
        },
    },
    defaultOption,
);

BoardAccessSchema.index({ userId: 1, boardId: 1 }, { unique: true });
setAggregateDefaultOperations(BoardAccessSchema);

export default mongoose.model<BoardAccessType & Document>(
    "BoardAccess",
    BoardAccessSchema,
);
