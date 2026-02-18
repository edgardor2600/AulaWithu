import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ValidationError } from '../utils/AppError';

// Validation middleware - checks express-validator results
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: (err as any).path || (err as any).param,
      message: err.msg,
    }));
    
    // DEBUG: Log validation errors
    console.log('❌ Validation failed:');
    console.log('  Errors:', formattedErrors);
    console.log('  Request body:', req.body);
    
    throw new ValidationError('Validation failed', formattedErrors);
  }
  
  next();
};
