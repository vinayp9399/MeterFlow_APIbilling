const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getUsageSummary, getUsageLogs, getUsageByDay, getUsageByApi } = require('../controllers/usageController');

router.get('/summary', protect, getUsageSummary);
router.get('/logs', protect, getUsageLogs);
router.get('/by-day', protect, getUsageByDay);
router.get('/by-api', protect, getUsageByApi);

module.exports = router;
