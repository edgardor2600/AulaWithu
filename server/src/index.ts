import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
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
import { testConnection } from './db/database';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

const YJS_PORT = process.env.YJS_PORT || 1234;

// ✅ MEJORADO: CORS configuration to allow image loading from client
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' })); // Increased limit for canvas data
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static files from uploads directory with CORS headers
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
}, express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/classes', groupsRoutes); // Groups routes (includes /classes/:classId/groups)
app.use('/api', groupsRoutes); // Additional groups routes (includes /groups/:groupId)
app.use('/api', topicsRoutes); // Topics routes (includes /classes/:classId/topics and /topics/:topicId)
app.use('/api/classes', classesRoutes);
app.use('/api/slides', slidesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/snapshots', snapshotsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/test', require('./api/test.routes').default);

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Create HTTP server for WebSocket
const server = http.createServer(app);

// Start HTTP server
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Test PostgreSQL connection
  await testConnection();
});

// Setup Yjs WebSocket
setupWebSocketServer(Number(YJS_PORT));

// Error handling middleware (must be last)
app.use(errorHandler);
