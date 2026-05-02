const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { browseApis, subscribeToApi, getMySubscriptions, getMyUsage } = require('../controllers/consumerController');

router.use(protect);

router.get('/apis', browseApis);
router.post('/apis/:id/subscribe', subscribeToApi);
router.get('/subscriptions', getMySubscriptions);
router.get('/usage', getMyUsage);

module.exports = router;
