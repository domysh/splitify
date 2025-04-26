import { Response } from 'express';
import User from '../models/User';
import { createAccessToken, hashPassword, verifyPassword } from '../utils/auth';
import { AuthRequest, LoginRequest, RegistrationRequest, Role, SetRegistrationMode } from '../models/types';
import { generateRandomObjectId } from '../utils';
import { broadCastUpdate, emitAdminUpdate } from '../utils/socket';
import Env from '../models/Env';
import crypto from 'crypto';
import { randomSleep } from '../utils';
import { TOKEN_DURATION, canRefreshToken } from '../utils/auth';

export const login = async (req: AuthRequest, res: Response) => {
  const { username, password, keepLogin }: LoginRequest = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Cannot insert an empty value!' });
  }

  await randomSleep();
  const user = await User.findOne({ username: username.toLowerCase() });
  if (!user) {
    return res.status(406).json({ message: 'User not found!' });
  }
  
  const validPassword = await verifyPassword(password, user.password);
  if (!validPassword) {
    return res.status(406).json({ message: 'Wrong password!' });
  }

  // Determine token duration based on keepLogin option
  const tokenDuration = keepLogin ? TOKEN_DURATION.LONG : TOKEN_DURATION.SHORT;
  
  const token = await createAccessToken(user._id.toString(), tokenDuration);
  
  return res.json({
    access_token: token,
    token_type: 'bearer',
    expires_in: tokenDuration
  });
};

export const refreshToken = async (req: AuthRequest, res: Response) => {
  try {

    const token = req.token
    const user = req.user;
    
    if (!token || !user) {
      return res.status(400).json({ message: 'Token is required' });
    }

    if (!canRefreshToken(token)) {
      return res.status(400).json({ 
        message: 'Token cannot be refreshed at this time',
      });
    }
    
    const session = user.sessions.find(s => s.sessionId === token.sid);
    
    if (!session) {
      return res.status(400).json({ message: 'Session not found' });
    }
    
    const originalDuration = token.exp - token.iat
    
    // Create a new token with the same duration and sessionId
    const newToken = await createAccessToken(token.sub, originalDuration, token.sid);
    
    return res.json({
      access_token: newToken,
      token_type: 'bearer',
      expires_in: originalDuration
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return res.status(500).json({ message: 'Failed to refresh token' });
  }
};

export enum RegistrationMode {
  PUBLIC = 'public',
  PRIVATE = 'private',
  TOKEN = 'token'
}

export const getRegistrationMode = async () => {
  const registerMode = await Env.findOne({ key: 'REGISTRATION_MODE' });
  if (!registerMode || !Object.values(RegistrationMode).map(v => v as string).includes(registerMode.value)) { 
    return RegistrationMode.PRIVATE;
  }
  return registerMode.value as RegistrationMode;
};

export const getRegistrationToken = async (): Promise<string> => {  
  const secretDoc = await Env.findOne({ key: 'REGISTRATION_TOKEN' });
  if (secretDoc) {
    return secretDoc.value;
  }
  
  const newSecret = crypto.randomBytes(32).toString('hex');
  
  const newSecretDoc = new Env({
    key: 'REGISTRATION_TOKEN',
    value: newSecret
  });

  await newSecretDoc.save();
  return newSecret;
};

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, token, keepLogin }: RegistrationRequest = req.body;   
    const lowercaseUsername = (username as string).toLowerCase();
    const registrationMode = await getRegistrationMode();

    if (RegistrationMode.PRIVATE === registrationMode) {
      return res.status(403).json({ message: 'Registration is closed' });
    }
    if (RegistrationMode.TOKEN === registrationMode) {
      const tokenDoc = await getRegistrationToken();
      if (tokenDoc !== token) {
        return res.status(403).json({ message: 'Invalid registration token' });
      }
    }

    if (lowercaseUsername === 'admin') {
      return res.status(400).json({ message: "'admin' is reserved" });
    }

    const existingUser = await User.findOne({ username: lowercaseUsername });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    const hashedPassword = await hashPassword(password);
    const user = new User({
      _id: generateRandomObjectId(),
      username: lowercaseUsername,
      password: hashedPassword,
      role: Role.GUEST
    });
    
    await user.save();
    emitAdminUpdate(['users']);

    const tokenDuration = keepLogin ? TOKEN_DURATION.LONG : TOKEN_DURATION.SHORT;
    const newLoginToken = await createAccessToken(user._id.toString(), tokenDuration);

    return res.status(201).json({ 
      id: user._id.toString(), 
      access_token: newLoginToken, 
      token_type: 'bearer',
      expires_in: tokenDuration
    });
  } catch (err) {
    return res.status(400).json({ message: 'Failed to create user' });
  }
};

export const registrationInfo = async (req: AuthRequest, res: Response) => {
  const registrationMode = await getRegistrationMode();
  const result = {
    mode: registrationMode,
    token: undefined as string | undefined
  }
  if (req.user?.role === Role.ADMIN) {
    result.token = await getRegistrationToken();;
  }
  res.json(result);
};

export const setRegistrationInfo = async (req: AuthRequest, res: Response) => {
  const { mode, token }: SetRegistrationMode = req.body;
  
  let modeDoc = await Env.findOne({ key: 'REGISTRATION_MODE' });
  if (modeDoc) {
    modeDoc.value = mode;
    await modeDoc.save();
  } else {
    modeDoc = new Env({
      key: 'REGISTRATION_MODE',
      value: mode
    });
    await modeDoc.save();
  }

  
  if (mode === RegistrationMode.TOKEN && token) {
    let tokenDoc = await Env.findOne({ key: 'REGISTRATION_TOKEN' });
    if (tokenDoc) {
      tokenDoc.value = token;
      await tokenDoc.save();
    } else {
      tokenDoc = new Env({
        key: 'REGISTRATION_TOKEN',
        value: token
      });
      await tokenDoc.save();
    }
  }

  broadCastUpdate(['registration']);

  return res.json({
    mode: mode,
    token: mode === RegistrationMode.TOKEN ? await getRegistrationToken() : undefined
  });
}


export const getMe = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  
  if (!user) {
    res.status(401).json({ message: 'Not authenticated' });
    return;
  }
  
  res.json({
    id: user!._id?.toString(),
    username: user.username,
    role: user.role,
    sessions: user.sessions
  });
};
