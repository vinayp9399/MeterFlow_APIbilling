const express = require('express');
const router = express.Router();
const { proxyRequest } = require('../controllers/gatewayController');

// Handle all methods, all paths
router.all('*', proxyRequest);

module.exports = router;
