const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');

const authRoutes = require('./routes/authRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const historyRoutes = require('./routes/historyRoutes');
const esp32Routes = require('./routes/esp32Routes');
const auditRoutes = require('./routes/auditRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allow loading Bootstrap, Google Fonts, and inline scripts
}));
app.use(cors({
  origin: env.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('dev'));

// Rate Limiting for Auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 login/register attempts per 15 minutes
  message: { success: false, message: 'มีการพยายามเข้าสู่ระบบมากเกินไป โปรดลองใหม่อีกครั้งในภายหลัง' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Rate Limiting for ESP32 Device API (heartbeat every 2s = 30 req/min, allow generous headroom)
const esp32Limiter = rateLimit({
  windowMs: 2 * 60 * 1000,   // 2-minute window
  max: 120,                   // 120 requests per 2 min = 1 req/sec max (heartbeat is ~1/2s)
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limit for intake and schedule (infrequent)
    return req.path === '/intake' || req.path === '/schedule' || req.path === '/firmware/check';
  },
  message: { success: false, message: 'Device heartbeat rate exceeded. Please slow down request frequency.' }
});
app.use('/api/esp32', esp32Limiter);

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Files & Static Frontend
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/esp32', esp32Routes);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'IoT Medication Reminder System',
    timestamp: new Date().toISOString()
  });
});

// 404 & Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
