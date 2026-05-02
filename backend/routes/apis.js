const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getApis, createApi, getApiById, updateApi, deleteApi, getPresetApis,
  generateApiKey, getApiKeys, revokeApiKey, rotateApiKey,
} = require('../controllers/apiController');

router.get('/presets', protect, getPresetApis);
router.get('/', protect, getApis);
router.post('/', protect, createApi);
router.get('/:id', protect, getApiById);
router.put('/:id', protect, updateApi);
router.delete('/:id', protect, deleteApi);

// API Key sub-routes
router.get('/:id/keys', protect, getApiKeys);
router.post('/:id/keys', protect, generateApiKey);
router.patch('/:id/keys/:keyId/revoke', protect, revokeApiKey);
router.post('/:id/keys/:keyId/rotate', protect, rotateApiKey);

module.exports = router;
