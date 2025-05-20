import mongoose, { Schema } from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const DEBUG =
    process.env.DEBUG?.toLowerCase() === "true" || process.env.DEBUG === "1";
export const CORS_ALLOW =
    process.env.CORS_ALLOW?.toLowerCase() === "true" ||
    process.env.CORS_ALLOW === "1";
export const MONGO_URL =
    process.env.MONGO_URL ||
    (DEBUG
        ? "mongodb://localhost:27017/splitify"
        : "mongodb://mongo:27017/splitify");
export const DEFAULT_PSW = process.env.DEFAULT_PSW;
export const JWT_ALGORITHM = "HS256";

export const defaultOption: mongoose.SchemaOptions = {
    toJSON: {
        transform: (doc, obj) => {
            delete obj.__v;
            if (doc._id) {
                obj.id = doc._id.toString();
                delete obj._id;
            }
            return obj;
        },
    },
};
export const setAggregateDefaultOperations = (s: Schema) => {
    s.pre("aggregate", function (this: mongoose.Aggregate<any>, next) {
        this.pipeline().push(
            { $addFields: { id: { $toString: "$_id" } } },
            { $project: { _id: 0, __v: 0 } },
        );
        next();
    });
};
