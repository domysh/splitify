import mongoose, { Schema } from 'mongoose';
import { defaultOption } from '../config';

const transactionSchema = new mongoose.Schema({
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
    index: true
  },
  fromMemberId: {
    type: Schema.Types.ObjectId,
    default: null
  },
  toMemberId: {
    type: Schema.Types.ObjectId,
    default: null
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  productId: {
    type: Schema.Types.ObjectId,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, defaultOption);

export default mongoose.model('Transaction', transactionSchema);
