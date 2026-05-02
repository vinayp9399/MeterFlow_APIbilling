const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    billingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Billing',
      required: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true, // <--- This already creates the index!
    },
    // ... rest of your fields
  },
  { timestamps: true }
);

paymentSchema.index({ userId: 1, createdAt: -1 });

// DELETE OR COMMENT OUT THE LINE BELOW:
// paymentSchema.index({ razorpayOrderId: 1 }); 

module.exports = mongoose.model('Payment', paymentSchema);