const express = require('express');
const router = express.Router();
const { proxyRequest } = require('../controllers/gatewayController');

// Use * without leading slash — works correctly on all hosting platforms
router.all('*', proxyRequest);

module.exports = router;
