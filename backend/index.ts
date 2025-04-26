import express from 'express';
import cors from 'cors';
import { json, urlencoded } from 'body-parser';
import mongoose from 'mongoose';
import http from 'http';
import path from 'path';
import apiRoutes from './routes';
import { initializeSocketIO } from './utils/socket';
import { MONGO_URL, DEBUG, CORS_ALLOW } from './config';
import crypto from 'crypto';
import User from './models/User';
import { Role } from './models/types';
import { hashPassword } from './utils/auth';

const app = express();
const PORT = process.env.PORT || 8080;
const server = http.createServer(app);


app.use(cors({
  origin: CORS_ALLOW || DEBUG ? '*' : false,
  credentials: true
}));
app.use(json());
app.use(urlencoded({ extended: true }));

app.use('/api', apiRoutes);

initializeSocketIO(server).then(() => {
  console.log('Socket.IO initialized');
});


if (!DEBUG) {
  
  app.use(express.static(path.join(__dirname, 'frontend')));

  app.get(/.*/, (req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).send('Not Found');
      return 
    }
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
  });
}


const initAdminUser = async () => {
  try {
    const adminUser = await User.findOne({ role: Role.ADMIN });
    
    if (!adminUser) {
      const DEFAULT_PSW = process.env.DEFAULT_PSW || crypto.randomBytes(16).toString('hex');
      const hashedPassword = await hashPassword(DEFAULT_PSW);
      
      const admin = new User({
        username: 'admin',
        password: hashedPassword,
        role: Role.ADMIN
      });
      
      await admin.save();
      console.log("'admin' Created! Password:", DEFAULT_PSW);
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};


mongoose.connect(MONGO_URL).then(() => {
  console.log('Connected to the database');
  initAdminUser().then(() => {
    server.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
    });
  });
}).catch(err => {
  console.error('Failed to connect to the database:', err);
});

process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Error shutting down:', err);
    process.exit(1);
  }
});
