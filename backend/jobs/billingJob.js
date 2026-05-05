const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const Billing = require('../models/Billing');
const UsageLog = require('../models/UsageLog');
const User = require('../models/User');

const FREE_REQUESTS_PER_MONTH = 50;
const PRICE_PER_100_REQUESTS = 0.5;

let billingQueue = null;
let billingWorker = null;

const createBullConnection = () => {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  const conn = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    connectTimeout: 5000,
    retryStrategy: (times) => (times > 3 ? null : times * 500),
  });
  conn.on('error', () => {}); // BullMQ handles its own errors
  return conn;
};

const initBillingQueue = async () => {
  if (!process.env.REDIS_URL) {
    console.warn('⚠️  BullMQ disabled — REDIS_URL not set');
    return;
  }

  try {
    const connection = createBullConnection();
    if (!connection) return;

    await connection.connect().catch(() => {
      throw new Error('Redis not reachable for BullMQ');
    });

    billingQueue = new Queue('billing', { connection });

    billingWorker = new Worker(
      'billing',
      async (job) => {
        if (job.name !== 'monthly-billing') return;

        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Only bill consumers
        const consumers = await User.find({ role: 'consumer' });
        console.log(`🔄 Billing ${consumers.length} consumers for ${month}`);

        for (const user of consumers) {
          const [year, mon] = month.split('-');
          const startDate = new Date(year, mon - 1, 1);
          const endDate = new Date(year, mon, 0, 23, 59, 59);

          const totalRequests = await UsageLog.countDocuments({
            userId: user._id,
            timestamp: { $gte: startDate, $lte: endDate },
          });

          const billableRequests = Math.max(0, totalRequests - FREE_REQUESTS_PER_MONTH);
          const amount = parseFloat(((billableRequests / 100) * PRICE_PER_100_REQUESTS).toFixed(2));

          await Billing.findOneAndUpdate(
            { userId: user._id, month },
            { totalRequests, freeRequests: FREE_REQUESTS_PER_MONTH, billableRequests, amount },
            { upsert: true, new: true }
          );
        }
        console.log(`✅ Billing complete for ${month}`);
      },
      { connection: createBullConnection() }
    );

    billingWorker.on('completed', (job) => console.log(`✅ Job ${job.id} completed`));
    billingWorker.on('failed', (job, err) => console.error(`❌ Job ${job?.id} failed:`, err.message));

    console.log('✅ BullMQ billing queue initialized');
  } catch (error) {
    console.warn(`⚠️  BullMQ disabled — ${error.message}`);
  }
};

const scheduleBillingJob = async () => {
  if (!billingQueue) return;
  try {
    await billingQueue.add('monthly-billing', {}, {
      repeat: { pattern: '0 0 1 * *' },
    });
    console.log('✅ Monthly billing job scheduled');
  } catch (error) {
    console.warn('⚠️  Could not schedule billing job:', error.message);
  }
};

module.exports = { initBillingQueue, scheduleBillingJob };
