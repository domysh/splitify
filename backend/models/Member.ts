import mongoose, { Schema, Document } from 'mongoose';
import { Member as MemberType } from './types';
import { defaultOption, setAggregateDefaultOperations } from '../config';

const MemberSchema: Schema = new Schema({
  boardId: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
  name: { type: String, required: true },
  paid: { type: Number, default: 0 },
  categories: { type: [Schema.Types.ObjectId], default: [] }
}, defaultOption);

MemberSchema.index({ boardId: 1 });
setAggregateDefaultOperations(MemberSchema)

export default mongoose.model<MemberType & Document>('Member', MemberSchema);
