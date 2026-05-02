const Billing = require('../models/Billing');
const UsageLog = require('../models/UsageLog');

const FREE_REQUESTS_PER_MONTH = 50;
const PRICE_PER_100_REQUESTS = 1000; // INR

const calculateBilling = async (userId, month) => {
  const [year, mon] = month.split('-');
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 0, 23, 59, 59);

  const totalRequests = await UsageLog.countDocuments({
    userId,
    timestamp: { $gte: startDate, $lte: endDate },
  });

  const billableRequests = Math.max(0, totalRequests - FREE_REQUESTS_PER_MONTH);
  const amount = parseFloat(((PRICE_PER_100_REQUESTS).toFixed(2)));

  return { totalRequests, freeRequests: FREE_REQUESTS_PER_MONTH, billableRequests, amount };
};

const getCurrentBilling = async (req, res) => {
  try {
    // Only consumers are billed
    if (req.user.role !== 'consumer') {
      return res.status(403).json({ success: false, message: 'Only consumers are billed' });
    }

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const stats = await calculateBilling(req.user._id, month);

    let billing = await Billing.findOne({ userId: req.user._id, month });
    if (!billing) {
      billing = await Billing.create({ userId: req.user._id, month, ...stats });
    } else {
      billing.totalRequests = stats.totalRequests;
      billing.freeRequests = FREE_REQUESTS_PER_MONTH;
      billing.billableRequests = stats.billableRequests;
      billing.amount = stats.amount;
      await billing.save();
    }

    res.json({ success: true, data: { billing } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getBillingHistory = async (req, res) => {
  try {
    if (req.user.role !== 'consumer') {
      return res.status(403).json({ success: false, message: 'Only consumers are billed' });
    }

    const billings = await Billing.find({ userId: req.user._id }).sort({ month: -1 }).limit(12);
    res.json({ success: true, data: { billings } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const markAsPaid = async (req, res) => {
  try {
    const billing = await Billing.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { status: 'paid' },
      { new: true }
    );
    if (!billing) return res.status(404).json({ success: false, message: 'Billing record not found' });
    res.json({ success: true, message: 'Marked as paid', data: { billing } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPricingInfo = async (req, res) => {
  res.json({
    success: true,
    data: {
      pricing: {
        free: {
          name: 'Free',
          requests: FREE_REQUESTS_PER_MONTH,
          price: 0,
          description: `${FREE_REQUESTS_PER_MONTH} requests/month included`,
        },
        pro: {
          name: 'Pro',
          pricePerHundred: PRICE_PER_100_REQUESTS,
          currency: 'INR',
          description: `₹${PRICE_PER_100_REQUESTS} per 100 requests beyond free tier`,
        },
      },
    },
  });
};

module.exports = { getCurrentBilling, getBillingHistory, markAsPaid, getPricingInfo };
