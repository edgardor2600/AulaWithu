import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';

// y-websocket no tiene tipos completos en todas las versiones
const yjsUtils = require('y-websocket/bin/utils') as {
  setupWSConnection: (ws: any, req: any, options?: any) => void;
};
const { setupWSConnection } = yjsUtils;

/**
 * Setup del servidor WebSocket de Yjs con autenticación JWT.
 *
 * IMPORTANTE: El cliente debe pasar el token en el query string:
 *   ws://localhost:1234?token=<JWT>
 *
 * Códigos de cierre usados:
 *   4001 — No autenticado (sin token o token inválido)
 *   4002 — Token expirado
 */
export const setupWebSocketServer = (port: number) => {
  const wss = new WebSocketServer({ port });

  wss.on('connection', (ws: WebSocket, req: any) => {
    try {
      // Parsear la URL del WebSocket para extraer el token del query string
      const requestUrl = new URL(req.url, `ws://localhost:${port}`);
      const token = requestUrl.searchParams.get('token');

      if (!token) {
        logger.warn('[YJS-WS] Connection rejected — no token provided');
        ws.close(4001, 'Authentication required. Pass token as query param: ?token=<JWT>');
        return;
      }

      // Verificar el JWT
      const payload = verifyToken(token);

      // Adjuntar el usuario al request para que Yjs lo use si lo necesita
      req.user = payload;

      logger.debug('[YJS-WS] Client connected', {
        userId: payload.userId,
        role: payload.role,
      });

      // Delegar el manejo de la conexión a y-websocket
      setupWSConnection(ws, req);

      ws.on('close', () => {
        logger.debug('[YJS-WS] Client disconnected', { userId: payload.userId });
      });

    } catch (error: any) {
      const isExpired = error.message?.includes('expired') || error.name === 'TokenExpiredError';

      if (isExpired) {
        logger.warn('[YJS-WS] Connection rejected — token expired');
        ws.close(4002, 'Token expired. Please login again.');
      } else {
        logger.warn('[YJS-WS] Connection rejected — invalid token:', error.message);
        ws.close(4001, 'Invalid token');
      }
    }
  });

  wss.on('error', (error) => {
    logger.error('[YJS-WS] Server error:', error.message);
  });

  logger.info(`Yjs WebSocket server running on port ${port} (JWT authentication enabled)`);
};
