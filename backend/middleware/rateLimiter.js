const getRedisClient = require('../config/redis');

const rateLimiter = (requestsPerMinute = 60) => {
  return async (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return next();

    try {
      const redis = getRedisClient();
      const key = `rate_limit:${apiKey}`;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, 60); // 1 minute window
      }

      res.setHeader('X-RateLimit-Limit', requestsPerMinute);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, requestsPerMinute - current));

      if (current > requestsPerMinute) {
        return res.status(429).json({
          success: false,
          message: 'Rate limit exceeded. Please wait before making more requests.',
        });
      }

      next();
    } catch (error) {
      // If Redis fails, allow request through
      console.error('Rate limiter error:', error.message);
      next();
    }
  };
};

module.exports = rateLimiter;
