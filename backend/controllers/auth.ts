import { Response } from 'express';
import User from '../models/User';
import { createAccessToken, hashPassword, verifyPassword } from '../utils/auth';
import { AuthRequest, LoginRequest, RegistrationRequest, Role, SetRegistrationMode } from '../models/types';
import { generateRandomObjectId } from '../utils';
import { broadCastUpdate, emitAdminUpdate } from '../utils/socket';
import Env from '../models/Env';
import crypto from 'crypto';
import { randomSleep } from '../utils';
import { TOKEN_DURATION, canRefreshToken, createChallengeToken, verifyChallengeToken } from '../utils/auth';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import { RP_ID, RP_NAME, RP_ORIGIN } from '../config';
import { PasskeyCredential } from '../models/types';

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

  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip || req.socket.remoteAddress;

  const token = await createAccessToken(user._id.toString(), tokenDuration, undefined, userAgent, ipAddress);

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

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    // Create a new token with the same duration and sessionId
    const newToken = await createAccessToken(token.sub, originalDuration, token.sid, userAgent, ipAddress);

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

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    const tokenDuration = keepLogin ? TOKEN_DURATION.LONG : TOKEN_DURATION.SHORT;
    const newLoginToken = await createAccessToken(user._id.toString(), tokenDuration, undefined, userAgent, ipAddress);

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
    sessions: user.sessions,
    pinnedBoards: user.pinnedBoards,
    boardUsage: user.boardUsage,
    passkeys: user.passkeys,
    currentSessionId: req.token?.sid,
    passkeyPromptDismissed: user.passkeyPromptDismissed
  });
};

export const passkeyRegisterStart = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const { password } = req.body;
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!password) {
    return res.status(400).json({ message: 'Password richiesta' });
  }

  const isMatch = await verifyPassword(password, user.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Password errata' });
  }

  const userPasskeys: PasskeyCredential[] = user.passkeys || [];

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: isoUint8Array.fromUTF8String(user._id!.toString()),
    userName: user.username,
    excludeCredentials: userPasskeys.map((passkey) => ({
      id: passkey.id,
      transports: passkey.transports,
    })),
    authenticatorSelection: {
      userVerification: 'preferred',
      residentKey: 'preferred',
    },
  });

  const token = await createChallengeToken(options.challenge);
  return res.json({ options, token });
};

export const passkeyRegisterVerify = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { response, token, name } = req.body;

  const expectedChallenge = await verifyChallengeToken(token);
  if (!expectedChallenge) {
    return res.status(400).json({ message: 'Invalid or expired challenge' });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(400).json({ message: error.message });
  }

  if (verification.verified && verification.registrationInfo) {
    const { credential } = verification.registrationInfo;

    const newPasskey: PasskeyCredential = {
      id: credential.id,
      name: name || `Passkey ${new Date().toLocaleDateString()}`,
      createdAt: new Date(),
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports,
    };

    if (!user.passkeys) user.passkeys = [];
    user.passkeys.push(newPasskey);
    await user.save();

    return res.json({ verified: true });
  }

  return res.status(400).json({ verified: false, message: 'Verification failed' });
};

export const passkeyLoginStart = async (req: AuthRequest, res: Response) => {
  // Try to find user if username is provided (for non-discoverable auth)
  let userPasskeys: PasskeyCredential[] = [];

  if (req.body.username) {
    const user = await User.findOne({ username: req.body.username.toLowerCase() });
    if (user && user.passkeys) {
      userPasskeys = user.passkeys;
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: userPasskeys.map((passkey) => ({
      id: passkey.id,
      transports: passkey.transports,
    })),
    userVerification: 'preferred',
  });

  const token = await createChallengeToken(options.challenge);
  return res.json({ options, token });
};

export const passkeyLoginVerify = async (req: AuthRequest, res: Response) => {
  const { response, token } = req.body;

  const expectedChallenge = await verifyChallengeToken(token);
  if (!expectedChallenge) {
    return res.status(400).json({ message: 'Invalid or expired challenge' });
  }

  // Find user by credential ID
  const credentialId = response.id;
  const user = await User.findOne({ 'passkeys.id': credentialId });

  if (!user) {
    return res.status(400).json({ message: 'User not found for this passkey' });
  }

  const passkey = user.passkeys?.find((pk) => pk.id === credentialId);
  if (!passkey) {
    return res.status(400).json({ message: 'Passkey not found in user profile' });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: passkey.id,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
        transports: passkey.transports,
      },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(400).json({ message: error.message });
  }

  if (verification.verified) {
    // Update counter
    passkey.counter = verification.authenticationInfo.newCounter;
    await user.save();

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    // Login success - issue token
    const tokenDuration = req.body.keepLogin ? TOKEN_DURATION.LONG : TOKEN_DURATION.SHORT;
    const loginToken = await createAccessToken(user._id!.toString(), tokenDuration, undefined, userAgent, ipAddress);

    return res.json({
      verified: true,
      access_token: loginToken,
      token_type: 'bearer',
      expires_in: tokenDuration,
      user_id: user._id
    });
  }

  return res.status(400).json({ verified: false, message: 'Verification failed' });
};

export const deleteSession = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const sessionId = req.params.sessionId;

  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (sessionId === req.token?.sid) {
    return res.status(400).json({ message: 'Non puoi disconnettere la sessione attuale' });
  }

  const initialLength = user.sessions?.length || 0;
  user.sessions = (user.sessions || []).filter((s: any) => s.sessionId !== sessionId);

  if (user.sessions.length === initialLength) {
    return res.status(404).json({ message: 'Session not found' });
  }

  user.markModified('sessions');
  await user.save();
  return res.json({ message: 'Session deleted successfully' });
};

export const deletePasskey = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const passkeyId = req.params.id;

  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const initialLength = user.passkeys?.length || 0;
  user.passkeys = user.passkeys?.filter(pk => pk.id !== passkeyId) || [];

  if (user.passkeys.length === initialLength) {
    return res.status(404).json({ message: 'Passkey not found' });
  }

  await user.save();
  return res.json({ message: 'Passkey deleted successfully' });
};

export const renamePasskey = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const passkeyId = req.params.id;
  const { name } = req.body;

  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const passkey = user.passkeys?.find(pk => pk.id === passkeyId);
  if (!passkey) {
    return res.status(404).json({ message: 'Passkey not found' });
  }

  passkey.name = name;
  user.markModified('passkeys');
  await user.save();

  return res.json({ message: 'Passkey renamed successfully' });
};

export const deleteCurrentSession = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const sessionId = req.token?.sid;

  if (!user || !sessionId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  user.sessions = (user.sessions || []).filter((s: any) => s.sessionId !== sessionId);
  user.markModified('sessions');
  await user.save();

  return res.json({ success: true });
};
