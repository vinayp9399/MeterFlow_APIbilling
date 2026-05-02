const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getCurrentBilling, getBillingHistory, markAsPaid, getPricingInfo } = require('../controllers/billingController');

router.get('/current', protect, getCurrentBilling);
router.get('/history', protect, getBillingHistory);
router.get('/pricing', getPricingInfo);
router.patch('/:id/pay', protect, markAsPaid);

module.exports = router;
