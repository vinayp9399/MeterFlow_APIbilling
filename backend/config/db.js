const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // fail after 10s instead of hanging
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.error('Check: 1) MONGO_URI is correct  2) Atlas Network Access allows 0.0.0.0/0  3) Password has no special characters');
    process.exit(1);
  }
};

module.exports = connectDB;
