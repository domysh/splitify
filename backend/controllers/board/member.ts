import { Response } from 'express';
import Member from '../../models/Member';
import { emitBoardUpdate } from '../../utils/socket';
import { ObjectId } from 'mongodb';
import { AddMember, AuthRequest, BoardPermission } from '../../models/types';
import { generateRandomObjectId } from '../../utils';
import { getAuthenticatedBoard } from '../../utils';

export const getBoardMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.VIEWER);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const members = await Member.find({ boardId: new ObjectId(id) });
    
    const formattedMembers = members.map(member => ({
      id: member._id.toString(),
      name: member.name,
      paid: member.paid,
      categories: member.categories
    }));

    res.json(formattedMembers);
  } catch (err) {
    res.status(400).json({ message: 'Failed to fetch members' });
  }
};

export const createMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const memberData: AddMember = req.body;

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.EDITOR);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const newMember = await Member.create({
      _id: generateRandomObjectId(),
      boardId: new ObjectId(id),
      name: memberData.name,
      paid: memberData.paid || 0,
      categories: memberData.categories.map(a => new ObjectId(a)) || []
    });

    emitBoardUpdate(id, ['members']);
    res.status(201).json({ id: newMember._id.toString() });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create member' });
  }
};

export const updateMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, member_id } = req.params;
    const memberData: AddMember = req.body;

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.EDITOR);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const memberBefore = await Member.findOne({
      _id: new ObjectId(member_id),
      boardId: new ObjectId(id)
    });

    if (!memberBefore) {
      res.status(400).json({ message: 'Board or member not found' });
      return;
    }

    const updatedMember = await Member.findByIdAndUpdate(
      member_id,
      { $set: memberData },
      { new: true }
    );

    if (!updatedMember) {
      res.status(400).json({ message: 'Board or member not found' });
      return;
    }

    emitBoardUpdate(id, ['members']);
    res.json({ id: member_id });
  } catch (err) {
    console.error('Error updating member:', err);
    res.status(400).json({ message: 'Failed to update member' });
  }
};

export const deleteMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, member_id } = req.params;

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.EDITOR);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    await Member.findOneAndDelete({
      _id: new ObjectId(member_id),
      boardId: new ObjectId(id)
    });

    emitBoardUpdate(id, ['members']);
    res.json({ id: member_id });
  } catch (err) {
    res.status(400).json({ message: 'Failed to delete member' });
  }
};
