require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const { initBillingQueue, scheduleBillingJob } = require('./jobs/billingJob');

// Routes
const authRoutes = require('./routes/auth');
const apiRoutes = require('./routes/apis');
const gatewayRoutes = require('./routes/gateway');
const usageRoutes = require('./routes/usage');
const billingRoutes = require('./routes/billing');
const adminRoutes = require('./routes/admin');
const consumerRoutes = require('./routes/consumer');
const paymentRoutes = require('./routes/payments');

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});
app.set('io', io);

// Raw body needed for Razorpay webhook signature verification
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Standard middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/apis', apiRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/consumer', consumerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/gateway', gatewayRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'MeterFlow API' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Socket.io events
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('join-dashboard', (userId) => {
    socket.join(`user-${userId}`);
  });
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await initBillingQueue();
  await scheduleBillingJob();

  server.listen(PORT, () => {
    console.log(`MeterFlow server running on http://localhost:${PORT}`);
    console.log(`Gateway endpoint: http://localhost:${PORT}/gateway`);
    console.log(`Payments: http://localhost:${PORT}/api/payments`);
  });
};

startServer();
