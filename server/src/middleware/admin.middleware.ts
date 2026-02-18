import { Request, Response, NextFunction } from 'express';
import { UsersRepository } from '../db/repositories';
import { UnauthorizedError } from '../utils/AppError';

/**
 * Middleware to verify user has admin role
 * Must be used after authMiddleware
 * 
 * Usage:
 * router.post('/admin-endpoint', authMiddleware, adminMiddleware, handler);
 */
export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated (set by authMiddleware)
    if (!(req as any).user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userId = (req as any).user.userId;

    // Get user from database
    const user = await UsersRepository.getById(userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      throw new UnauthorizedError('Administrator access required');
    }

    // Check if user is active
    if (user.active !== 1) {
      throw new UnauthorizedError('Account is inactive');
    }

    // Add full user object to request for use in handlers
    (req as any).adminUser = user;

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(403).json({
        success: false,
        error: {
          message: error.message,
          code: 'FORBIDDEN',
        },
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    });
  }
};
