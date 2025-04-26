import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Env from '../models/Env';
import { AuthRequest, JwtPayload, User as UserType } from '../models/types';
import crypto from 'crypto';
import { Document } from 'mongoose';
import { JWT_ALGORITHM } from '../config';
import { jwtValidator } from '../middleware/validation';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

let APP_SECRET_CACHE: string | null = null;

export const getAppSecret = async (): Promise<string> => {
  if (APP_SECRET_CACHE) {
    return APP_SECRET_CACHE;
  }
  
  const secretDoc = await Env.findOne({ key: 'APP_SECRET' });
  
  if (secretDoc) {
    APP_SECRET_CACHE = secretDoc.value;
    return secretDoc.value;
  }
  
  const newSecret = crypto.randomBytes(32).toString('hex');
  
  const newSecretDoc = new Env({
    key: 'APP_SECRET',
    value: newSecret
  });
  
  await newSecretDoc.save();
  APP_SECRET_CACHE = newSecret;
  return newSecret;
};

export const TOKEN_DURATION = {
  SHORT: 60 * 60 * 3, // 3 ore in secondi
  LONG: 60 * 60 * 24 * 365 // 1 anno in secondi
};

export const generateSessionId = (): string => {
  return crypto.randomBytes(8).toString('hex');
};

export const createAccessToken = async (userId: string, duration: number = TOKEN_DURATION.SHORT, sessionId?: string): Promise<string> => {
  const secret = await getAppSecret();
  
  const newSessionId = sessionId || generateSessionId();
  
  const createdAt = Math.floor(Date.now() / 1000);
  const expirationTime = createdAt + duration;
  
  const user = await User.findById(userId);
  if (user) {
    user.sessions = user.sessions.filter(s => s.sessionId !== newSessionId);
    
    user.sessions.push({
      sessionId: newSessionId,
      createdAt: new Date(createdAt * 1000),
      expiresAt: new Date(expirationTime * 1000),
      lastUsed: new Date(createdAt * 1000)
    });
    
    user.sessions.sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
    
    if (user.sessions.length > 10) {
      user.sessions = user.sessions.slice(0, 10);
    }
    
    await user.save();
  }
  
  const finalPayload = {
    sub: userId,
    sid: newSessionId,
    iat: createdAt,
    exp: expirationTime
  } as JwtPayload;

  return jwt.sign(finalPayload, secret);
};

export const canRefreshToken = (payload: JwtPayload): boolean => {  
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = payload.exp - now;
  const tokenDuration = payload.exp - payload.iat
  console.log('Token duration:', tokenDuration, 'Time left:', timeLeft, 'Can refresh:', timeLeft > 0 && timeLeft < (tokenDuration * 0.2));
  return timeLeft > 0 && timeLeft < (tokenDuration * 0.2);
};

export interface CheckLoginResponse {
  user?: UserType & Document;
  token?: JwtPayload;
}

export const verifyToken = async (token: string): Promise<CheckLoginResponse | null> => {
  try {
    const secret = await getAppSecret();
    const decoded = jwtValidator(jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
      ignoreExpiration: false,
    }));
    
    const user = await User.findById(decoded.sub);
    const session = user?.sessions.find(s => s.sessionId === decoded.sid);
    
    if (!session || !user) return null;
    
    session.lastUsed = new Date();
    await user?.save();
    
    return {
      user,
      token: decoded
    };
  } catch (error) {
    return null;
  }
};

export const checkLogin = async (req: AuthRequest|string|undefined): Promise<CheckLoginResponse> => {
  if (!req) return {};
  const token = (typeof req === 'string')? req : req.headers.authorization?.split(' ')[1];
  if (!token) return {};
  try {
    const payload = await verifyToken(token);
    if (!payload) return {};    
    return payload
  } catch (error) {
    return {};
  }
};

