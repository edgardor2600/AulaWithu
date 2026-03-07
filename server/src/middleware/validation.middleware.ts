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

    // Solo loguear en desarrollo — y nunca exponer campos sensibles
    if (process.env.NODE_ENV !== 'production') {
      const sensitiveFields = ['password', 'oldPassword', 'newPassword', 'passwordHash', 'token'];
      const sanitizedBody = { ...req.body };
      sensitiveFields.forEach(field => {
        if (sanitizedBody[field]) sanitizedBody[field] = '[REDACTED]';
      });
      console.log('❌ Validation failed:', { errors: formattedErrors, body: sanitizedBody });
    }
    
    throw new ValidationError('Validation failed', formattedErrors);
  }
  
  next();
};
