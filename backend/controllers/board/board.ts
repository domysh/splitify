import { Response } from 'express';
import Board from '../../models/Board';
import Category from '../../models/Category';
import Product from '../../models/Product';
import Member from '../../models/Member';
import Transaction from '../../models/Transaction';
import BoardAccess from '../../models/BoardAccess';
import { emitBoardUpdate } from '../../utils/socket';
import { AddBoardForm, AuthRequest, BoardPermission, Role } from '../../models/types';
import { generateRandomObjectId } from '../../utils';
import { getAuthenticatedBoard } from '../../utils';
import { ObjectId } from 'mongodb';

const boardPipeline = ({ categories = true, products = true, members = true, stats = false, filters, loggedId }: {
  categories:boolean,
  products:boolean,
  members:boolean,
  stats:boolean,
  filters?: any[]
  loggedId?: string
}) => {
  return [
    ...(filters??[]),
    ...(loggedId?[{
      $lookup: {
        from: "boardaccesses",
        let: { boardId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$boardId", "$$boardId"] },
                  { $eq: ["$userId", new ObjectId(loggedId)] }
                ]
              }
            }
          }
        ],
        as: "userAccess"
      }
    }]:[]),
    ...((categories || stats)?[{
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "boardId",
        as: "categories"
      }
    }]:[]),
    ...((products || stats)?[{
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "boardId",
        as: "products"
      }
    }]:[]),
    ...((members || stats)?[{
      $lookup: {
        from: "members",
        localField: "_id",
        foreignField: "boardId",
        as: "members"
      }
    }]:[]),
    {
      $lookup: {
        from: "users",
        localField: "creatorId",
        foreignField: "_id",
        as: "creatorData"
      }
    },
    {
      $project: {
        name: 1,
        isPublic: 1,
        creatorId: 1,
        ...(categories? { categories: {
          $map: {
            input: "$categories",
            as: "cat",
            in: {
              id: { $toString: "$$cat._id" },
              name: "$$cat.name",
              order: "$$cat.order"
            }
          }
        } }:{}),
        ...(products? { products: {
          $map: {
            input: "$products",
            as: "prod",
            in: {
              id: { $toString: "$$prod._id" },
              name: "$$prod.name",
              price: "$$prod.price",
              categories: "$$prod.categories"
            }
          }
        } }:{}),
        ...(members? { members: {
          $map: {
            input: "$members",
            as: "mem",
            in: {
              id: { $toString: "$$mem._id" },
              name: "$$mem.name",
              paid: "$$mem.paid",
              categories: "$$mem.categories"
            }
          }
        } }:{}),
        ...(stats?{stats: {
          productsCount: { $size: "$products" },
          categoriesCount: { $size: "$categories" },
          membersCount: { $size: "$members" }
        }}:{}),
        creator: {
          $cond: {
            if: { $gt: [{ $size: "$creatorData" }, 0] },
            then: {
              id: { $toString: { $arrayElemAt: ["$creatorData._id", 0] } },
              username: { $arrayElemAt: ["$creatorData.username", 0] }
            },
            else: null
          }
        },
        permission: loggedId?{
          $cond: {
            if: { $eq: [{ $toString: "$creatorId" }, loggedId] },
            then: BoardPermission.OWNER,
            else: {
              $cond: {
                if: { $gt: [{ $size: "$userAccess" }, 0] },
                then: { $arrayElemAt: ["$userAccess.permission", 0] },
                else: null
              }
            }
          }
        }:BoardPermission.VIEWER // Guest user
      }
    }
  ]
}


export const getBoards = async (req: AuthRequest, res: Response) => {
  try {    
    const user = req.user;
    if (!user) return res.status(401).json({ message: 'Authentication required' });
    
    res.json(
      await Board.aggregate(boardPipeline({
        members: false,
        stats: true,
        products: false,
        categories: true,
        filters: (user.role === Role.ADMIN)?[]:[
          {
            $lookup: {
              from: 'boardaccesses',
              localField: '_id',
              foreignField: 'boardId',
              as: 'accesses'
            }
          },
          {
            $match: {
              $or: [
                { creatorId: new ObjectId(user.id as string) },
                { 'accesses.userId': new ObjectId(user.id as string) }
              ]
            }
          },
          { $project: { accesses: 0 } } // Remove the joined accesses from results
        ],
        loggedId: user.id
      }))
    )
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
    
    const board = new Board({
      _id: generateRandomObjectId(),
      name: boardData.name,
      isPublic: boardData.isPublic || false,
      creatorId: user.id
    });
    
    await board.save();
    
    res.status(201).json({ id: board._id.toString() });
  } catch (err) {
    console.error('Error creating board:', err);
    res.status(400).json({ message: 'Failed to create board' });
  }
};

export const getBoard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = req.user;
    const [board] = await getAuthenticatedBoard(id, user?.id);
    if (!board) {
      return res.status(404).json({ message: 'Board not found' });
    }
    res.json(
      await Board.aggregate(boardPipeline({
        members: true,
        stats: false,
        products: true,
        categories: true,
        filters: [ { $match: { _id: new ObjectId(id) } }],
        loggedId: user?.id
      })).then((result) => {
        if (result.length > 0) {
          return result[0];
        }
        throw new Error("Can't fetch board");
      })
    )
  } catch (err) {
    return res.status(400).json({ message: 'Failed to fetch board' });
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

    const updatedBoard = await Board.findByIdAndUpdate(
      id,{ $set: boardData },{ new: true }
    )

    emitBoardUpdate(id);
    res.json({ id: updatedBoard?._id.toString() });
  } catch (err) {
    console.error('Error updating board:', err);
    res.status(400).json({ message: 'Failed to update board' });
  }
}

export const deleteBoardAction = async (id: string) => {
  await Promise.all([
    Transaction.deleteMany({ boardId: new ObjectId(id) }),
    Category.deleteMany({ boardId: new ObjectId(id) }),
    Product.deleteMany({ boardId: new ObjectId(id) }),
    Member.deleteMany({ boardId: new ObjectId(id) }),
    BoardAccess.deleteMany({ boardId: new ObjectId(id) }),
    Board.findByIdAndDelete(id)
  ])
}

export const deleteBoard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.OWNER);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }
    
    await deleteBoardAction(id)
    emitBoardUpdate(id);

    res.json({ id });
  } catch (err) {
    console.error('Error deleting board:', err);
    res.status(400).json({ message: 'Failed to delete board' });
  }
};
