const mongoose = require('mongoose');

const apiSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'API name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    baseUrl: {
      type: String,
      required: [true, 'Base URL is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['pokemon', 'placeholder', 'weather', 'crypto', 'products', 'custom'],
      default: 'custom',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    rateLimit: {
      requestsPerMinute: {
        type: Number,
        default: 60,
      },
    },
    pricing: {
      freeRequestsPerMonth: {
        type: Number,
        default: 50,
      },
      pricePerHundredRequests: {
        type: Number,
        default: 0.5,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Api', apiSchema);
