import mongoose, { Schema, Document } from 'mongoose';
import { User as UserType, Role } from './types';
import { defaultOption, setAggregateDefaultOperations } from '../config';

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: Object.values(Role), default: Role.GUEST },
  sessions: {
    type: [{
      sessionId: String,
      createdAt: { type: Date, default: Date.now },
      expiresAt: Date,
      lastUsed: { type: Date, default: Date.now },
      os: String,
      browser: String,
      device: String,
      ip: String,
      location: String
    }],
    default: []
  },
  passkeys: {
    type: [{
      id: String,
      name: String,
      createdAt: { type: Date, default: Date.now },
      publicKey: Buffer,
      counter: Number,
      transports: [String]
    }],
    default: []
  },
  pinnedBoards: {
    type: [{ type: Schema.Types.ObjectId, ref: 'Board' }],
    default: []
  },
  boardUsage: {
    type: Map,
    of: Number,
    default: {}
  },
  passkeyPromptDismissed: { type: Boolean, default: false }
}, defaultOption);

setAggregateDefaultOperations(UserSchema)

export default mongoose.model<UserType & Document>('User', UserSchema);
