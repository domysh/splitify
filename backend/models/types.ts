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

export interface Category {
  _id?: ObjectId;
  id?: ObjectIdType;
  boardId: string | ObjectId;
  name: string;
  order: number;
}

export interface Product {
  _id?: ObjectId;
  id?: ObjectIdType;
  boardId: ObjectIdType | ObjectId;
  name: string;
  price: number;
  categories: ObjectIdType[];
}

export interface Member {
  _id?: ObjectId;
  id?: ObjectIdType;
  boardId: ObjectIdType | ObjectId;
  name: string;
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
  name: string;
  isPublic: boolean;
  creatorId: ObjectIdType | ObjectId;
}

export interface UserSession {
  sessionId: string;
  createdAt: Date;
  expiresAt: Date;
  lastUsed: Date;
}


export interface User {
  _id?: ObjectId;
  id?: ObjectIdType;
  username: UsernameType;
  password: string;
  role: Role;
  sessions: UserSession[];
}

export interface Env {
  _id?: ObjectId;
  key: string;
  value: string;
}

export interface IdResponse {
  id: ObjectIdType;
}

export interface AddBoardForm {
  name: string;
  isPublic?: boolean;
}

export interface AddUser {
  username: UsernameType;
  password: string;
  role: Role;
}

export interface UpdateUser {
  username?: UsernameType;
  password?: string;
  role?: Role;
}

export interface UpdateUsername {
  username: UsernameType;
}

export interface ChangePassword {
  oldPassword: string;
  newPassword: string;
}

export interface AddCategory {
  name: string;
  order?: number;
}

export interface AddProduct {
  name: string;
  price: number;
  categories: ObjectIdType[];
  memberId?: ObjectIdType | null;
}

export interface AddMember {
  name: string;
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
  description: string;
  productId?: ObjectIdType | ObjectId | null;
  timestamp: Date;
}

export interface AddTransaction {
  fromMemberId?: ObjectIdType | null;
  toMemberId?: ObjectIdType | null;
  amount: number;
  description: string;
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
  password: string;
  keepLogin?: boolean;
}

export interface RegistrationRequest {
  username: UsernameType;
  password: string;
  token?: string;
  keepLogin?: boolean;
}

export interface JwtPayload {
  sub: string;
  sid: string;
  exp: number;
  iat: number;
}

export interface SetRegistrationMode {
  mode: RegistrationMode;
  token?: string & tags.Pattern<"^[a-zA-Z0-9\\-\\_\\.]+$">;
}