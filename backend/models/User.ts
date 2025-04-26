import mongoose, { Schema, Document } from 'mongoose';
import { User as UserType, Role } from './types';
import { defaultOption } from '../config';

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(Role), default: Role.GUEST },
  sessions: {
    type: [{
      sessionId: String,
      createdAt: { type: Date, default: Date.now },
      expiresAt: Date,
      lastUsed: { type: Date, default: Date.now }
    }],
    default: []
  }
}, defaultOption);

export default mongoose.model<UserType & Document>('User', UserSchema);
