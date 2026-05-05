const fetch = require('node-fetch');
const ApiKey = require('../models/ApiKey');
const Api = require('../models/Api');
const User = require('../models/User');
const UsageLog = require('../models/UsageLog');
const Billing = require('../models/Billing');
const getRedisClient = require('../config/redis');
const { isRedisAvailable } = require('../config/redis');

const FREE_REQUESTS_PER_MONTH = 50;
const PRICE_PER_100_REQUESTS = 0.5;

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const checkAndUpsertBilling = async (userId) => {
  const month = getCurrentMonth();
  const [year, mon] = month.split('-');
  const startDate = new Date(year, mon - 1, 1);
  const endDate = new Date(year, mon, 0, 23, 59, 59);

  const totalRequests = await UsageLog.countDocuments({
    userId,
    timestamp: { $gte: startDate, $lte: endDate },
  });

  // Still within free tier — allow
  if (totalRequests < FREE_REQUESTS_PER_MONTH) {
    return { allowed: true, totalRequests };
  }

  const billableRequests = totalRequests - FREE_REQUESTS_PER_MONTH;
  const amount = parseFloat(((billableRequests / 100) * PRICE_PER_100_REQUESTS).toFixed(2));

  // Upsert billing record so payment controller can find it
  const billing = await Billing.findOneAndUpdate(
    { userId, month },
    {
      $set: { totalRequests, freeRequests: FREE_REQUESTS_PER_MONTH, billableRequests, amount },
      $setOnInsert: { status: 'pending' },
    },
    { upsert: true, new: true }
  );

  // Already paid — allow through
  if (billing.status === 'paid') {
    return { allowed: true, totalRequests };
  }

  return {
    allowed: false,
    totalRequests,
    freeRequests: FREE_REQUESTS_PER_MONTH,
    billableRequests,
    amount,
    month,
    billingId: billing._id,
  };
};

const proxyRequest = async (req, res) => {
  const startTime = Date.now();
  const apiKeyValue = req.headers['x-api-key'];

  if (!apiKeyValue) {
    return res.status(401).json({
      success: false,
      message: 'API key is required. Pass it as X-API-Key header.',
    });
  }

  try {
    // Validate API key
    const apiKey = await ApiKey.findOne({ key: apiKeyValue, status: 'active' }).populate('apiId');
    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'Invalid or revoked API key' });
    }

    const api = apiKey.apiId;
    if (!api || !api.isActive) {
      return res.status(404).json({ success: false, message: 'API not found or inactive' });
    }

    // Check billing for consumers only
    const user = await User.findById(apiKey.userId);
    if (user && user.role === 'consumer') {
      const billingCheck = await checkAndUpsertBilling(apiKey.userId);
      if (!billingCheck.allowed) {
        return res.status(402).json({
          success: false,
          code: 'PAYMENT_REQUIRED',
          message: `Free tier exhausted. You have used ${billingCheck.totalRequests} of ${FREE_REQUESTS_PER_MONTH} free requests this month.`,
          data: {
            totalRequests: billingCheck.totalRequests,
            freeRequests: billingCheck.freeRequests,
            billableRequests: billingCheck.billableRequests,
            amount: billingCheck.amount,
            month: billingCheck.month,
            billingId: billingCheck.billingId,
          },
        });
      }
    }

    // Rate limiting via Redis
    if (isRedisAvailable()) {
      try {
        const redis = getRedisClient();
        const rateLimitKey = `rate_limit:${apiKeyValue}`;
        const current = await redis.incr(rateLimitKey);
        if (current === 1) await redis.expire(rateLimitKey, 60);

        const limit = api.rateLimit?.requestsPerMinute || 60;
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));

        if (current > limit) {
          return res.status(429).json({ success: false, message: 'Rate limit exceeded' });
        }
      } catch {
        // Redis flapped — allow through
      }
    }

    // Build target URL
    // req.path gives the path after /gateway (e.g. /pokemon/pikachu)
    // req.query gives query string params
    const pathAfterGateway = req.path === '/' ? '' : req.path;
    const queryString = Object.keys(req.query).length
      ? '?' + new URLSearchParams(req.query).toString()
      : '';

    // Clean double slashes
    const baseUrl = api.baseUrl.replace(/\/$/, '');
    const targetUrl = `${baseUrl}${pathAfterGateway}${queryString}`;

    console.log(`🔀 Gateway: ${req.method} ${targetUrl}`);

    // Forward request to real API
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const latency = Date.now() - startTime;
    const responseData = await response.json().catch(() => ({}));

    // Log usage asynchronously — never block the response
    UsageLog.create({
      apiKeyId: apiKey._id,
      apiId: api._id,
      userId: apiKey.userId,
      endpoint: targetUrl,
      method: req.method,
      statusCode: response.status,
      latency,
      timestamp: new Date(),
    }).catch(err => console.error('Usage log error:', err.message));

    // Update key stats asynchronously
    ApiKey.findByIdAndUpdate(apiKey._id, {
      $inc: { totalRequests: 1 },
      lastUsedAt: new Date(),
    }).catch(err => console.error('Key update error:', err.message));

    res.setHeader('X-Response-Time', `${latency}ms`);
    res.setHeader('X-MeterFlow-API', api.name);
    return res.status(response.status).json(responseData);

  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('Gateway error:', error.message);
    return res.status(502).json({
      success: false,
      message: 'Gateway error: ' + error.message,
      latency,
    });
  }
};

module.exports = { proxyRequest };
