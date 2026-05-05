const fetch = require('node-fetch');
const ApiKey = require('../models/ApiKey');
const Api = require('../models/Api');
const User = require('../models/User');
const UsageLog = require('../models/UsageLog');
const Billing = require('../models/Billing');
const { safeRedisCall } = require('../config/redis');

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

  if (totalRequests < FREE_REQUESTS_PER_MONTH) {
    return { allowed: true, totalRequests };
  }

  const billableRequests = totalRequests - FREE_REQUESTS_PER_MONTH;
  const amount = parseFloat(((billableRequests / 100) * PRICE_PER_100_REQUESTS).toFixed(2));

  const billing = await Billing.findOneAndUpdate(
    { userId, month },
    {
      $set: { totalRequests, freeRequests: FREE_REQUESTS_PER_MONTH, billableRequests, amount },
      $setOnInsert: { status: 'pending' },
    },
    { upsert: true, new: true }
  );

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
    const apiKey = await ApiKey.findOne({ key: apiKeyValue, status: 'active' }).populate('apiId');
    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'Invalid or revoked API key' });
    }

    const api = apiKey.apiId;
    if (!api || !api.isActive) {
      return res.status(404).json({ success: false, message: 'API not found or inactive' });
    }

    const user = await User.findById(apiKey.userId);
    if (user && user.role === 'consumer') {
      const billingCheck = await checkAndUpsertBilling(apiKey.userId);
      if (!billingCheck.allowed) {
        return res.status(402).json({
          success: false,
          code: 'PAYMENT_REQUIRED',
          message: `Free tier exhausted. ${billingCheck.totalRequests} of ${FREE_REQUESTS_PER_MONTH} free requests used.`,
          data: billingCheck,
        });
      }
    }

    const limit = api.rateLimit?.requestsPerMinute || 60;
    const rateLimitResult = await safeRedisCall(async (redis) => {
      const key = `rate_limit:${apiKeyValue}`;
      const current = await redis.incr(key);
      if (current === 1) await redis.expire(key, 60);
      return current;
    });

    if (rateLimitResult !== null) {
      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - rateLimitResult));
      if (rateLimitResult > limit) {
        return res.status(429).json({ success: false, message: 'Rate limit exceeded.' });
      }
    }

    // --- RECONSTRUCTION FIX START ---
    const pathPart = req.params.path || '';
    const extraPart = req.params[0] || ''; 
    const fullPath = (pathPart + extraPart).replace(/^\//, ''); 
    
    const queryString = Object.keys(req.query).length
      ? '?' + new URLSearchParams(req.query).toString()
      : '';

    const baseUrl = api.baseUrl.replace(/\/$/, '');
    const targetUrl = `${baseUrl}/${fullPath}${queryString}`;
    // --- RECONSTRUCTION FIX END ---

    console.log(`🔀 ${req.method} ${targetUrl}`);

    const upstreamResponse = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
    });

    const latency = Date.now() - startTime;
    const responseText = await upstreamResponse.text();
    let responseData;
    let isJson = false;

    try {
      responseData = JSON.parse(responseText);
      isJson = true;
    } catch {
      responseData = {
        success: false,
        message: 'Upstream API returned a non-JSON response',
        upstream_status: upstreamResponse.status,
        preview: responseText.slice(0, 300),
      };
    }

    UsageLog.create({
      apiKeyId: apiKey._id,
      apiId: api._id,
      userId: apiKey.userId,
      endpoint: targetUrl,
      method: req.method,
      statusCode: upstreamResponse.status,
      latency,
      timestamp: new Date(),
    }).catch(err => console.error('Usage log error:', err.message));

    ApiKey.findByIdAndUpdate(apiKey._id, {
      $inc: { totalRequests: 1 },
      lastUsedAt: new Date(),
    }).catch(err => console.error('Key update error:', err.message));

    res.setHeader('X-Response-Time', `${latency}ms`);
    res.setHeader('X-MeterFlow-API', api.name);
    res.setHeader('Content-Type', 'application/json');

    return res.status(isJson ? upstreamResponse.status : 502).json(responseData);

  } catch (error) {
    console.error('Gateway error:', error.message);
    return res.status(502).json({
      success: false,
      message: 'Gateway error: ' + error.message,
    });
  }
};

module.exports = { proxyRequest };