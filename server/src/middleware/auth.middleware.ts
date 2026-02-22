import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { UnauthorizedError } from '../utils/AppError';
import { UsersRepository } from '../db/repositories';

// Extender Express Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Authentication middleware — verifica JWT y que el usuario sigue activo.
 *
 * Pasos:
 * 1. Extrae el token del header Authorization (Bearer <token>)
 * 2. Verifica la firma y expiración del JWT
 * 3. Consulta la DB para confirmar que la cuenta sigue activa
 *    (importante: un usuario desactivado por el admin no puede seguir usando la app
 *     aunque su token todavía no haya expirado)
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid authorization format. Use: Bearer <token>');
    }

    const token = authHeader.substring(7);

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // 1. Verificar firma y expiración del JWT
    const payload = verifyToken(token);

    // 2. FIX-07: Verificar que el usuario sigue existiendo y activo en DB
    //    Esto invalida tokens de usuarios desactivados por el admin sin esperar
    //    a que el JWT expire por sí solo (máx 7 días).
    const user = await UsersRepository.getById(payload.userId);

    if (!user) {
      throw new UnauthorizedError('User account not found');
    }

    if (user.active !== 1) {
      throw new UnauthorizedError('Your account has been deactivated. Please contact an administrator.');
    }

    // 3. Adjuntar payload al request para uso en handlers
    req.user = payload;

    next();
  } catch (error: any) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError(error.message || 'Authentication failed'));
    }
  }
};

/**
 * Optional auth middleware — no falla si no hay token.
 * Útil para endpoints que tienen comportamiento diferente si el usuario está logueado.
 */
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      // También verificar estado activo en optional auth
      const user = await UsersRepository.getById(payload.userId);
      if (user && user.active === 1) {
        req.user = payload;
      }
    }

    next();
  } catch {
    // Silently fail — user remains undefined
    next();
  }
};
