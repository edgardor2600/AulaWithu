import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupWebSocketServer } from './websocket/yjs-server';
import http from 'http';
import adminRoutes from './api/admin.routes';
import authRoutes from './api/auth.routes';
import classesRoutes from './api/classes.routes';
import slidesRoutes from './api/slides.routes';
import { errorHandler } from './middleware/error.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

const YJS_PORT = process.env.YJS_PORT || 1234;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classesRoutes);
app.use('/api/slides', slidesRoutes);
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
