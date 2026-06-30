import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { createAccessToken, verifyPassword } from '../utils/auth';
import { AuthRequest, LoginRequest, Role, SetRegistrationMode, VerifyOtpRequest } from '../models/types';
import { broadCastUpdate, emitAdminUpdate } from '../utils/socket';
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
import { sendMail } from '../utils/mailer';

export enum RegistrationMode {
  PUBLIC = 'public',
  PRIVATE = 'private',
  TOKEN = 'token'
}

export const getRegistrationMode = async () => {
  const registerMode = await prisma.env.findFirst({ where: { key: 'REGISTRATION_MODE' } });
  if (!registerMode || !Object.values(RegistrationMode).map(v => v as string).includes(registerMode.value)) {
    return RegistrationMode.PRIVATE;
  }
  return registerMode.value as RegistrationMode;
};

export const getRegistrationToken = async (): Promise<string> => {
  const secretDoc = await prisma.env.findFirst({ where: { key: 'REGISTRATION_TOKEN' } });
  if (secretDoc) {
    return secretDoc.value;
  }
  const newSecret = crypto.randomBytes(32).toString('hex');
  await prisma.env.create({ data: { key: 'REGISTRATION_TOKEN', value: newSecret } });
  return newSecret;
};

// Generate 6 digit OTP
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(email: string) {
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes validity
  const nextResendAt = new Date(Date.now() + 60 * 1000); // 1 minute cooldown

  await prisma.otpCode.upsert({
    where: { email },
    update: { code, expiresAt, nextResendAt, attempts: 0 },
    create: { email, code, expiresAt, nextResendAt, attempts: 0 }
  });

  const text = `Il tuo codice di accesso per Splitify è: ${code}\nQuesto codice scadrà in 3 minuti.`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); border: 1px solid #eaebf0; }
    .header { background: linear-gradient(135deg, #7a84ff, #9ba3ff); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 40px 32px; text-align: center; }
    .text { font-size: 16px; color: #4b5563; line-height: 1.6; margin-bottom: 24px; }
    .otp-box { background: #f3f4ff; border: 1px solid #dbe0ff; border-radius: 12px; padding: 24px; margin: 32px 0; }
    .otp-code { font-size: 38px; font-weight: 700; color: #5c67ff; letter-spacing: 10px; margin: 0; font-family: monospace; }
    .footer { padding: 24px; text-align: center; background: #fafafa; border-top: 1px solid #f0f0f0; }
    .footer p { font-size: 13px; color: #9ca3af; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Splitify</h1>
    </div>
    <div class="content">
      <p class="text" style="font-weight: 600; color: #111827;">Codice di Sicurezza</p>
      <p class="text">Abbiamo ricevuto una richiesta di accesso o registrazione per Splitify. Usa questo codice monouso per completare l'operazione:</p>
      <div class="otp-box">
        <p class="otp-code">${code}</p>
      </div>
      <p class="text" style="font-size: 14px; color: #6b7280;">Questo codice scade tra <strong>3 minuti</strong>. Se non hai richiesto tu l'accesso, puoi ignorare in sicurezza questa email.</p>
    </div>
    <div class="footer">
      <p>Splitify 💰 — Gestisci le tue spese di gruppo in modo semplice.</p>
    </div>
  </div>
</body>
</html>`;

  await sendMail(email, 'Codice di Accesso Splitify', text, html);
}

export const login = async (req: AuthRequest, res: Response) => {
  const { email } = req.body as LoginRequest;


  if (email) {
    const emailLower = email.toLowerCase();
    
    // Check if user doesn't exist and registration is closed
    const user = await prisma.user.findFirst({ where: { email: emailLower } });
    if (!user) {
      const mode = await getRegistrationMode();
      if (mode === RegistrationMode.PRIVATE) {
        return res.status(403).json({ message: 'La registrazione è chiusa' });
      }
    }

    // Check resend cooldown
    const existingOtp = await prisma.otpCode.findUnique({ where: { email: emailLower } });
    if (existingOtp && existingOtp.nextResendAt > new Date()) {
      return res.status(429).json({ message: 'Attendi prima di richiedere un nuovo codice' });
    }

    try {
      await sendOtpEmail(emailLower);
      return res.json({ requiresOtp: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: 'Errore durante l\'invio dell\'email' });
    }
  }

  return res.status(400).json({ message: 'Inserisci un\'email valida' });
};

export const resendOtp = async (req: AuthRequest, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email richiesta' });
  
  const emailLower = email.toLowerCase();
  const existingOtp = await prisma.otpCode.findUnique({ where: { email: emailLower } });
  if (existingOtp && existingOtp.nextResendAt > new Date()) {
    return res.status(429).json({ message: 'Attendi prima di richiedere un nuovo codice' });
  }

  try {
    await sendOtpEmail(emailLower);
    return res.json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Errore durante l\'invio dell\'email' });
  }
};

export const verifyOtp = async (req: AuthRequest, res: Response) => {
  const { email, code, keepLogin, token } = req.body as VerifyOtpRequest;
  if (!email || !code) return res.status(400).json({ message: 'Email e codice richiesti' });

  const emailLower = email.toLowerCase();
  const otpCode = await prisma.otpCode.findUnique({ where: { email: emailLower } });

  if (!otpCode) {
    return res.status(400).json({ message: 'Nessun codice richiesto per questa email' });
  }

  if (otpCode.attempts >= 5) {
    return res.status(429).json({ message: 'Troppi tentativi errati. Richiedi un nuovo codice.' });
  }

  if (otpCode.expiresAt < new Date()) {
    return res.status(400).json({ message: 'Codice scaduto. Richiedine uno nuovo.' });
  }

  if (otpCode.code !== code) {
    await prisma.otpCode.update({ where: { email: emailLower }, data: { attempts: { increment: 1 } } });
    return res.status(400).json({ message: 'Codice errato' });
  }

  await prisma.otpCode.delete({ where: { email: emailLower } });

  let user = await prisma.user.findFirst({ where: { email: emailLower } });

  // Registration flow if user doesn't exist
  if (!user) {
    const mode = await getRegistrationMode();
    if (mode === RegistrationMode.PRIVATE) {
      return res.status(403).json({ message: 'La registrazione è chiusa' });
    }
    if (mode === RegistrationMode.TOKEN) {
      const regToken = await getRegistrationToken();
      if (regToken !== token) {
        return res.status(403).json({ message: 'Token di registrazione non valido' });
      }
    }

    user = await prisma.user.create({
      data: {
        email: emailLower,
        role: Role.GUEST
      }
    });
    emitAdminUpdate(['users']);
  }

  const tokenDuration = keepLogin ? TOKEN_DURATION.LONG : TOKEN_DURATION.SHORT;
  const userAgent = req.headers['user-agent'];
  const ipAddress = req.ip || req.socket.remoteAddress;

  const loginToken = await createAccessToken(user.id, tokenDuration, undefined, userAgent, ipAddress);

  return res.json({
    access_token: loginToken,
    token_type: 'bearer',
    expires_in: tokenDuration
  });
};


export const refreshToken = async (req: AuthRequest, res: Response) => {
  try {
    const token = req.token;
    const user = req.user;

    if (!token || !user) {
      return res.status(400).json({ message: 'Token is required' });
    }

    if (!canRefreshToken(token)) {
      return res.status(400).json({
        message: 'Token cannot be refreshed at this time',
      });
    }

    const session = user.sessions?.find((s: any) => s.sessionId === token.sid);

    if (!session) {
      return res.status(400).json({ message: 'Session not found' });
    }

    const originalDuration = token.exp - token.iat;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

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

export const registrationInfo = async (req: AuthRequest, res: Response) => {
  const registrationMode = await getRegistrationMode();
  const result = {
    mode: registrationMode,
    token: undefined as string | undefined
  }
  if (req.user?.role === Role.ADMIN) {
    result.token = await getRegistrationToken();
  }
  res.json(result);
};

export const setRegistrationInfo = async (req: AuthRequest, res: Response) => {
  const { mode, token }: SetRegistrationMode = req.body;

  const modeDoc = await prisma.env.findFirst({ where: { key: 'REGISTRATION_MODE' } });
  if (modeDoc) {
    await prisma.env.update({ where: { id: modeDoc.id }, data: { value: mode } });
  } else {
    await prisma.env.create({ data: { key: 'REGISTRATION_MODE', value: mode } });
  }

  if (mode === RegistrationMode.TOKEN && token) {
    const tokenDoc = await prisma.env.findFirst({ where: { key: 'REGISTRATION_TOKEN' } });
    if (tokenDoc) {
      await prisma.env.update({ where: { id: tokenDoc.id }, data: { value: token } });
    } else {
      await prisma.env.create({ data: { key: 'REGISTRATION_TOKEN', value: token } });
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

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { sessions: true, passkeys: true }
  });

  if (!fullUser) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  res.json({
    id: fullUser.id,
    email: fullUser.email,
    role: fullUser.role,
    sessions: fullUser.sessions,
    pinnedBoards: fullUser.pinnedBoards || [],
    boardUsage: fullUser.boardUsage || {},
    passkeys: fullUser.passkeys,
    currentSessionId: req.token?.sid,
    passkeyPromptDismissed: fullUser.passkeyPromptDismissed
  });
};

export const passkeyRegisterStart = async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user?.id || '' },
    include: { passkeys: true }
  });
  
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  
  const userPasskeys = user.passkeys || [];

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: isoUint8Array.fromUTF8String(user.id),
    userName: user.email,
    excludeCredentials: userPasskeys.map((passkey) => ({
      id: passkey.id,
      transports: passkey.transports as any,
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

    await prisma.passkey.create({
      data: {
        userId: user.id,
        id: credential.id,
        name: name || `Passkey ${new Date().toLocaleDateString()}`,
        publicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        transports: credential.transports || []
      }
    });

    return res.json({ verified: true });
  }

  return res.status(400).json({ verified: false, message: 'Verification failed' });
};

export const passkeyLoginStart = async (req: AuthRequest, res: Response) => {
  let userPasskeys: any[] = [];

  if (req.body.email) {
    const user = await prisma.user.findFirst({
      where: { email: req.body.email.toLowerCase() },
      include: { passkeys: true }
    });
    if (user && user.passkeys) {
      userPasskeys = user.passkeys;
    }
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: userPasskeys.map((passkey) => ({
      id: passkey.id,
      transports: passkey.transports as any,
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

  const credentialId = response.id;
  const passkey = await prisma.passkey.findFirst({
    where: { id: credentialId },
    include: { user: true }
  });

  if (!passkey) {
    return res.status(400).json({ message: 'Passkey not found in user profile' });
  }

  const user = passkey.user;

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
        transports: passkey.transports as any,
      },
    });
  } catch (error: any) {
    console.error(error);
    return res.status(400).json({ message: error.message });
  }

  if (verification.verified) {
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: { counter: verification.authenticationInfo.newCounter }
    });

    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    const tokenDuration = req.body.keepLogin ? TOKEN_DURATION.LONG : TOKEN_DURATION.SHORT;
    const loginToken = await createAccessToken(user.id, tokenDuration, undefined, userAgent, ipAddress);

    return res.json({
      verified: true,
      access_token: loginToken,
      token_type: 'bearer',
      expires_in: tokenDuration,
      user_id: user.id
    });
  }

  return res.status(400).json({ verified: false, message: 'Verification failed' });
};

export const deleteSession = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const sessionId = req.params.sessionId;

  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  if (sessionId === req.token?.sid) return res.status(400).json({ message: 'Non puoi disconnettere la sessione attuale' });

  const deleted = await prisma.userSession.deleteMany({
    where: { userId: user.id, sessionId: sessionId }
  });

  if (deleted.count === 0) return res.status(404).json({ message: 'Session not found' });
  return res.json({ message: 'Session deleted successfully' });
};

export const deletePasskey = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const passkeyId = req.params.id;

  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const deleted = await prisma.passkey.deleteMany({
    where: { userId: user.id, id: passkeyId }
  });

  if (deleted.count === 0) return res.status(404).json({ message: 'Passkey not found' });
  return res.json({ message: 'Passkey deleted successfully' });
};

export const renamePasskey = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const passkeyId = req.params.id;
  const { name } = req.body;

  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  const updated = await prisma.passkey.updateMany({
    where: { userId: user.id, id: passkeyId },
    data: { name }
  });

  if (updated.count === 0) return res.status(404).json({ message: 'Passkey not found' });
  return res.json({ message: 'Passkey renamed successfully' });
};

export const deleteCurrentSession = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  const sessionId = req.token?.sid;

  if (!user || !sessionId) return res.status(401).json({ message: 'Unauthorized' });

  await prisma.userSession.deleteMany({
    where: { userId: user.id, sessionId: sessionId }
  });

  return res.json({ success: true });
};
