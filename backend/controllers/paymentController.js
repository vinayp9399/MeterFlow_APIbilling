const Razorpay = require('razorpay');
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Billing = require('../models/Billing');
const User = require('../models/User');

// Minimum billable amount in rupees (Razorpay minimum is ₹1)
const MIN_AMOUNT = 1;

const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// POST /api/payments/create-order
// Creates a Razorpay order for the current month's bill
const createOrder = async (req, res) => {
  try {
    const { billingId } = req.body;

    const billing = await Billing.findOne({ _id: billingId, userId: req.user._id });
    if (req.user.role !== 'consumer') {
      return res.status(403).json({ success: false, message: 'Only consumers are billed' });
    }

    if (!billing) {
      return res.status(404).json({ success: false, message: 'Billing record not found' });
    }

    if (billing.status === 'paid') {
      return res.status(400).json({ success: false, message: 'This bill has already been paid' });
    }

    // --- TEST MODIFICATION START ---
    const testAmountInINR = 1000;
    const amountInPaise = Math.round(testAmountInINR * 100); 

    const razorpay = getRazorpayInstance();

    const order = await razorpay.orders.create({
      amount: amountInPaise, 
      currency: 'INR',
      // Added timestamp to receipt to ensure it is unique for every test run
      receipt: `test_${billing.month}_${Date.now()}`, 
      notes: {
        userId: req.user._id.toString(),
        billingId: billing._id.toString(),
        month: billing.month,
        userEmail: req.user.email,
        mode: "testing"
      },
    });

    // Save payment record
    await Payment.create({
      userId: req.user._id,
      billingId: billing._id,
      razorpayOrderId: order.id,
      amount: amountInPaise,
      amountInRupees: testAmountInINR,
      month: billing.month,
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: amountInPaise,
        currency: 'INR',
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error('Create order error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/payments/verify
const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Missing payment verification fields' });
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
    }

    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found' });
    }

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = 'paid';
    payment.paidAt = new Date();
    await payment.save();

    await Billing.findByIdAndUpdate(payment.billingId, { status: 'paid' });

    res.json({ success: true, message: 'Payment verified successfully', data: { payment } });
  } catch (error) {
    console.error('Verify payment error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/payments/webhook
const handleWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
    }

    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;

    if (event === 'payment.captured') {
      const razorpayOrderId = payload.payment.entity.order_id;
      const razorpayPaymentId = payload.payment.entity.id;

      const payment = await Payment.findOne({ razorpayOrderId });
      if (payment && payment.status !== 'paid') {
        payment.razorpayPaymentId = razorpayPaymentId;
        payment.status = 'paid';
        payment.paidAt = new Date();
        await payment.save();
        await Billing.findByIdAndUpdate(payment.billingId, { status: 'paid' });
      }
    }

    if (event === 'payment.failed') {
      const razorpayOrderId = payload.payment.entity.order_id;
      await Payment.findOneAndUpdate({ razorpayOrderId }, { status: 'failed' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/payments/history
const getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, data: { payments } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/payments/config
const getConfig = async (req, res) => {
  res.json({
    success: true,
    data: {
      keyId: process.env.RAZORPAY_KEY_ID || null,
      configured: !!process.env.RAZORPAY_KEY_ID,
    },
  });
};

module.exports = { createOrder, verifyPayment, handleWebhook, getPaymentHistory, getConfig };