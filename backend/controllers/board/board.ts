import { Response } from 'express';
import { prisma } from '../../utils/prisma';
import { emitBoardUpdate, emitUserUpdate } from '../../utils/socket';
import { AddBoardForm, AuthRequest, BoardPermission, Role } from '../../models/types';
import { getAuthenticatedBoard } from '../../utils';

const fetchBoardWithPrisma = async (boardId: string, loggedId?: string, options: { categories?: boolean, products?: boolean, members?: boolean, stats?: boolean } = {}) => {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      creator: { select: { id: true, username: true } },
      categories: options.categories || options.stats ? { orderBy: { order: 'asc' } } : false,
      products: options.products || options.stats ? { include: { categories: true } } : false,
      members: options.members || options.stats ? { include: { categories: true } } : false,
      accesses: loggedId ? { where: { userId: loggedId } } : false
    }
  });

  if (!board) return null;

  let permission = BoardPermission.VIEWER;
  if (loggedId) {
    if (board.creatorId === loggedId) {
      permission = BoardPermission.OWNER;
    } else if (board.accesses && board.accesses.length > 0) {
      permission = board.accesses[0].permission as BoardPermission;
    }
  }

  return {
    id: board.id,
    name: board.name,
    isPublic: board.isPublic,
    creatorId: board.creatorId,
    creator: board.creator,
    permission,
    ...(options.categories ? { categories: board.categories.map(c => ({ id: c.id, name: c.name, order: c.order })) } : {}),
    ...(options.products ? { products: board.products.map(p => ({ id: p.id, name: p.name, price: p.price, categories: (p as any).categories?.map((c: any) => c.categoryId) || [] })) } : {}),
    ...(options.members ? { members: board.members.map(m => ({ id: m.id, name: m.name, paid: m.paid, categories: (m as any).categories?.map((c: any) => c.categoryId) || [] })) } : {}),
    ...(options.stats ? { stats: { productsCount: board.products.length, categoriesCount: board.categories.length, membersCount: board.members.length } } : {})
  };
};


export const getBoards = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Authentication required' });

    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { creatorId: user.id },
          { accesses: { some: { userId: user.id } } }
        ]
      },
      include: {
        creator: { select: { id: true, username: true } },
        categories: true,
        products: { include: { categories: true } },
        members: { include: { categories: true } },
        accesses: { where: { userId: user.id } }
      }
    });

    const result = boards.map(board => {
      let permission = BoardPermission.VIEWER;
      if (board.creatorId === user.id) {
        permission = BoardPermission.OWNER;
      } else if (board.accesses.length > 0) {
        permission = board.accesses[0].permission as BoardPermission;
      }

      return {
        id: board.id,
        name: board.name,
        isPublic: board.isPublic,
        creatorId: board.creatorId,
        creator: board.creator,
        permission,
        categories: board.categories.map(c => ({ id: c.id, name: c.name, order: c.order })),
        stats: {
          productsCount: board.products.length,
          categoriesCount: board.categories.length,
          membersCount: board.members.length
        }
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error in getBoards:', err);
    res.status(500).json({ message: 'Failed to fetch boards' });
  }
};

export const createBoard = async (req: AuthRequest, res: Response) => {
  try {
    const boardData: AddBoardForm = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const board = await prisma.board.create({
      data: {
        name: boardData.name,
        isPublic: boardData.isPublic || false,
        creatorId: user.id
      }
    });

    res.status(201).json({ id: board.id });
  } catch (err) {
    console.error('Error creating board:', err);
    res.status(400).json({ message: 'Failed to create board' });
  }
};

export const getBoard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;
    
    const [boardAuth] = await getAuthenticatedBoard(id, user?.id);
    if (!boardAuth) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const result = await fetchBoardWithPrisma(id, user?.id, { categories: true, products: true, members: true, stats: false });
    
    if (result) {
      if (user) {
        const currentUsage = (user.boardUsage as Record<string, number>) || {};
        currentUsage[id] = Date.now();
        prisma.user.update({
          where: { id: user.id },
          data: { boardUsage: currentUsage }
        }).then(() => {
          emitUserUpdate(user.id, ['me']);
        }).catch(e => console.error("Failed to update board usage", e));
      }
      res.json(result);
    } else {
      res.status(404).json({ message: 'Board not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Failed to fetch board' });
  }
};

export const updateBoard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const boardData: AddBoardForm = req.body;
    const userId = req.user?.id;

    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.OWNER);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const updatedBoard = await prisma.board.update({
      where: { id },
      data: { name: boardData.name, isPublic: boardData.isPublic }
    });

    emitBoardUpdate(id);
    res.json({ id: updatedBoard.id });
  } catch (err) {
    console.error('Error updating board:', err);
    res.status(400).json({ message: 'Failed to update board' });
  }
}

export const deleteBoardAction = async (id: string) => {
  await prisma.board.delete({ where: { id } }); // Cascade deletes will handle relations
}

export const deleteBoard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.OWNER);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    await deleteBoardAction(id);
    emitBoardUpdate(id);

    res.json({ id });
  } catch (err) {
    console.error('Error deleting board:', err);
    res.status(400).json({ message: 'Failed to delete board' });
  }
};

export const togglePinBoard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const pinnedBoards = user.pinnedBoards || [];
    let isPinned = false;

    if (pinnedBoards.includes(id)) {
        await prisma.user.update({
            where: { id: userId },
            data: { pinnedBoards: pinnedBoards.filter(b => b !== id) }
        });
        isPinned = false;
    } else {
        await prisma.user.update({
            where: { id: userId },
            data: { pinnedBoards: [...pinnedBoards, id] }
        });
        isPinned = true;
    }
    
    emitUserUpdate(userId, ['me']);

    res.json({ success: true, pinned: isPinned });
  } catch (err) {
      console.error(err);
      res.status(500).json({ success: false });
  }
};
