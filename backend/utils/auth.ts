import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Env from '../models/Env';
import { AuthRequest, JwtPayload, User as UserType } from '../models/types';
import crypto from 'crypto';
import { Document } from 'mongoose';
import { JWT_ALGORITHM } from '../config';
import { jwtValidator } from '../middleware/validation';
import { UAParser } from 'ua-parser-js';

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

export const createAccessToken = async (userId: string, duration: number = TOKEN_DURATION.SHORT, sessionId?: string, userAgent?: string, ipAddress?: string): Promise<string> => {
  const secret = await getAppSecret();

  const newSessionId = sessionId || generateSessionId();

  const createdAt = Math.floor(Date.now() / 1000);
  const expirationTime = createdAt + duration;

  const user = await User.findById(userId);
  if (user) {
    const now = new Date();
    user.sessions = user.sessions.filter(s => s.sessionId !== newSessionId && s.expiresAt > now);

    let os = 'Sconosciuto';
    let browser = 'Sconosciuto';
    let device = 'Desktop';
    let location = 'Sconosciuto';

    if (userAgent) {
      const parser = new UAParser(userAgent);
      const parsedOS = parser.getOS();
      const parsedBrowser = parser.getBrowser();
      const parsedDevice = parser.getDevice();

      if (parsedOS.name) os = `${parsedOS.name} ${parsedOS.version || ''}`.trim();
      if (parsedBrowser.name) browser = `${parsedBrowser.name} ${parsedBrowser.version || ''}`.trim();
      if (parsedDevice.type) device = parsedDevice.type;
    }

    if (ipAddress && ipAddress !== '127.0.0.1' && ipAddress !== '::1') {
      try {
        const response = await fetch(`http://ip-api.com/json/${ipAddress}`);
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success') {
            location = `${data.city}, ${data.country}`;
          }
        }
      } catch (err) {
        console.error('Error fetching IP location:', err);
      }
    }

    user.sessions.push({
      sessionId: newSessionId,
      createdAt: new Date(createdAt * 1000),
      expiresAt: new Date(expirationTime * 1000),
      lastUsed: new Date(createdAt * 1000),
      os,
      browser,
      device,
      ip: ipAddress || 'Sconosciuto',
      location
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

export const verifyToken = async (token: string, currentIp?: string): Promise<CheckLoginResponse | null> => {
  try {
    const secret = await getAppSecret();
    const decoded = jwtValidator(jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
      ignoreExpiration: false,
    }));

    const user = await User.findById(decoded.sub);
    
    if (user) {
        const now = new Date();
        user.sessions = user.sessions.filter(s => s.expiresAt > now);
    }

    const session = user?.sessions.find(s => s.sessionId === decoded.sid);

    if (!session || !user) return null;

    session.lastUsed = new Date();

    if (currentIp && session.ip !== currentIp && currentIp !== 'Sconosciuto') {
        session.ip = currentIp;
        
        if (currentIp !== '127.0.0.1' && currentIp !== '::1') {
            fetch(`http://ip-api.com/json/${currentIp}`)
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        const newLocation = `${data.city}, ${data.country}`;
                        if (session.location !== newLocation) {
                            User.updateOne(
                                { _id: user._id, "sessions.sessionId": session.sessionId },
                                { $set: { "sessions.$.location": newLocation } }
                            ).catch(err => console.error("Error updating location in background:", err));
                        }
                    }
                })
                .catch(err => console.error("Error fetching updated IP location:", err));
        } else {
            session.location = 'Sconosciuto';
        }
    }

    await user?.save();

    return {
      user,
      token: decoded
    };
  } catch (error) {
    return null;
  }
};

export const checkLogin = async (req: AuthRequest | string | undefined): Promise<CheckLoginResponse> => {
  if (!req) return {};
  const token = (typeof req === 'string') ? req : req.headers.authorization?.split(' ')[1];
  const ip = (typeof req === 'string') ? undefined : req.ip;
  if (!token) return {};
  try {
    const payload = await verifyToken(token, ip);
    if (!payload) return {};
    return payload
  } catch (error) {
    return {};
  }
};


export const createChallengeToken = async (challenge: string): Promise<string> => {
  const secret = await getAppSecret();
  return jwt.sign({ challenge }, secret, { expiresIn: '5m' });
};

export const verifyChallengeToken = async (token: string): Promise<string | null> => {
  try {
    const secret = await getAppSecret();
    const decoded = jwt.verify(token, secret) as { challenge: string };
    return decoded.challenge;
  } catch (error) {
    return null;
  }
};
