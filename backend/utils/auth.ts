import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { JWT_ALGORITHM } from '../config';
import { jwtValidator } from '../middleware/validation';
import { UAParser } from 'ua-parser-js';
import crypto from 'crypto';
import { AuthRequest, JwtPayload } from '../models/types';

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

  const secretDoc = await prisma.env.findUnique({ where: { key: 'APP_SECRET' } });

  if (secretDoc) {
    APP_SECRET_CACHE = secretDoc.value;
    return secretDoc.value;
  }

  const newSecret = crypto.randomBytes(32).toString('hex');

  const createdSecret = await prisma.env.upsert({
    where: { key: 'APP_SECRET' },
    update: {},
    create: {
      key: 'APP_SECRET',
      value: newSecret
    }
  });

  APP_SECRET_CACHE = createdSecret.value;
  return createdSecret.value;
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

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { sessions: true } });
  if (user) {
    const now = new Date();
    
    // Clean up expired sessions in DB
    await prisma.userSession.deleteMany({
      where: { userId, expiresAt: { lte: now } }
    });

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

    await prisma.userSession.create({
      data: {
        sessionId: newSessionId,
        createdAt: new Date(createdAt * 1000),
        expiresAt: new Date(expirationTime * 1000),
        lastUsed: new Date(createdAt * 1000),
        os,
        browser,
        device,
        ip: ipAddress || 'Sconosciuto',
        location,
        userId
      }
    });

    const activeSessions = await prisma.userSession.findMany({
      where: { userId },
      orderBy: { lastUsed: 'desc' }
    });

    if (activeSessions.length > 10) {
      const toDelete = activeSessions.slice(10).map((s: any) => s.id);
      await prisma.userSession.deleteMany({
        where: { id: { in: toDelete } }
      });
    }
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
  user?: any;
  token?: JwtPayload;
}

export const verifyToken = async (token: string, currentIp?: string): Promise<CheckLoginResponse | null> => {
  try {
    const secret = await getAppSecret();
    const decoded = jwtValidator(jwt.verify(token, secret, {
      algorithms: [JWT_ALGORITHM],
      ignoreExpiration: false,
    }));

    const user = await prisma.user.findUnique({ where: { id: decoded.sub }, include: { sessions: true } });
    
    if (user) {
        const now = new Date();
        await prisma.userSession.deleteMany({
          where: { userId: user.id, expiresAt: { lte: now } }
        });
        user.sessions = user.sessions.filter((s: any) => s.expiresAt > now);
    }

    const session = user?.sessions.find((s: any) => s.sessionId === decoded.sid);

    if (!session || !user) return null;

    await prisma.userSession.update({
      where: { id: session.id },
      data: { lastUsed: new Date() }
    });

    if (currentIp && session.ip !== currentIp && currentIp !== 'Sconosciuto') {
        await prisma.userSession.update({
          where: { id: session.id },
          data: { ip: currentIp }
        });
        session.ip = currentIp;
        
        if (currentIp !== '127.0.0.1' && currentIp !== '::1') {
            fetch(`http://ip-api.com/json/${currentIp}`)
                .then(res => res.json())
                .then(data => {
                    if (data.status === 'success') {
                        const newLocation = `${data.city}, ${data.country}`;
                        if (session.location !== newLocation) {
                            prisma.userSession.update({
                                where: { id: session.id },
                                data: { location: newLocation }
                            }).catch((err: any) => console.error("Error updating location in background:", err));
                        }
                    }
                })
                .catch((err: any) => console.error("Error fetching updated IP location:", err));
        } else {
            await prisma.userSession.update({
              where: { id: session.id },
              data: { location: 'Sconosciuto' }
            });
            session.location = 'Sconosciuto';
        }
    }

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
