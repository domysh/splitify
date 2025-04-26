import { Response, NextFunction } from 'express';
import { AuthRequest, Role } from '../models/types';
import { checkLogin } from '../utils/auth';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required' });
    return
  }
  next();
};

export const requestUserInfo = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { user, token } = await checkLogin(req);
  req.user = user;
  req.token = token;
  next();
}

export const hasRole = (targetRole?: Role) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
      if (
        !targetRole ||
        (req.user &&
          (
            req.user.role === Role.ADMIN ||
            req.user.role === targetRole
          )
        )
      ){
        next();
        return;
      }
  
      res.status(401).json({
          message: 'Could not validate credentials'
        });
      return 
    };
  };
