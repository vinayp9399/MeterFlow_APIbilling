const Api = require('../models/Api');
const ApiKey = require('../models/ApiKey');
const UsageLog = require('../models/UsageLog');
const Billing = require('../models/Billing');
const { v4: uuidv4 } = require('uuid');

// Browse all active APIs available to subscribe to
const browseApis = async (req, res) => {
  try {
    const apis = await Api.find({ isActive: true })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { apis } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Subscribe to an API — generates a key for the consumer
const subscribeToApi = async (req, res) => {
  try {
    const api = await Api.findOne({ _id: req.params.id, isActive: true });
    if (!api) return res.status(404).json({ success: false, message: 'API not found or inactive' });

    const existing = await ApiKey.findOne({ apiId: api._id, userId: req.user._id, status: 'active' });
    if (existing) return res.status(400).json({ success: false, message: 'You already have an active key for this API' });

    const key = `mf_${uuidv4().replace(/-/g, '')}`;
    const apiKey = await ApiKey.create({
      apiId: api._id,
      userId: req.user._id,
      key,
      name: `${req.user.name}'s key`,
    });

    res.status(201).json({ success: true, message: 'Subscribed successfully', data: { apiKey } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get consumer's subscribed APIs (their keys)
const getMySubscriptions = async (req, res) => {
  try {
    const keys = await ApiKey.find({ userId: req.user._id })
      .populate('apiId', 'name baseUrl category description isActive')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { subscriptions: keys } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Consumer's own usage summary
const getMyUsage = async (req, res) => {
  try {
    const totalRequests = await UsageLog.countDocuments({ userId: req.user._id });
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyRequests = await UsageLog.countDocuments({ userId: req.user._id, timestamp: { $gte: thirtyDaysAgo } });
    const errorRequests = await UsageLog.countDocuments({ userId: req.user._id, statusCode: { $gte: 400 } });

    const recentLogs = await UsageLog.find({ userId: req.user._id })
      .populate('apiId', 'name')
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({ success: true, data: { totalRequests, monthlyRequests, errorRequests, recentLogs } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { browseApis, subscribeToApi, getMySubscriptions, getMyUsage };
