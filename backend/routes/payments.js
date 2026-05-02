const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentHistory,
  getConfig,
} = require('../controllers/paymentController');

// Webhook must use raw body — register before express.json() parses it
// This is handled by passing raw body check in server.js
router.post('/webhook', handleWebhook);

// Protected routes
router.get('/config', protect, getConfig);
router.post('/create-order', protect, createOrder);
router.post('/verify', protect, verifyPayment);
router.get('/history', protect, getPaymentHistory);

module.exports = router;
