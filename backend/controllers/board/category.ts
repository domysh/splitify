import { Response } from 'express';
import Category from '../../models/Category';
import { emitBoardUpdate } from '../../utils/socket';
import { ObjectId } from 'mongodb';
import { AddCategory, AuthRequest, BoardPermission } from '../../models/types';
import Product from '../../models/Product';
import Member from '../../models/Member';
import { generateRandomObjectId } from '../../utils';
import { getAuthenticatedBoard } from '../../utils';

export const getBoardCategories = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.VIEWER);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const categories = await Category.find({ boardId: new ObjectId(id) });
    
    const sortedCategories = categories.map((cat, index) => ({
      id: cat._id.toString(),
      name: cat.name,
      order: cat.order !== undefined ? cat.order : index
    })).sort((a, b) => 
      (a.order || 0) - (b.order || 0)
    )

    res.json(sortedCategories);
  } catch (err) {
    res.status(400).json({ message: 'Failed to fetch categories' });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const categoryData: AddCategory = req.body;

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.EDITOR);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }    
    const categoriesCount = await Category.countDocuments({ boardId: new ObjectId(id) });
    const newCategory = await Category.create({
      _id: generateRandomObjectId(),
      boardId: new ObjectId(id),
      name: categoryData.name,
      order: categoryData.order !== undefined ? categoryData.order : categoriesCount
    });

    emitBoardUpdate(id, ['categories']);
    res.status(201).json({ id: newCategory._id.toString() });
  } catch (err) {
    res.status(400).json({ message: 'Failed to create category' });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id, category_id } = req.params;
    const categoryData: AddCategory = req.body;

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.EDITOR);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const updatedCategory = await Category.findOneAndUpdate(
      { _id: new ObjectId(category_id), boardId: new ObjectId(id) },
      { $set: categoryData },
      { new: true }
    );

    if (!updatedCategory) {
      res.status(400).json({ message: 'Board or category not found' });
      return;
    }
    
    emitBoardUpdate(id, ['categories']);
    res.json({ id: category_id });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(400).json({ message: 'Failed to update category' });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id, category_id } = req.params;

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.EDITOR);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const deletedCategory = await Category.findOneAndDelete({
      _id: new ObjectId(category_id),
      boardId: new ObjectId(id)
    });
    
    if (!deletedCategory) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    await Product.updateMany(
      { boardId: new ObjectId(id) },
      { $pull: { categories: category_id } }
    );

    await Member.updateMany(
      { boardId: new ObjectId(id) },
      { $pull: { categories: category_id } }
    );
    
    emitBoardUpdate(id, ['categories']);
    res.json({ id: category_id });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(400).json({ message: 'Failed to delete category' });
  }
};
