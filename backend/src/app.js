require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { initSocket } = require('./config/socket');

const authRoutes = require('./modules/auth/routes');
const userRoutes = require('./modules/users/routes');
const areaRoutes = require('./modules/areas/routes');
const documentRoutes = require('./modules/documents/routes');
const legislativeRoutes = require('./modules/legislative/routes');
const chatRoutes = require('./modules/chat/routes');
const surveyRoutes = require('./modules/surveys/routes');
const territoryRoutes = require('./modules/territories/routes');
const dashboardRoutes = require('./modules/dashboard/routes');
const intelligenceRoutes = require('./modules/intelligence/routes');

const app = express();
const httpServer = http.createServer(app);

// Init Socket.io
initSocket(httpServer);

// Security & parsing
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many requests' } }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 200 }));

// Static uploads
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/areas', areaRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/legislative', legislativeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/territories', territoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/intelligence', intelligenceRoutes);

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'Orbis API', version: '1.0.0' }));

// 404
app.use((req, res) => res.status(404).json({ error: `Route ${req.path} not found` }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (max 50MB)' });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`\n🌐 Orbis API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;
