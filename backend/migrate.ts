import mongoose from 'mongoose';
import { PrismaClient } from '@prisma/client';
import "dotenv/config"
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const MONGO_URL = process.env.MONGO_URL || "mongodb://mongo:27017/splitify";
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://splitify:splitify_password@postgres:5432/splitify";

// --- Mongoose Schemas ---
const EnvSchema = new mongoose.Schema({ key: String, value: String }, { collection: 'envs' });
const UserSchema = new mongoose.Schema({ username: String, password: String, role: String, passkeyPromptDismissed: Boolean, sessions: [Object], passkeys: [Object] }, { collection: 'users' });
const BoardSchema = new mongoose.Schema({ name: String, isPublic: Boolean, creatorId: mongoose.Schema.Types.ObjectId }, { collection: 'boards' });
const BoardAccessSchema = new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId, boardId: mongoose.Schema.Types.ObjectId, permission: String }, { collection: 'boardaccesses' });
const CategorySchema = new mongoose.Schema({ boardId: mongoose.Schema.Types.ObjectId, name: String, order: Number }, { collection: 'categories' });
const ProductSchema = new mongoose.Schema({ boardId: mongoose.Schema.Types.ObjectId, name: String, price: Number, categories: [mongoose.Schema.Types.ObjectId] }, { collection: 'products' });
const MemberSchema = new mongoose.Schema({ boardId: mongoose.Schema.Types.ObjectId, name: String, paid: Number, categories: [mongoose.Schema.Types.ObjectId] }, { collection: 'members' });
const TransactionSchema = new mongoose.Schema({ boardId: mongoose.Schema.Types.ObjectId, amount: Number, description: String, timestamp: Date, cancelled: Boolean, fromMemberId: mongoose.Schema.Types.ObjectId, toMemberId: mongoose.Schema.Types.ObjectId, productId: mongoose.Schema.Types.ObjectId }, { collection: 'transactions' });

const EnvMongo = mongoose.model('Env', EnvSchema);
const UserMongo = mongoose.model('User', UserSchema);
const BoardMongo = mongoose.model('Board', BoardSchema);
const BoardAccessMongo = mongoose.model('BoardAccess', BoardAccessSchema);
const CategoryMongo = mongoose.model('Category', CategorySchema);
const ProductMongo = mongoose.model('Product', ProductSchema);
const MemberMongo = mongoose.model('Member', MemberSchema);
const TransactionMongo = mongoose.model('Transaction', TransactionSchema);

// --- Prisma setup ---
const pool = new Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['info', 'warn', 'error'] });

async function main() {
  console.log('Connecting to MongoDB...', MONGO_URL);
  await mongoose.connect(MONGO_URL, { family: 4 });
  console.log('Connected to MongoDB.');

  console.log('Connecting to PostgreSQL...', DATABASE_URL);
  await prisma.$connect();
  console.log('Connected to PostgreSQL.');

  console.log('--- Migrating Env ---');
  const envs = await EnvMongo.find();
  for (const env of envs) {
    if (!env.key) continue;
    await prisma.env.upsert({
      where: { key: env.key },
      update: { value: env.value || '' },
      create: { key: env.key, value: env.value || '' }
    });
  }
  console.log(`Migrated ${envs.length} env vars.`);

  console.log('--- Migrating Users ---');
  const users = await UserMongo.find();
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user._id.toString() },
      update: {},
      create: {
        id: user._id.toString(),
        username: user.username || '',
        password: user.password || '',
        role: user.role || 'guest',
        passkeyPromptDismissed: user.passkeyPromptDismissed || false,
        sessions: {
          create: (user.sessions || []).map((s: any) => ({
            sessionId: s.sessionId || new mongoose.Types.ObjectId().toString(),
            createdAt: s.createdAt || new Date(),
            expiresAt: s.expiresAt || new Date(Date.now() + 86400000),
            lastUsed: s.lastUsed || new Date(),
            os: s.os,
            browser: s.browser,
            device: s.device,
            ip: s.ip,
            location: s.location
          }))
        },
        passkeys: {
          create: (user.passkeys || []).map((p: any) => ({
            id: p.id || new mongoose.Types.ObjectId().toString(),
            name: p.name,
            createdAt: p.createdAt || new Date(),
            publicKey: p.publicKey ? Buffer.from(p.publicKey) : Buffer.from([]),
            counter: p.counter || 0,
            transports: p.transports || []
          }))
        }
      }
    });
  }
  console.log(`Migrated ${users.length} users.`);

  console.log('--- Migrating Boards ---');
  const boards = await BoardMongo.find();
  for (const board of boards) {
    await prisma.board.upsert({
      where: { id: board._id.toString() },
      update: {},
      create: {
        id: board._id.toString(),
        name: board.name || '',
        isPublic: board.isPublic || false,
        creatorId: board.creatorId?.toString() || ''
      }
    });
  }
  console.log(`Migrated ${boards.length} boards.`);

  console.log('--- Migrating Board Accesses ---');
  const accesses = await BoardAccessMongo.find();
  for (const acc of accesses) {
    try {
        if (!acc.userId || !acc.boardId) continue;
        await prisma.boardAccess.upsert({
        where: {
            userId_boardId: {
            userId: acc.userId.toString(),
            boardId: acc.boardId.toString()
            }
        },
        update: { permission: acc.permission || 'viewer' },
        create: {
            id: acc._id.toString(),
            userId: acc.userId.toString(),
            boardId: acc.boardId.toString(),
            permission: acc.permission || 'viewer'
        }
        });
    } catch(e) {
        console.error("Skipped access due to missing user/board", acc.userId, acc.boardId)
    }
  }
  console.log(`Migrated ${accesses.length} board accesses.`);

  console.log('--- Migrating Categories ---');
  const validBoards = new Set((await prisma.board.findMany({ select: { id: true } })).map(b => b.id));
  const categories = await CategoryMongo.find();
  for (const cat of categories) {
    try {
        if (!cat.boardId || !validBoards.has(cat.boardId.toString())) continue;
        await prisma.category.upsert({
        where: { id: cat._id.toString() },
        update: {},
        create: {
            id: cat._id.toString(),
            boardId: cat.boardId.toString(),
            name: cat.name || '',
            order: cat.order || 0
        }
        });
    } catch(e) {}
  }
  console.log(`Migrated ${categories.length} categories.`);

  console.log('--- Migrating Products ---');
  const validCategories = new Set((await prisma.category.findMany({ select: { id: true } })).map(c => c.id));
  const products = await ProductMongo.find();
  for (const prod of products) {
    try {
        if (!prod.boardId || !validBoards.has(prod.boardId.toString())) continue;
        const catIds = (prod.categories || []).map((c: any) => c.toString()).filter((id: string) => validCategories.has(id));
        await prisma.product.upsert({
        where: { id: prod._id.toString() },
        update: {},
        create: {
            id: prod._id.toString(),
            boardId: prod.boardId.toString(),
            name: prod.name || '',
            price: prod.price || 0,
            categories: {
            create: catIds.map((catId: string) => ({
                category: { connect: { id: catId } }
            }))
            }
        }
        });
    } catch(e) {}
  }
  console.log(`Migrated ${products.length} products.`);

  console.log('--- Migrating Members ---');
  const members = await MemberMongo.find();
  for (const mem of members) {
    try {
        if (!mem.boardId || !validBoards.has(mem.boardId.toString())) continue;
        const catIds = (mem.categories || []).map((c: any) => c.toString()).filter((id: string) => validCategories.has(id));
        await prisma.member.upsert({
        where: { id: mem._id.toString() },
        update: {},
        create: {
            id: mem._id.toString(),
            boardId: mem.boardId.toString(),
            name: mem.name || '',
            paid: mem.paid || 0,
            categories: {
            create: catIds.map((catId: string) => ({
                category: { connect: { id: catId } }
            }))
            }
        }
        });
    } catch(e) {}
  }
  console.log(`Migrated ${members.length} members.`);

  console.log('--- Migrating Transactions ---');
  const validProducts = new Set((await prisma.product.findMany({ select: { id: true } })).map(p => p.id));
  const validMembers = new Set((await prisma.member.findMany({ select: { id: true } })).map(m => m.id));
  const transactions = await TransactionMongo.find();
  for (const tx of transactions) {
    try {
        if (!tx.boardId || !validBoards.has(tx.boardId.toString())) continue;
        const fromId = tx.fromMemberId ? tx.fromMemberId.toString() : null;
        const toId = tx.toMemberId ? tx.toMemberId.toString() : null;
        const prodId = tx.productId ? tx.productId.toString() : null;

        await prisma.transaction.upsert({
        where: { id: tx._id.toString() },
        update: {},
        create: {
            id: tx._id.toString(),
            boardId: tx.boardId.toString(),
            amount: tx.amount || 0,
            description: tx.description || '',
            timestamp: tx.timestamp || new Date(),
            cancelled: tx.cancelled || false,
            fromMemberId: fromId && validMembers.has(fromId) ? fromId : null,
            toMemberId: toId && validMembers.has(toId) ? toId : null,
            productId: prodId && validProducts.has(prodId) ? prodId : null
        }
        });
    } catch(e) {}
  }
  console.log(`Migrated ${transactions.length} transactions.`);

  console.log('Migration complete!');
  await mongoose.disconnect();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
