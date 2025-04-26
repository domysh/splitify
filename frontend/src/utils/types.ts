


export enum Role {
    ADMIN = 'admin',
    GUEST = 'guest'
}

export interface UserSession {
    sessionId: string;
    createdAt: Date;
    expiresAt: Date;
    lastUsed: Date;
}

export interface user {
    id: string;
    username: string;
    role: string;
    lastAccess?: string;
    sessions?: UserSession[];
}

export enum RegistrationMode {
    PUBLIC = 'public',
    PRIVATE = 'private',
    TOKEN = 'token'
  }
  

export interface RegistrationInfo {
    mode: RegistrationMode;
    token?: string;
}

export interface member {
    id: string;
    name: string;
    paid: number;
    categories: string[];
}

export interface product {
    id: string;
    name: string;
    price: number;
    categories: string[];
    memberId?: string; 
}

export interface category {
    id: string;
    name: string;
    order: number;
}

export interface transaction {
    id: string;
    fromMemberId: string | null;
    toMemberId: string | null;
    amount: number;
    description: string;
    timestamp: string;
    productId?: string;
}

export interface BoardBasicInfo {
    id: string;
    name: string;
    isPublic: boolean;
    permission?: BoardPermission;
    creator: boardCreator;
}

export interface GlobalStats {
    users: number;
    boards: number;
    transactions: number;
}

export enum BoardPermission {
    OWNER = "owner",
    EDITOR = "editor",
    VIEWER = "viewer"
}

export interface boardAccess {
    id: string;
    userId: string;
    username: string;
    permission: BoardPermission;
}

export interface boardCreator {
    id: string;
    username: string;
}

export interface board extends BoardBasicInfo {
    members: member[];
    products: product[];
    categories: category[];
}

export interface boardListing extends BoardBasicInfo {
    categories: category[];
    stats: {
        productsCount: number;
        categoriesCount: number;
        membersCount: number;
    };
}

export interface payment {
    from: string;
    to: string;
    price: number;
}

export interface paymentList {
    status: "ok" | "empty" | "unbalanced" | "uncompleted" | "loading";
    balance?: number;
    what?: "no-board" | "no-members" | "phantom-category";
    payments: payment[];
}

export interface userDebit {
    id: string;
    price: number;
}

export interface searchUser {
    id: string;
    username: string;
}

export interface JwtPayload {
    sub: string;
    sid: string;
    exp: number;
    iat: number;
  }