import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { JWTService } from '../utils/jwt';

const jwtService = new JWTService();

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  // Handle mock tokens for development
  if (token.startsWith('mock_token_')) {
    const userId = token.replace('mock_token_', '');
    req.user = {
      id: userId,
      userId: userId,
      email: 'admin@priyo.com',
      username: 'admin',
      role: 'USER',
      visitorId: null,
    };
    next();
    return;
  }

  const payload = jwtService.verifyAccessToken(token);
  if (!payload) {
    res.status(403).json({ error: 'Invalid or expired access token' });
    return;
  }

  req.user = {
    id: payload.userId,
    userId: payload.userId,
    email: payload.email,
    username: payload.username,
    role: payload.role,
    visitorId: (payload as any).visitorId,
  };

  next();
};
