const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

module.exports = {
  // Server configuration
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // MongoDB configuration
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/lone-town',
  
  // JWT configuration
  JWT_SECRET: process.env.JWT_SECRET || 'lone-town-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '30d',
  
  // Match settings
  REFLECTION_FREEZE_HOURS: 24, // Hours to freeze a user after unpinning
  WAITING_HOURS_AFTER_UNPIN: 2, // Hours to wait before getting a new match
  MESSAGES_FOR_VIDEO: 100, // Number of messages required to unlock video
  VIDEO_UNLOCK_HOURS: 48, // Time window for exchanging required messages
};
