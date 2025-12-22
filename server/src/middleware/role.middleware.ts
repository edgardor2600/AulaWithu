import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../utils/AppError';

// Role-based access control middleware
export const roleMiddleware = (...allowedRoles: ('admin' | 'teacher' | 'student')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if user is authenticated
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role as any)) {
      throw new ForbiddenError(`Access denied. Required role: ${allowedRoles.join(' or ')}`);
    }

    next();
  };
};

// Admin-only middleware (shorthand)
export const adminOnly = roleMiddleware('admin');

// Teacher-only middleware (shorthand)
export const teacherOnly = roleMiddleware('teacher');

// Student-only middleware (shorthand)
export const studentOnly = roleMiddleware('student');

