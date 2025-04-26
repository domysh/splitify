import mongoose, { Schema, Document } from 'mongoose';
import { Board as BoardType } from './types';
import { defaultOption } from '../config';

const BoardSchema: Schema = new Schema({
  name: { type: String, required: true },
  isPublic: { type: Boolean, default: false },
  creatorId: { type: Schema.Types.ObjectId, required: true }
}, defaultOption);

export default mongoose.model<BoardType & Document>('Board', BoardSchema);
