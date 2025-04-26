import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { AddBoardAccess, AuthRequest, BoardPermission, Role, TransferBoardOwnership } from '../../models/types';
import BoardAccess from '../../models/BoardAccess';
import User from '../../models/User';
import { emitBoardUpdate, emitUserUpdate } from '../../utils/socket';
import { generateRandomObjectId } from '../../utils';
import { getAuthenticatedBoard } from '../../utils';

export const getBoardAccesses = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [board] = await getAuthenticatedBoard(id, req.user?.id, BoardPermission.VIEWER);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const userDetails = await BoardAccess.aggregate([
      { $match: { boardId: new ObjectId(id) } },
      {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
      },
      {
        $project: {
          _id: 0,
          id: { $toString: '$_id' },
          userId: 1,permission: 1,
          username: { $arrayElemAt: ['$user.username', 0] },
        }
      }
    ]);

    res.json(userDetails);
  } catch (err) {
    console.error('Error fetching board accesses:', err);
    res.status(400).json({ message: 'Failed to fetch board accesses' });
  }
};

export const addBoardAccess = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const accessData: AddBoardAccess = req.body;

    const [board] = await getAuthenticatedBoard(id, req.user?.id, BoardPermission.OWNER);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const targetUser = await User.findById(accessData.userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    if (board.creatorId.toString() === accessData.userId) {
      return res.status(400).json({ message: 'Cannot add access for the board owner' });
    }

    const existingAccess = await BoardAccess.findOne({
      userId: accessData.userId,
      boardId: new ObjectId(id)
    });
    if (existingAccess) {
      return res.status(400).json({ message: 'User already has access to this board' });
    }

    const access = new BoardAccess({
      _id: generateRandomObjectId(),
      userId: new ObjectId(accessData.userId),
      boardId: new ObjectId(id),
      permission: accessData.permission
    });

    await access.save();
    emitUserUpdate(accessData.userId, ['boards', `boards/${id}`]);
    emitBoardUpdate(id);
    res.status(201).json({ id: access._id.toString() });
  } catch (err) {
    console.error('Error adding board access:', err);
    res.status(400).json({ message: 'Failed to add board access' });
  }
};

export const removeBoardAccess = async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const [board] = await getAuthenticatedBoard(id, req.user?.id, BoardPermission.OWNER);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    if (targetUserId === req.user?.id && req.user.role != Role.ADMIN) {
      return res.status(400).json({ message: 'Cannot remove your own access' });
    }

    await BoardAccess.findOneAndDelete({
      userId: targetUserId,
      boardId: new ObjectId(id)
    });

    emitBoardUpdate(id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error removing board access:', err);
    res.status(400).json({ message: 'Failed to remove board access' });
  }
};

export const transferBoardOwnership = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const transferData: TransferBoardOwnership = req.body;

    const [board] = await getAuthenticatedBoard(id, userId, BoardPermission.OWNER);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const newOwner = await User.findById(transferData.newOwnerId);
    if (!newOwner) {
      return res.status(404).json({ message: 'New owner not found' });
    }

    await BoardAccess.findOneAndDelete({
      userId: transferData.newOwnerId,
      boardId: new ObjectId(id)
    });

    await BoardAccess.findOneAndUpdate(
      { userId, boardId: new ObjectId(id) },
      { permission: BoardPermission.EDITOR },
      { upsert: true }
    );

    board.creatorId = new ObjectId(transferData.newOwnerId);    
    await board.save();
    emitBoardUpdate(id);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error transferring board ownership:', err);
    res.status(400).json({ message: 'Failed to transfer board ownership' });
  }
};

export const updateBoardAccess = async (req: AuthRequest, res: Response) => {
  try {
    const { id, userId } = req.params;
    const { permission } = req.body;
    const currentUserId = req.user?.id;
    
    const [board] = await getAuthenticatedBoard(id, currentUserId, BoardPermission.OWNER);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    
    const updatedAccess = await BoardAccess.findOneAndUpdate(
      { boardId: new ObjectId(id), userId },
      { permission },
      { new: true }
    );
    
    if (!updatedAccess) {
      return res.status(404).json({ message: 'Access entry not found' });
    }

    emitBoardUpdate(id);
    return res.json({ id: updatedAccess._id.toString() });
  } catch (err) {
    console.error('Error updating board access:', err);
    return res.status(400).json({ message: 'Failed to update board access' });
  }
};
