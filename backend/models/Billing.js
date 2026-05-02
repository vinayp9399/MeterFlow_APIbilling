const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    month: {
      type: String, // Format: "2024-01"
      required: true,
    },
    totalRequests: {
      type: Number,
      default: 0,
    },
    freeRequests: {
      type: Number,
      default: 50,
    },
    billableRequests: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number, // in INR
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

billingSchema.index({ userId: 1, month: -1 });

module.exports = mongoose.model('Billing', billingSchema);
