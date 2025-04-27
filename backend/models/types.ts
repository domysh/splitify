import { Request } from 'express';
import { ObjectId } from 'mongodb';
import { RegistrationMode } from '../controllers/auth';
import { tags } from "typia";
import { Document } from 'mongoose';

export enum Role {
  ADMIN = "admin",
  GUEST = "guest"
}

export enum BoardPermission {
  OWNER = "owner",
  EDITOR = "editor",
  VIEWER = "viewer"
}

export enum UsableBoardPermission {
  EDITOR = "editor",
  VIEWER = "viewer",
}

type UsernameType = string & tags.Pattern<"^[a-zA-Z0-9\\-\\_\\.]{5,30}$">;
type ObjectIdType = string & tags.Pattern<"^[a-fA-F0-9]{24}$">;
type LimitString = string & tags.MaxLength<300>

export interface Category {
  _id?: ObjectId;
  id?: ObjectIdType;
  boardId: LimitString | ObjectId;
  name: LimitString;
  order: number;
}

export interface Product {
  _id?: ObjectId;
  id?: ObjectIdType;
  boardId: ObjectIdType | ObjectId;
  name: LimitString;
  price: number;
  categories: ObjectIdType[];
}

export interface Member {
  _id?: ObjectId;
  id?: ObjectIdType;
  boardId: ObjectIdType | ObjectId;
  name: LimitString;
  paid: number;
  categories: ObjectIdType[];
}

export interface BoardAccess {
  _id?: ObjectId;
  id?: ObjectIdType;
  userId: ObjectIdType | ObjectId;
  boardId: ObjectIdType | ObjectId;
  permission: BoardPermission;
}

export interface Board {
  _id?: ObjectId;
  id?: ObjectIdType;
  name: LimitString;
  isPublic: boolean;
  creatorId: ObjectIdType | ObjectId;
}

export interface UserSession {
  sessionId: LimitString;
  createdAt: Date;
  expiresAt: Date;
  lastUsed: Date;
}


export interface User {
  _id?: ObjectId;
  id?: ObjectIdType;
  username: UsernameType;
  password: LimitString;
  role: Role;
  sessions: UserSession[];
}

export interface Env {
  _id?: ObjectId;
  key: LimitString;
  value: LimitString;
}

export interface IdResponse {
  id: ObjectIdType;
}

export interface AddBoardForm {
  name: LimitString;
  isPublic?: boolean;
}

export interface AddUser {
  username: UsernameType;
  password: LimitString;
  role: Role;
}

export interface UpdateUser {
  username?: UsernameType;
  password?: LimitString;
  role?: Role;
}

export interface UpdateUsername {
  username: UsernameType;
}

export interface ChangePassword {
  oldPassword: LimitString;
  newPassword: LimitString;
}

export interface AddCategory {
  name: LimitString;
  order?: number;
}

export interface AddProduct {
  name: LimitString;
  price: number;
  categories: ObjectIdType[];
  memberId?: ObjectIdType | null;
}

export interface AddMember {
  name: LimitString;
  categories: ObjectIdType[];
  paid: number;
}

export interface Transaction {
  _id?: ObjectId;
  id?: ObjectIdType;
  boardId: ObjectIdType;
  fromMemberId: ObjectIdType | ObjectId | null;
  toMemberId: ObjectIdType | ObjectId | null;
  amount: number;
  description: LimitString;
  productId?: ObjectIdType | ObjectId | null;
  timestamp: Date;
}

export interface AddTransaction {
  fromMemberId?: ObjectIdType | null;
  toMemberId?: ObjectIdType | null;
  amount: number;
  description: LimitString;
  productId?: ObjectIdType | null;
}

export interface AddBoardAccess {
  userId: ObjectIdType;
  permission: UsableBoardPermission;
}

export interface UpdateBoardAccess {
  permission: UsableBoardPermission;
}

export interface TransferBoardOwnership {
  newOwnerId: ObjectIdType;
}



export interface AuthRequest extends Request {
  user?: User & Document,
  token?: JwtPayload;
}

export interface LoginRequest {
  username: UsernameType;
  password: LimitString;
  keepLogin?: boolean;
}

export interface RegistrationRequest {
  username: UsernameType;
  password: LimitString;
  token?: LimitString;
  keepLogin?: boolean;
}

export interface JwtPayload {
  sub: LimitString;
  sid: LimitString;
  exp: number;
  iat: number;
}

export interface SetRegistrationMode {
  mode: RegistrationMode;
  token?: LimitString & tags.Pattern<"^[a-zA-Z0-9\\-\\_\\.]+$">;
}