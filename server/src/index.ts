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
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

const YJS_PORT = process.env.YJS_PORT || 1234;

app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
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
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Setup Yjs WebSocket
setupWebSocketServer(Number(YJS_PORT));

// Error handling middleware (must be last)
app.use(errorHandler);
