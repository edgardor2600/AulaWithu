import { WebSocketServer, WebSocket } from 'ws';
import { URL } from 'url';
import type { IncomingMessage } from 'http';
import { verifyToken } from '../utils/jwt';
import { logger } from '../utils/logger';

// y-websocket does not ship official TypeScript types for bin/utils.
// Using require() with an inline type cast is the correct pattern for
// CommonJS + ts-node when @types/y-websocket does not exist.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { setupWSConnection } = require('y-websocket/bin/utils') as {
  setupWSConnection: (
    ws: WebSocket,
    req: IncomingMessage,
    options?: { docName?: string; gc?: boolean }
  ) => void;
};

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

  // Map to track active connections per room and user: key = `${docName}:${userId}`
  const activeUserConnections = new Map<string, WebSocket>();

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

      const docName = req.url ? req.url.slice(1).split('?')[0] : 'default';
      const userConnectionKey = `${docName}:${payload.userId}`;

      // Si ya existe una conexión previa activa de este mismo usuario en esta misma sala,
      // la cerramos de forma limpia para evitar sockets zombies o duplicados en Awareness.
      const existingWs = activeUserConnections.get(userConnectionKey);
      if (
        existingWs &&
        existingWs !== ws &&
        (existingWs.readyState === WebSocket.OPEN || existingWs.readyState === WebSocket.CONNECTING)
      ) {
        logger.info(`[YJS-WS] Closing superceded connection for user ${payload.userId} in room ${docName}`);
        try {
          existingWs.close(1000, 'Replaced by new connection');
        } catch (e: any) {
          logger.warn(`[YJS-WS] Error closing previous socket: ${e.message}`);
        }
      }

      activeUserConnections.set(userConnectionKey, ws);

      logger.debug('[YJS-WS] Client connected', {
        userId: payload.userId,
        role: payload.role,
        docName,
      });

      // Delegar el manejo de la conexión a y-websocket
      setupWSConnection(ws, req);

      ws.on('close', () => {
        logger.debug('[YJS-WS] Client disconnected', { userId: payload.userId, docName });
        if (activeUserConnections.get(userConnectionKey) === ws) {
          activeUserConnections.delete(userConnectionKey);
        }
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
