import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'home-school-secret-key-2024';

export interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string; name: string };
}

export function generateToken(user: { id: number; username: string; role: string; name: string }) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string; name: string };
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期' });
  }
}

export function roleGuard(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: '无权访问' });
    }
    next();
  };
}

export { JWT_SECRET };
