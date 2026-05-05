const Redis = require('ioredis');

let redisClient = null;
let redisAvailable = false;
let connectionAttempted = false;

const getRedisClient = () => redisClient;
const isRedisAvailable = () => redisAvailable;

const initRedis = () => {
  if (connectionAttempted) return;
  connectionAttempted = true;

  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn('⚠️  REDIS_URL not set — rate limiting and job queue disabled');
    return;
  }

  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 5000,        // fail fast after 5s
      commandTimeout: 3000,        // individual commands timeout after 3s
      retryStrategy(times) {
        if (times > 3) return null; // stop retrying after 3 attempts
        return Math.min(times * 500, 2000);
      },
    });

    redisClient.on('ready', () => {
      redisAvailable = true;
      console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
      redisAvailable = false;
      // Only log once to avoid flooding logs
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        console.warn('⚠️  Redis unavailable — rate limiting disabled');
      }
    });

    redisClient.on('close', () => {
      redisAvailable = false;
    });

    redisClient.connect().catch((err) => {
      redisAvailable = false;
      console.warn('⚠️  Redis connection failed:', err.message);
    });

  } catch (err) {
    redisAvailable = false;
    console.warn('⚠️  Redis init failed:', err.message);
  }
};

// Safe wrapper — never throws, returns null if Redis unavailable
const safeRedisCall = async (fn) => {
  if (!redisAvailable || !redisClient) return null;
  try {
    return await fn(redisClient);
  } catch (err) {
    redisAvailable = false;
    console.warn('⚠️  Redis command failed:', err.message);
    return null;
  }
};

module.exports = getRedisClient;
module.exports.isRedisAvailable = isRedisAvailable;
module.exports.initRedis = initRedis;
module.exports.safeRedisCall = safeRedisCall;
