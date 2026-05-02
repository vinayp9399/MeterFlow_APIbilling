const User = require('../models/User');
const Api = require('../models/Api');
const UsageLog = require('../models/UsageLog');
const Billing = require('../models/Billing');
const ApiKey = require('../models/ApiKey');

const getPlatformStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalApis = await Api.countDocuments();
    const totalRequests = await UsageLog.countDocuments();
    const totalKeys = await ApiKey.countDocuments();

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyRequests = await UsageLog.countDocuments({ timestamp: { $gte: thirtyDaysAgo } });

    // Total revenue across all billings
    const revenueResult = await Billing.aggregate([
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: { totalUsers, totalApis, totalRequests, totalKeys, monthlyRequests, totalRevenue, usersByRole },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const users = await User.find()
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await User.countDocuments();
    res.json({ success: true, data: { users, total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllApis = async (req, res) => {
  try {
    const apis = await Api.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { apis } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const toggleApiStatus = async (req, res) => {
  try {
    const api = await Api.findById(req.params.id);
    if (!api) return res.status(404).json({ success: false, message: 'API not found' });
    api.isActive = !api.isActive;
    await api.save();
    res.json({ success: true, message: `API ${api.isActive ? 'activated' : 'deactivated'}`, data: { api } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPlatformUsageByDay = async (req, res) => {
  try {
    const { days = 14 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const usage = await UsageLog.aggregate([
      { $match: { timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: { year: { $year: '$timestamp' }, month: { $month: '$timestamp' }, day: { $dayOfMonth: '$timestamp' } },
          count: { $sum: 1 },
          errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);
    const formatted = usage.map(item => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      requests: item.count,
      errors: item.errors,
    }));
    res.json({ success: true, data: { usage: formatted } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getPlatformStats, getAllUsers, getAllApis, toggleApiStatus, getPlatformUsageByDay };
