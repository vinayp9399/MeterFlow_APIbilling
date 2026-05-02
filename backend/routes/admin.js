const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getPlatformStats, getAllUsers, getAllApis, toggleApiStatus, getPlatformUsageByDay } = require('../controllers/adminController');

router.use(protect, adminOnly);

router.get('/stats', getPlatformStats);
router.get('/users', getAllUsers);
router.get('/apis', getAllApis);
router.patch('/apis/:id/toggle', toggleApiStatus);
router.get('/usage/by-day', getPlatformUsageByDay);

module.exports = router;
