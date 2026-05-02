const Api = require('../models/Api');
const ApiKey = require('../models/ApiKey');
const { v4: uuidv4 } = require('uuid');

const PRESET_APIS = [
  { name: 'Pokémon API', baseUrl: 'https://pokeapi.co/api/v2', category: 'pokemon', description: 'Access data for all Pokémon games' },
  { name: 'JSON Placeholder', baseUrl: 'https://jsonplaceholder.typicode.com', category: 'placeholder', description: 'Fake REST API for testing' },
  { name: 'CoinGecko Crypto', baseUrl: 'https://api.coingecko.com/api/v3', category: 'crypto', description: 'Cryptocurrency market data' },
  { name: 'Dummy Products', baseUrl: 'https://dummyjson.com', category: 'products', description: 'Fake product data for e-commerce' },
];

const getApis = async (req, res) => {
  try {
    const apis = await Api.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { apis } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createApi = async (req, res) => {
  try {
    const { name, description, baseUrl, category, rateLimit, pricing } = req.body;

    if (!name || !baseUrl) {
      return res.status(400).json({ success: false, message: 'Name and Base URL are required' });
    }

    const api = await Api.create({
      userId: req.user._id,
      name,
      description,
      baseUrl,
      category: category || 'custom',
      rateLimit: rateLimit || { requestsPerMinute: 60 },
      pricing: pricing || { freeRequestsPerMonth: 50, pricePerHundredRequests: 0.5 },
    });

    res.status(201).json({ success: true, message: 'API created successfully', data: { api } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getApiById = async (req, res) => {
  try {
    const api = await Api.findOne({ _id: req.params.id, userId: req.user._id });
    if (!api) return res.status(404).json({ success: false, message: 'API not found' });
    res.json({ success: true, data: { api } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateApi = async (req, res) => {
  try {
    const api = await Api.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!api) return res.status(404).json({ success: false, message: 'API not found' });
    res.json({ success: true, message: 'API updated', data: { api } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteApi = async (req, res) => {
  try {
    const api = await Api.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!api) return res.status(404).json({ success: false, message: 'API not found' });
    await ApiKey.deleteMany({ apiId: req.params.id });
    res.json({ success: true, message: 'API deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getPresetApis = async (req, res) => {
  res.json({ success: true, data: { presets: PRESET_APIS } });
};

// API Key operations
const generateApiKey = async (req, res) => {
  try {
    const api = await Api.findOne({ _id: req.params.id, userId: req.user._id });
    if (!api) return res.status(404).json({ success: false, message: 'API not found' });

    const key = `mf_${uuidv4().replace(/-/g, '')}`;
    const apiKey = await ApiKey.create({
      apiId: api._id,
      userId: req.user._id,
      key,
      name: req.body.name || 'Default Key',
    });

    res.status(201).json({ success: true, message: 'API key generated', data: { apiKey } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getApiKeys = async (req, res) => {
  try {
    const apiKeys = await ApiKey.find({ apiId: req.params.id, userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { apiKeys } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const revokeApiKey = async (req, res) => {
  try {
    const apiKey = await ApiKey.findOneAndUpdate(
      { _id: req.params.keyId, userId: req.user._id },
      { status: 'revoked' },
      { new: true }
    );
    if (!apiKey) return res.status(404).json({ success: false, message: 'API key not found' });
    res.json({ success: true, message: 'API key revoked', data: { apiKey } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const rotateApiKey = async (req, res) => {
  try {
    const oldKey = await ApiKey.findOne({ _id: req.params.keyId, userId: req.user._id });
    if (!oldKey) return res.status(404).json({ success: false, message: 'API key not found' });

    oldKey.status = 'revoked';
    await oldKey.save();

    const newKey = `mf_${uuidv4().replace(/-/g, '')}`;
    const apiKey = await ApiKey.create({
      apiId: oldKey.apiId,
      userId: req.user._id,
      key: newKey,
      name: oldKey.name + ' (rotated)',
    });

    res.json({ success: true, message: 'API key rotated successfully', data: { apiKey } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getApis, createApi, getApiById, updateApi, deleteApi, getPresetApis,
  generateApiKey, getApiKeys, revokeApiKey, rotateApiKey,
};
