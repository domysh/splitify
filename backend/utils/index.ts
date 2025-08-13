import Board from "../models/Board";
import BoardAccess from "../models/BoardAccess";
import { ObjectId } from "mongodb";
import { Board as BoardType, BoardPermission, Role } from "../models/types";
import { Document } from "mongoose";
import User from "../models/User";

export const voidReturn = (func: Function) => {
    return async (...args: any[]) => {await func(...args)}
}

export const randomHex = (len: number) => {
    return Array.from({length: len},() => Math.floor(Math.random() * 16).toString(16)).join('')
}

export const generateRandomObjectId = (): ObjectId => {
    return new ObjectId(randomHex(24));
};

type BoardAuthType = [Document & BoardType, BoardPermission]|null[]

export const permissionLevels: Record<BoardPermission, number> = {
    [BoardPermission.OWNER]: 3,
    [BoardPermission.EDITOR]: 2,
    [BoardPermission.VIEWER]: 1
};

export const getAuthenticatedBoard = async (boardId: string, userId?: string, permRequired?:BoardPermission): Promise<BoardAuthType>  => {
    const authentication = (await BoardAccess.findOne({ boardId, userId }).select('permission'))?.permission
    const authBoard = await Board.findOne({ _id: new ObjectId(boardId) })
    const user = userId?(await User.findById(userId)): null
    if (!authBoard) {
        return [null, null]
    }
    if (user && user.role === Role.ADMIN){
        return [authBoard, BoardPermission.OWNER]
    }
    if (authBoard.creatorId.toString() === userId) {
        if (permRequired && permissionLevels[BoardPermission.OWNER] < permissionLevels[permRequired]){
            return [null, null]
        }
        return [authBoard, BoardPermission.OWNER]
    }
    if (!authentication){
        if (authBoard.isPublic) {
            if (permRequired && permissionLevels[BoardPermission.VIEWER] < permissionLevels[permRequired]){
                return [null, null]
            }
            return [authBoard, BoardPermission.VIEWER]
        }
        return [null, null]
    }
    if (permRequired && permissionLevels[authentication] < permissionLevels[permRequired]){
        return [null, null]
    }
    return [authBoard, authentication]
}

export const sleep = (time:number) => {
  return new Promise(resolve => setTimeout(resolve, time));
}

export const randomSleep = async () => {
  await sleep((Math.random()*1000)%300);
}
