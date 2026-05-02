const Redis = require('ioredis');

let redisClient = null;
let redisAvailable = false;

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 2) {
          // Stop retrying — Redis is not available
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });

    redisClient.on('connect', () => {
      redisAvailable = true;
      console.log('Redis connected');
    });

    redisClient.on('error', (err) => {
      if (redisAvailable || err.code !== 'ECONNREFUSED') {
        console.error('Redis unavailable:', err.message);
      }
      redisAvailable = false;
    });

    // Attempt connection (non-blocking)
    redisClient.connect().catch(() => {
      console.warn('Redis not available — rate limiting and job queue disabled');
    });
  }
  return redisClient;
};

const isRedisAvailable = () => redisAvailable;

module.exports = getRedisClient;
module.exports.isRedisAvailable = isRedisAvailable;
