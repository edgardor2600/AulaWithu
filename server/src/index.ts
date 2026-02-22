import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import helmet from 'helmet';
import { setupWebSocketServer } from './websocket/yjs-server';
import http from 'http';
import adminRoutes from './api/admin.routes';
import authRoutes from './api/auth.routes';
import classesRoutes from './api/classes.routes';
import slidesRoutes from './api/slides.routes';
import sessionsRoutes from './api/sessions.routes';
import uploadsRoutes from './api/uploads.routes';
import snapshotsRoutes from './api/snapshots.routes';
import usersRoutes from './api/users.routes';
import messagesRoutes from './api/messages.routes';
import groupsRoutes from './api/groups.routes';
import topicsRoutes from './api/topics.routes';
import { errorHandler } from './middleware/error.middleware';
import { generalLimiter, authLimiter } from './middleware/rate-limit.middleware';
import { testConnection } from './db/database';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const YJS_PORT = process.env.YJS_PORT || 1234;
const isProd = process.env.NODE_ENV === 'production';

// ============================================================
// FIX-04: HELMET — Headers HTTP de seguridad
// ============================================================
app.use(helmet({
  // Necesario para que /uploads pueda servir imágenes entre orígenes
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // Desactivar CSP por ahora — el canvas y Yjs necesitan configuración especial
  // Activar y configurar en el futuro cuando se estabilice el frontend
  contentSecurityPolicy: false,
}));

// ============================================================
// FIX-05: CORS — Solo orígenes permitidos explícitamente
// ============================================================
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin: herramientas como Postman (desarrollo)
    // En producción esto podría restringirse más, por ahora lo dejamos
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error(`CORS: Origin '${origin}' not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ============================================================
// BODY PARSERS — SIEMPRE antes del rate limiting específico por ruta
// El orden correcto es: helmet → cors → body parsers → rate limit → rutas
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================================
// FIX-06: RATE LIMITING — Después del body parser para que funcione bien
// skipSuccessfulRequests necesita el body parseado para evaluar la respuesta
// ============================================================
app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ============================================================
// ARCHIVOS ESTÁTICOS — /uploads con CORS restringido
// ============================================================
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');

app.use('/uploads', (req, res, next) => {
  const origin = req.headers.origin;
  // Solo agregar el header si el origen está permitido (o no hay origen)
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET');
  next();
}, express.static(uploadsDir));

// ============================================================
// API ROUTES
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/classes', groupsRoutes);
app.use('/api', groupsRoutes);
app.use('/api', topicsRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/slides', slidesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/snapshots', snapshotsRoutes);
app.use('/api/admin', adminRoutes);

// ============================================================
// FIX-08: RUTAS DE TEST — Solo en desarrollo
// ============================================================
if (!isProd) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  app.use('/api/test', require('./api/test.routes').default);
  logger.warn('Test routes enabled — disable in production (NODE_ENV=production)');
}

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// ERROR HANDLER (siempre al final)
// ============================================================
app.use(errorHandler);

// ============================================================
// INICIO DEL SERVIDOR
// ============================================================
const server = http.createServer(app);

server.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT} [${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}]`);
  await testConnection();
});

// Setup Yjs WebSocket
setupWebSocketServer(Number(YJS_PORT));
