const UsageLog = require('../models/UsageLog');
const ApiKey = require('../models/ApiKey');
const Api = require('../models/Api');

// For providers: show usage across all their APIs (by consumers)
// For consumers: show their own usage
const getFilter = async (user) => {
  if (user.role === 'provider') {
    // Find all APIs owned by this provider
    const providerApis = await Api.find({ userId: user._id }).select('_id');
    const apiIds = providerApis.map(a => a._id);
    return { apiId: { $in: apiIds } };
  }
  // consumer or admin — filter by their own userId
  return { userId: user._id };
};

const getUsageSummary = async (req, res) => {
  try {
    const filter = await getFilter(req.user);

    const totalRequests = await UsageLog.countDocuments(filter);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const monthlyRequests = await UsageLog.countDocuments({ ...filter, timestamp: { $gte: thirtyDaysAgo } });

    const errorRequests = await UsageLog.countDocuments({ ...filter, statusCode: { $gte: 400 } });
    const successRequests = totalRequests - errorRequests;

    const activeKeys = await ApiKey.countDocuments({ userId: req.user._id, status: 'active' });

    res.json({
      success: true,
      data: { totalRequests, monthlyRequests, successRequests, errorRequests, activeKeys },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUsageLogs = async (req, res) => {
  try {
    const { page = 1, limit = 20, apiKeyId, apiId } = req.query;
    const filter = await getFilter(req.user);
    if (apiKeyId) filter.apiKeyId = apiKeyId;
    if (apiId) filter.apiId = apiId;

    const logs = await UsageLog.find(filter)
      .populate('apiId', 'name')
      .populate('apiKeyId', 'name key')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await UsageLog.countDocuments(filter);

    res.json({
      success: true,
      data: {
        logs,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUsageByDay = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const filter = await getFilter(req.user);

    const usageByDay = await UsageLog.aggregate([
      { $match: { ...filter, timestamp: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
          },
          count: { $sum: 1 },
          errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
          avgLatency: { $avg: '$latency' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const formatted = usageByDay.map(item => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
      requests: item.count,
      errors: item.errors,
      avgLatency: Math.round(item.avgLatency || 0),
    }));

    res.json({ success: true, data: { usage: formatted } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getUsageByApi = async (req, res) => {
  try {
    const filter = await getFilter(req.user);

    const usageByApi = await UsageLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$apiId',
          count: { $sum: 1 },
          errors: { $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] } },
          avgLatency: { $avg: '$latency' },
        },
      },
      {
        $lookup: {
          from: 'apis',
          localField: '_id',
          foreignField: '_id',
          as: 'api',
        },
      },
      { $unwind: { path: '$api', preserveNullAndEmpty: true } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const formatted = usageByApi.map(item => ({
      apiId: item._id,
      apiName: item.api?.name || 'Unknown',
      requests: item.count,
      errors: item.errors,
      avgLatency: Math.round(item.avgLatency || 0),
    }));

    res.json({ success: true, data: { usage: formatted } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getUsageSummary, getUsageLogs, getUsageByDay, getUsageByApi };
