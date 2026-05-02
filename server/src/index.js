require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const logger = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');
const jwt = require('jsonwebtoken');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true },
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(compression());
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './src/uploads')));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use('/api', limiter);

// Routes
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api/users', require('./modules/users/users.routes'));
app.use('/api/areas', require('./modules/areas/areas.routes'));
app.use('/api/documents', require('./modules/documents/documents.routes'));
app.use('/api/legislative', require('./modules/legislative/legislative.routes'));
app.use('/api/chat', require('./modules/chat/chat.routes'));
app.use('/api/surveys', require('./modules/surveys/surveys.routes'));
app.use('/api/territories', require('./modules/territories/territories.routes'));
app.use('/api/dashboard', require('./modules/dashboard/dashboard.routes'));
app.use('/api/intelligence', require('./modules/intelligence/intelligence.routes'));
app.use('/api/coordinators', require('./modules/coordinators/coordinators.routes'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0', service: 'Orbis API' }));

// Socket.io auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('No token'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.userId;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id} user: ${socket.userId}`);

  socket.on('join:channel', (channelId) => socket.join(`channel:${channelId}`));
  socket.on('leave:channel', (channelId) => socket.leave(`channel:${channelId}`));
  socket.on('join:expediente', (expId) => socket.join(`expediente:${expId}`));
  socket.on('leave:expediente', (expId) => socket.leave(`expediente:${expId}`));

  socket.on('message:send', async (data) => {
    const { channelId, expedienteId, content } = data;
    const prisma = require('./config/database');
    try {
      const message = await prisma.message.create({
        data: { content, senderId: socket.userId, channelId: channelId || null, expedienteId: expedienteId || null },
        include: { sender: { select: { id: true, name: true, avatar: true } } },
      });
      const room = channelId ? `channel:${channelId}` : `expediente:${expedienteId}`;
      io.to(room).emit('message:new', message);
    } catch (e) {
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('typing:start', (data) => {
    const room = data.channelId ? `channel:${data.channelId}` : `expediente:${data.expedienteId}`;
    socket.to(room).emit('typing:update', { userId: socket.userId, isTyping: true });
  });

  socket.on('typing:stop', (data) => {
    const room = data.channelId ? `channel:${data.channelId}` : `expediente:${data.expedienteId}`;
    socket.to(room).emit('typing:update', { userId: socket.userId, isTyping: false });
  });

  socket.on('disconnect', () => logger.info(`Socket disconnected: ${socket.id}`));
});

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => logger.info(`Orbis server running on port ${PORT}`));

module.exports = { app, io };
