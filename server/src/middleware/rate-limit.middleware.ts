import rateLimit from 'express-rate-limit';

/**
 * Rate limiting middleware
 * Protege la API contra ataques de fuerza bruta y abuso de recursos.
 *
 * En desarrollo (NODE_ENV !== 'production'), los límites son mucho más altos
 * para no interferir con el testing manual.
 */

const isProd = process.env.NODE_ENV === 'production';

/**
 * Límite general para toda la API.
 * 300 requests por 15 minutos en producción, 2000 en desarrollo.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isProd ? 300 : 2000,
  standardHeaders: true,  // Incluir headers RateLimit-* en la respuesta
  legacyHeaders: false,   // No incluir headers X-RateLimit-* deprecados
  message: {
    error: {
      message: 'Too many requests, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  skip: () => !isProd && process.env.DISABLE_RATE_LIMIT === 'true',
});

/**
 * Límite estricto para autenticación — anti brute-force.
 * Solo 10 intentos por IP cada 15 minutos en producción.
 * Los intentos exitosos NO cuentan contra el límite.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isProd ? 10 : 100,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many login attempts. Please wait 15 minutes before trying again.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
});

/**
 * Límite para uploads — evita llenar el disco.
 * 30 uploads por hora en producción.
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: isProd ? 30 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many file uploads. Please wait before uploading more files.',
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
    },
  },
});
