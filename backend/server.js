require('dotenv').config();

const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const { initRedis } = require('./config/redis');
const { initBillingQueue, scheduleBillingJob } = require('./jobs/billingJob');

const authRoutes     = require('./routes/auth');
const apiRoutes      = require('./routes/apis');
const usageRoutes    = require('./routes/usage');
const billingRoutes  = require('./routes/billing');
const adminRoutes    = require('./routes/admin');
const consumerRoutes = require('./routes/consumer');
const paymentRoutes  = require('./routes/payments');
const { proxyRequest } = require('./controllers/gatewayController');

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim());

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});
app.set('io', io);

app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/auth',     authRoutes);
app.use('/api/apis',     apiRoutes);
app.use('/api/usage',    usageRoutes);
app.use('/api/billing',  billingRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/consumer', consumerRoutes);
app.use('/api/payments', paymentRoutes);

// Health check — before gateway so it doesn't get proxied
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Gateway — use app.use with proxyRequest directly
// This is the most compatible way across all hosting platforms
// req.originalUrl will always contain the full path including /gateway
app.use('/gateway', proxyRequest);

// 404
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

io.on('connection', (socket) => {
  socket.on('join-dashboard', (userId) => socket.join(`user-${userId}`));
  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  initRedis();
  await initBillingQueue();
  await scheduleBillingJob();

  server.listen(PORT, () => {
    console.log(`🚀 MeterFlow running on port ${PORT}`);
    console.log(`🌍 Allowed origins: ${allowedOrigins.join(', ')}`);
  });
};

startServer();
