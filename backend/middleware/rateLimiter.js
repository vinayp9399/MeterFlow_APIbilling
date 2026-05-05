const { safeRedisCall } = require('../config/redis');

const rateLimiter = (requestsPerMinute = 60) => {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return next();

    const result = await safeRedisCall(async (redis) => {
      const key = `rate_limit:${apiKey}`;
      const current = await redis.incr(key);
      if (current === 1) await redis.expire(key, 60);
      return current;
    });

    if (result !== null) {
      res.setHeader('X-RateLimit-Limit', requestsPerMinute);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, requestsPerMinute - result));
      if (result > requestsPerMinute) {
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded. Please wait before making more requests.',
        });
      }
    }

    next();
  };
};

module.exports = rateLimiter;
