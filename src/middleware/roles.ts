import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

export const requireRole = (allowedRoles: ('ADMIN' | 'AGENT' | 'CUSTOMER')[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(['ADMIN']);
export const requireAgent = requireRole(['ADMIN', 'AGENT']);
export const requireAgentOrAdmin = requireRole(['ADMIN', 'AGENT']);
