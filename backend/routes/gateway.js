const express = require('express');
const router = express.Router();
const { proxyRequest } = require('../controllers/gatewayController');

// Captures the full path after /gateway/ into params
router.all('/:path*', proxyRequest);

module.exports = router;