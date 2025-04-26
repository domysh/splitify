import mongoose, { Schema, Document } from 'mongoose';
import { Env as EnvType } from './types';
import { defaultOption } from '../config';

const EnvSchema: Schema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true }
}, defaultOption);

export default mongoose.model<EnvType & Document>('Env', EnvSchema);
