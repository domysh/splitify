import { Response } from 'express';
import Product from '../../models/Product';
import Member from '../../models/Member';
import { emitBoardUpdate } from '../../utils/socket';
import { ObjectId } from 'mongodb';
import { AddProduct, AuthRequest, BoardPermission } from '../../models/types';
import { createTransactionHelper } from '../transaction';
import { generateRandomObjectId } from '../../utils';
import { getAuthenticatedBoard } from '../../utils';
import Transaction from '../../models/Transaction';

export const getBoardProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.VIEWER);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const products = await Product.find({ boardId: new ObjectId(id) });
    
    const formattedProducts = products.map(product => ({
      id: product._id.toString(),
      name: product.name,
      price: product.price,
      categories: product.categories
    }));

    res.json(formattedProducts);
  } catch (err) {
    res.status(400).json({ message: 'Failed to fetch products' });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const productData: AddProduct = req.body;

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.EDITOR);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    const memberId = productData.memberId || null;
    delete productData.memberId;

    
    const newProduct = await Product.create({
      _id: generateRandomObjectId(),
      boardId: new ObjectId(id),
      name: productData.name,
      price: productData.price || 0,
      categories: productData.categories.map( a => new ObjectId(a)) || []
    });

    const productId = newProduct._id.toString();

    if (memberId && productData.price && productData.price > 0) {
      
      const member = await Member.findOne({
        _id: new ObjectId(memberId),
        boardId: new ObjectId(id)
      });

      if (member) {
        
        await createTransactionHelper(
          id,
          memberId,  
          null,      
          productData.price,
          `${member.name} ha pagato per ${productData.name}`,
          productId
        );
      }
    }
    
    emitBoardUpdate(id, ['products']);
    res.status(201).json({ id: productId });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(400).json({ message: 'Failed to create product' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id, product_id } = req.params;
    const productData: AddProduct = req.body;
    const { updateOnly } = req.query;
    const updateOnlyFlag = updateOnly === 'true';
    let transactionUpdated = false;
    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.EDITOR);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    
    const currentProduct = await Product.findOne({
      _id: new ObjectId(product_id), 
      boardId: new ObjectId(id)
    });

    if (!currentProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    
    if (!updateOnlyFlag && productData.price !== undefined && productData.price !== currentProduct.price) {
      
      const transactions = await Transaction.find({
        productId: new ObjectId(product_id),
        boardId: new ObjectId(id)
      });
      
      
      if (transactions.length === 1 && Number(transactions[0].amount) === Number(currentProduct.price)) {
        
        await Transaction.updateOne(
          { _id: transactions[0]._id },
          { $set: { amount: productData.price } }
        );
        
        if (transactions[0].fromMemberId) {
          const priceDifference = Number(productData.price) - Number(currentProduct.price);
          await Member.updateOne(
            { _id: transactions[0].fromMemberId },
            { $inc: { paid: priceDifference } }
          );
        }
        transactionUpdated = true;
      }
    }

    
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: new ObjectId(product_id), boardId: new ObjectId(id) },
      { $set: productData },
      { new: true }
    );

    if (!updatedProduct) {
      res.status(400).json({ message: 'Board or product not found' });
      return;
    }
    if (transactionUpdated){
      emitBoardUpdate(id, ['transactions', 'members']);
    }else{
      emitBoardUpdate(id, ['products']);
    }
    res.json({ id: product_id });
  } catch (err) {
    res.status(400).json({ message: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const { id, product_id } = req.params;
    const { deleteOnly } = req.query;
    const deleteOnlyFlag = deleteOnly === 'true';

    const userId = req.user?.id;
    const [board, perm] = await getAuthenticatedBoard(id, userId, BoardPermission.EDITOR);
    if (!board || !perm) {
      return res.status(404).json({ message: 'Board not found' });
    }

    if (!deleteOnlyFlag) {
      
      
      const transactions = await Transaction.find({
        productId: new ObjectId(product_id),
        boardId: new ObjectId(id)
      })

      
      for (const transaction of transactions) {
        await createTransactionHelper(
          id,
          transaction.toMemberId ? transaction.toMemberId.toString() : null,
          transaction.fromMemberId ? transaction.fromMemberId.toString() : null,
          Number(transaction.amount),
          `Deleting: ${transaction.description || 'Product deleted'}`,
          null
        );
        
        await Transaction.deleteOne({ _id: transaction._id });
      }
    }

    
    await Product.findOneAndDelete({
      _id: new ObjectId(product_id),
      boardId: new ObjectId(id)
    });

    if (!deleteOnlyFlag) {
      emitBoardUpdate(id, ['members', 'transactions']);
    }else{
      emitBoardUpdate(id, ['products']);
    }
    res.json({ id: product_id });
  } catch (err) {
    res.status(400).json({ message: 'Failed to delete product' });
  }
};
