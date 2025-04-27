import { Response } from 'express';
import User from '../models/User';
import { hashPassword, verifyPassword } from '../utils/auth';
import { AddUser, AuthRequest, ChangePassword, Role, UpdateUser, UpdateUsername } from '../models/types';
import { emitAdminUpdate, emitUserUpdate } from '../utils/socket';
import { generateRandomObjectId } from '../utils';
import Board from '../models/Board';
import { deleteBoardAction } from './board/board';
import { ObjectId } from 'mongodb';
import BoardAccess from '../models/BoardAccess';

const calculatelastAccessStage = {
  $addFields: {
    lastAccess: {
      $cond: {
        if: { $gt: [{ $size: { $ifNull: ["$sessions", []] } }, 0] },
        then: { $max: "$sessions.lastUsed" },
        else: null
      }
    }
  }
}

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.aggregate([
      { $project: { password: 0 } },
      calculatelastAccessStage,
      { $project: { sessions: 0 } },
    ]);
    res.json(users);
  } catch (err) {
    res.status(400).json({ message: 'Failed to fetch users' });
  }
};

const canRemoveAnAdmin = async () => {
  const adminsCount = await User.countDocuments({ role: Role.ADMIN });
  return adminsCount > 1;
}

export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await User.aggregate([
      { $match: { _id: new ObjectId(id) } },
      { $project: { password: 0 } },
      calculatelastAccessStage,
    ])

    if (!user) {
      res.status(400).json({ message: 'User not found' });
      return;
    }
    
    res.json(user);
  } catch (err) {
    res.status(400).json({ message: 'Failed to fetch user' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, role }: AddUser = req.body;    
    const lowercaseUsername = username.toLowerCase();
    
    const existingUser = await User.findOne({ username: lowercaseUsername });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }
    
    const hashedPassword = await hashPassword(password);
    const user = new User({
      _id: generateRandomObjectId(),
      username: lowercaseUsername,
      password: hashedPassword,
      role: role || Role.GUEST
    });
    
    await user.save();
    emitAdminUpdate(['users']);
    
    return res.status(201).json({ id: user._id.toString() });
  } catch (err) {
    return res.status(400).json({ message: 'Failed to create user' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { username, password, role }: UpdateUser = req.body;
    
    try {
      new ObjectId(id);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const lowercaseUsername = username?.toLowerCase();
    
    if (lowercaseUsername === 'admin' && req.user?.role != Role.ADMIN) {
      return res.status(400).json({ message: "'admin' is reserved" });
    }
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    if (lowercaseUsername){
      
      if (lowercaseUsername !== user.username.toLowerCase()) {
        const existingUser = await User.findOne({ username: lowercaseUsername });
        
        if (existingUser) {
          return res.status(400).json({ message: 'Username already exists' });
        }
      }
      user.username = lowercaseUsername;
    }
    
    if (password) {
      user.password = await hashPassword(password);
    }
    
    if (role) {
      if (role !== Role.ADMIN && user.username === 'admin') {
        return res.status(400).json({ message: "'admin' can only be an administrator" });
      }
      if (user.role === Role.ADMIN && role !== Role.ADMIN && !await canRemoveAnAdmin()) {
        return res.status(400).json({ message: "At least one admin is required" });
      }
      user.role = role;
    }
    
    await user.save();
    emitAdminUpdate(['users', `users/${id}`]);
    emitUserUpdate(user._id.toString(), ['me']);
    
    res.json({ id: user._id.toString() });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(400).json({ message: 'Failed to update user' });
  }
};

export const updateUsername = async (req: AuthRequest, res: Response) => {
  try {
    const { username }: UpdateUsername = req.body;
    
    const lowercaseUsername = username?.toLowerCase();
    
    if (lowercaseUsername === 'admin' && req.user?.role != Role.ADMIN) {
      return res.status(400).json({ message: "'admin' is reserved" });
    }
    
    if (!req.user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (lowercaseUsername){      
      if (lowercaseUsername !== req.user.username.toLowerCase()) {
        const existingUser = await User.findOne({ username: lowercaseUsername });
        
        if (existingUser) {
          return res.status(400).json({ message: 'Username already exists' });
        }
      }
      req.user.username = lowercaseUsername;
    }
    
    await req.user.save();
    emitAdminUpdate(['users', `users/${req.user.id}`]);
    if (req.user._id) {
     emitUserUpdate(req.user._id.toString(), ['me']);
    }
    
    res.json({ id: req.user._id?.toString()??"" });
  } catch (err) {
    console.error('Error updating username:', err);
    res.status(400).json({ message: 'Failed to update username' });
  }
};

export const changeUserPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword }: ChangePassword = req.body;
    const { expireSessions } = req.query

    if ( expireSessions && typeof expireSessions !== 'string') {
      return res.status(400).json({ message: 'Invalid expireSessions value' });
    }

    if (!req.user) {
      return res.status(400).json({ message: 'User not found' });
    }

    const validPassword = await verifyPassword(oldPassword, req.user.password);
    if (!validPassword) {
      return res.status(406).json({ message: 'Wrong password!' });
    }

    req.user.password = await hashPassword(newPassword);
    
    if (expireSessions?.toLowerCase() === 'true' && req.token){
      req.user.sessions = req.user.sessions.filter(s => s.sessionId === req.token?.sid);
    }

    await req.user.save();
    
    emitAdminUpdate(['users', `users/${req.user.id}`]);
    if (req.user._id){
      emitUserUpdate(req.user._id?.toString(), ['me']);
    }
    
    res.json({ id: req.user._id?.toString()??"" });
  }catch (err) {
    console.error('Error changing password:', err);
    res.status(400).json({ message: 'Failed to change password' });
  }
}


export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = id?await User.findById(id):req.user
    
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    if (user.role === Role.ADMIN && !await canRemoveAnAdmin()) {
      return res.status(400).json({ message: "At least one admin is required" });
    }

    const uoid = new ObjectId(user._id);

    async function deleteOwnedBoards() {
      const ownedBoards = await Board.find({ creatorId: uoid })
      await Promise.all(ownedBoards.map((board) => deleteBoardAction(board._id.toString())))
    }

    await Promise.all([
      BoardAccess.deleteMany({ userId: uoid }),
      deleteOwnedBoards(),
      User.findByIdAndDelete(uoid),
    ]);
    
    emitAdminUpdate(['users', `users/${id}`, 'stats']);
    emitUserUpdate(id, ['me']);
    res.json({ id });
  } catch (err) {
    res.status(400).json({ message: 'Failed to delete user' });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string' || q.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }
    
    const regex = new RegExp(`^${q}`, 'i');
    
    const users = await User.find(
      { username: regex }, 
      { _id: 1, username: 1 }
    ).limit(15);
    
    
    const results = users.map(user => ({
      id: user._id.toString(),
      username: user.username
    }));
    
    res.json(results);
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(400).json({ message: 'Failed to search users' });
  }
};
