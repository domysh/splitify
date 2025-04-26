import { Router } from 'express';
import { login, getMe, register, refreshToken, registrationInfo, setRegistrationInfo } from '../controllers/auth';
import { authenticate, hasRole } from '../middleware/auth';
import { voidReturn as r } from '../utils';
import { validateLogin, validateRegistration, validateSetRegistrationMode } from '../middleware/validation';
import { Role } from '../models/types';

const router = Router();

router.post('/login', r(validateLogin), r(login));
router.get('/me', authenticate, getMe);
router.post('/register', r(validateRegistration), r(register));
router.post('/register/:token', r(validateRegistration), r(register));
router.post('/token/refresh', r(refreshToken));
router.get('/register/info', r(registrationInfo));
router.put('/register/set', hasRole(Role.ADMIN), r(validateSetRegistrationMode), r(setRegistrationInfo));

export default router;
