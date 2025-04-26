import { Router } from 'express';
import { getUsers, getUser, createUser, updateUser, deleteUser, searchUsers, updateUsername, changeUserPassword } from '../controllers/user';
import { hasRole } from '../middleware/auth';
import { validateAddUser, validateChangePassword, validateUpdateUser, validateUpdateUsername } from '../middleware/validation';
import { Role } from '../models/types';
import { voidReturn as r } from '../utils';

const router = Router();

router.get('/utils/search', r(searchUsers));

// Common user APIs
router.put('/me/username', r(validateUpdateUsername), r(updateUsername));
router.delete('/', r(deleteUser));
router.put('/me/password', r(validateChangePassword), r(changeUserPassword));

// Admin user APIs
router.get('/', hasRole(Role.ADMIN), r(getUsers));
router.get('/:id', hasRole(Role.ADMIN), r(getUser));
router.post('/', r(validateAddUser), hasRole(Role.ADMIN), r(createUser));
router.put('/:id', r(validateUpdateUser), hasRole(Role.ADMIN), r(updateUser));
router.delete('/:id', hasRole(Role.ADMIN), r(deleteUser));


export default router;
