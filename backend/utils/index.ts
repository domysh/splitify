import { BoardPermission, Role } from "../models/types";
import { prisma } from './prisma';

export const voidReturn = (func: any): any => func;

export const randomHex = (len: number) => {
    return Array.from({length: len},() => Math.floor(Math.random() * 16).toString(16)).join('')
}

type BoardAuthType = [any, BoardPermission]|null[]

export const permissionLevels: Record<BoardPermission, number> = {
    [BoardPermission.OWNER]: 3,
    [BoardPermission.EDITOR]: 2,
    [BoardPermission.VIEWER]: 1
};

export const getAuthenticatedBoard = async (boardId: string, userId?: string, permRequired?:BoardPermission): Promise<BoardAuthType>  => {
    const authentication = userId ? (await prisma.boardAccess.findFirst({ where: { boardId, userId } }))?.permission as BoardPermission : undefined;
    const authBoard = await prisma.board.findUnique({ where: { id: boardId } });
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
    if (!authBoard) {
        return [null, null]
    }
    if (user && user.role === Role.ADMIN){
        return [authBoard, BoardPermission.OWNER]
    }
    if (authBoard.creatorId === userId) {
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
