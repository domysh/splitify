import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { emitBoardUpdate } from '../../utils/socket';
import { AddCategory, AuthRequest, BoardPermission } from '../../models/types';
import { getAuthenticatedBoard } from '../../utils';

export const getBoardCategories = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.VIEWER);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const categories = await prisma.category.findMany({
      where: { boardId: id },
      orderBy: { order: 'asc' }
    });
    
    const sortedCategories = categories.map((cat, index) => ({
      id: cat.id,
      name: cat.name,
      order: cat.order !== null ? cat.order : index
    }));

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
    
    const categoriesCount = await prisma.category.count({ where: { boardId: id } });
    
    const newCategory = await prisma.category.create({
      data: {
        boardId: id,
        name: categoryData.name,
        order: categoryData.order !== undefined ? categoryData.order : categoriesCount
      }
    });

    emitBoardUpdate(id, ['categories']);
    res.status(201).json({ id: newCategory.id });
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

    const updatedCategory = await prisma.category.updateMany({
      where: { id: category_id, boardId: id },
      data: { name: categoryData.name, order: categoryData.order }
    });

    if (updatedCategory.count === 0) {
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

    const deletedCategory = await prisma.category.deleteMany({
      where: { id: category_id, boardId: id }
    });
    
    if (deletedCategory.count === 0) {
      res.status(404).json({ message: 'Category not found' });
      return;
    }

    // Prisma relations (CategoryToProduct and CategoryToMember) should be deleted automatically if we set onDelete: Cascade.
    // Let's check schema.prisma later, but if we don't have cascade we must delete them manually.
    await prisma.categoryToProduct.deleteMany({
      where: { categoryId: category_id }
    });
    
    await prisma.categoryToMember.deleteMany({
      where: { categoryId: category_id }
    });
    
    emitBoardUpdate(id, ['categories']);
    res.json({ id: category_id });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(400).json({ message: 'Failed to delete category' });
  }
};
