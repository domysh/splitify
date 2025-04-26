import { Server, Socket } from 'socket.io';
import { checkLogin } from '../utils/auth';
import { Role, User } from '../models/types';
import { CORS_ALLOW, DEBUG } from '../config';
import { getAuthenticatedBoard } from '.';
import { Document } from 'mongoose';

let io: Server;

export interface SocketUpdateMessage {
  queryKeys: string[];
  message?: string;
}

export interface AuthenticatedSocket extends Socket { user?: User & Document }

export const initializeSocketIO = async (httpServer: any) => {
  io = new Server(httpServer, {
    cors: {
      origin: CORS_ALLOW || DEBUG ? '*' : false,
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/sock',
    transports: ['websocket'],
    pingTimeout: 20000,
    pingInterval: 10000,
  });
  
  
  io.use(async (socket: Socket, next) => {
    const authSocket = socket as AuthenticatedSocket;
    try {
      const token = socket.handshake.auth.token || 
                   socket.handshake.query.token as string || 
                   '';
      
      if (token) {
        const { user } = await checkLogin(token);
        
        if (user) {
          authSocket.user = user;
          if (user.role === Role.ADMIN) {
            authSocket.join('admins')
          }
          authSocket.join(`user:${user.id}`);
          console.log(`Socket ${socket.id} authenticated as user ${user.username} - ${user.id}`);
        }
      }

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next();
    }
  });
  
  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;

    console.log('A user connected', socket.id, authSocket.user?.id ? `(User: ${authSocket.user?.id})` : '(Anonymous)');
    
    
    socket.on('joinBoard', async (boardId: string, callback: Function) => {
      try {
        
        const canAccessBoard = await checkBoardAccess(boardId, authSocket);
        
        if (canAccessBoard) {
          socket.join(`board:${boardId.toLowerCase()}`);
          callback({ boardId, success: true });
        } else {
          callback({ 
            boardId, 
            success: false, 
            error: 'Board doesn\'t exist'
          });
        }
      } catch (error) {
        callback({ 
          boardId, 
          success: false, 
          error: 'Failed to join board' 
        });
      }
    });
    
    
    socket.on('leaveBoard', (boardId: string, callback: Function) => {
      socket.leave(`board:${boardId.toLowerCase()}`);
      callback({ boardId, success: true });
    });

    
    socket.on('client_disconnect', () => {
      console.log(`Client ${socket.id} requested explicit disconnection`);
      socket.disconnect(true);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('A user disconnected', socket.id, 
        authSocket.user?.id ? `(User: ${authSocket.user?.id})` : '(Anonymous)', `Reason: ${reason}`);
    });
  });
  
  return io;
};

async function checkBoardAccess(boardId: string, socket: AuthenticatedSocket): Promise<boolean> {
  try {
    const [board] = await getAuthenticatedBoard(boardId, socket.user?.id); 
    return board ? true : false;
  } catch (error) {
    console.error('Error checking board access:', error);
    return false;
  }
}

export const emitBoardUpdate = (boardId: string, queryKeys: string[] = [], message: string = 'update') => {
  const boardQueryKeys = ['boards', `boards/${boardId}`, ...queryKeys];
  const updateMessage: SocketUpdateMessage = {
    queryKeys: boardQueryKeys,
    message
  };
  io.to(`board:${boardId.toLowerCase()}`).emit('update', updateMessage);
};

export const emitAdminUpdate = (queryKeys: string[] = [], message: string = 'update') => {
  const updateMessage: SocketUpdateMessage = {
    queryKeys,
    message
  };
  io.to('admins').emit('update', updateMessage);
}

export const broadCastUpdate = (queryKeys: string[] = [], message: string = 'update') => {
  const updateMessage: SocketUpdateMessage = {
    queryKeys,
    message
  };
  io.emit('update', updateMessage);
  console.log('Broadcasting update to all clients:', updateMessage);
}

export const emitUserUpdate = (userId: string, queryKeys: string[] = [], message: string = 'update') => {
  const updateMessage: SocketUpdateMessage = {
    queryKeys,
    message
  };
  io.to(`user:${userId}`).emit('update', updateMessage);
  console.log('Sending update to user:', userId, updateMessage);
}

export { io };
