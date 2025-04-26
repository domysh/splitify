import mongoose, { Schema, Document } from 'mongoose';
import { Category as CategoryType } from './types';
import { defaultOption } from '../config';

const CategorySchema: Schema = new Schema({
  boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
  name: { type: String, required: true },
  order: { type: Number, default: 0 }
}, defaultOption);

CategorySchema.index({ boardId: 1 });

export default mongoose.model<CategoryType & Document>('Category', CategorySchema);
