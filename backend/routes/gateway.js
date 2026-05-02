const express = require('express');
const router = express.Router();
const { proxyRequest } = require('../controllers/gatewayController');

// Catch all routes and proxy them
router.all('/*', proxyRequest);

module.exports = router;
