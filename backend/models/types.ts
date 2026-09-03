import { Request } from 'express';
import { RegistrationMode } from '../controllers/auth';
import { tags } from "typia";
import { User as PrismaUser } from '@prisma/client';

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
type LimitString = string & tags.MaxLength<300>
type EmailType = string & tags.Format<"email"> & tags.MaxLength<255>;

export interface Category {
  id?: string;
  boardId: string;
  name: LimitString;
  order: number;
}

export interface Product {
  id?: string;
  boardId: string;
  name: LimitString;
  price: number;
  categories: string[];
}

export interface Member {
  id?: string;
  boardId: string;
  name: LimitString;
  paid: number;
  categories: string[];
}

export interface BoardAccess {
  id?: string;
  userId: string;
  boardId: string;
  permission: BoardPermission;
}

export interface Board {
  id?: string;
  name: LimitString;
  isPublic: boolean;
  creatorId: string;
}

export interface UserSession {
  sessionId: LimitString;
  createdAt: Date;
  expiresAt: Date;
  lastUsed: Date;
  os?: LimitString;
  browser?: LimitString;
  device?: LimitString;
  ip?: LimitString;
  location?: LimitString;
}


export interface User {
  id?: string;
  email: EmailType;
  role: Role;
  sessions: UserSession[];
  passkeys?: PasskeyCredential[];
  pinnedBoards?: string[];
  boardUsage?: Record<string, number>;
  passkeyPromptDismissed?: boolean;
}

export interface PasskeyCredential {
  id: string; // Credential ID (base64url encoded)
  name?: LimitString;
  createdAt?: Date;
  publicKey: Uint8Array;
  counter: number;
  transports?: AuthenticatorTransportFuture[];
}

export type AuthenticatorTransportFuture = "ble" | "internal" | "nfc" | "usb" | "cable" | "hybrid" | "smart-card";

export interface Env {
  id?: string;
  key: LimitString;
  value: LimitString;
}

export interface IdResponse {
  id: string;
}

export interface AddBoardForm {
  name: LimitString;
  isPublic?: boolean;
}

export interface AddUser {
  email: EmailType;
  role: Role;
}

export interface UpdateUser {
  email?: EmailType;
  role?: Role;
}


export interface RequestEmailChange {
  email: EmailType;
}

export interface ConfirmEmailChange {
  code: string & tags.Pattern<"^[0-9]{6}$">;
}


export interface VerifyOtpRequest {
  email: EmailType;
  code: string & tags.Pattern<"^[0-9]{6}$">;
  keepLogin?: boolean;
  token?: LimitString; // For registration
}


export interface AddCategory {
  name: LimitString;
  order?: number;
}

export interface AddProduct {
  name: LimitString;
  price: number;
  categories: string[];
  memberId?: string | null;
}

export interface AddMember {
  name: LimitString;
  categories: string[];
  paid: number;
}

export interface Transaction {
  id?: string;
  boardId: string;
  fromMemberId: string | null;
  toMemberId: string | null;
  amount: number;
  description: LimitString;
  productId?: string | null;
  timestamp: Date;
  cancelled?: boolean;
}

export interface AddTransaction {
  fromMemberId?: string | null;
  toMemberId?: string | null;
  amount: number;
  description: LimitString;
  productId?: string | null;
}

export interface AddBoardAccess {
  email: EmailType;
  permission: UsableBoardPermission;
}

export interface UpdateBoardAccess {
  permission: UsableBoardPermission;
}

export interface TransferBoardOwnership {
  newOwnerId: string;
}



export interface AuthRequest extends Request {
  user?: any, // Full prisma user including relations
  token?: JwtPayload;
}

export interface LoginRequest {
  email: EmailType;
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