import mongoose, { Schema, Document } from 'mongoose';
import { Product as ProductType } from './types';
import { defaultOption } from '../config';

const ProductSchema: Schema = new Schema({
  boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  categories: { type: [Schema.Types.ObjectId], default: [] }
}, defaultOption);

ProductSchema.index({ boardId: 1 });

export default mongoose.model<ProductType & Document>('Product', ProductSchema);
