/**
 * Logger utility
 *
 * Centralizamos todos los logs aquí para poder:
 * 1. Silenciar logs de debug en producción fácilmente.
 * 2. Nunca loggear datos sensibles (passwords, body completo) en producción.
 * 3. Tener un formato consistente en todos los mensajes.
 *
 * En el futuro se puede reemplazar por pino/winston sin tocar el resto del código.
 */

const isProd = process.env.NODE_ENV === 'production';

const timestamp = () => new Date().toISOString();

export const logger = {
  /**
   * Información general del servidor (siempre visible)
   */
  info: (message: string, ...args: any[]) => {
    console.log(`[${timestamp()}] [INFO]  ${message}`, ...args);
  },

  /**
   * Advertencias (siempre visible)
   */
  warn: (message: string, ...args: any[]) => {
    console.warn(`[${timestamp()}] [WARN]  ${message}`, ...args);
  },

  /**
   * Errores (siempre visible, NUNCA incluir contraseñas o tokens)
   */
  error: (message: string, ...args: any[]) => {
    console.error(`[${timestamp()}] [ERROR] ${message}`, ...args);
  },

  /**
   * Debug — SOLO visible en desarrollo.
   * Úsalo para trazas de código durante el desarrollo.
   * Nunca pasar req.body completo aquí.
   */
  debug: (message: string, data?: Record<string, any>) => {
    if (!isProd) {
      console.log(`[${timestamp()}] [DEBUG] ${message}`, data ?? '');
    }
  },

  /**
   * Acceso HTTP — para loggear requests entrantes (solo en prod con info mínima)
   */
  http: (method: string, url: string, status: number, userId?: string) => {
    const userTag = userId ? ` user=${userId}` : '';
    console.log(`[${timestamp()}] [HTTP]  ${method} ${url} → ${status}${userTag}`);
  },
};
