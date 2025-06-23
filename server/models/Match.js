const mongoose = require('mongoose');
const config = require('../config/config');

const MatchSchema = new mongoose.Schema({
  userA: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userB: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pinned: {
    type: Boolean,
    default: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  unpinnedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  messagesExchanged: {
    type: Number,
    default: 0
  },
  videoUnlocked: {
    type: Boolean,
    default: false
  },
  feedback: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Check if video call can be unlocked
MatchSchema.methods.checkVideoEligibility = function() {
  if (this.videoUnlocked) {
    return true;
  }
  
  const now = new Date();
  const hoursDifference = (now - this.startTime) / (1000 * 60 * 60);
  
  // Check if the required number of messages has been exchanged within the time window
  if (this.messagesExchanged >= config.MESSAGES_FOR_VIDEO && 
      hoursDifference <= config.VIDEO_UNLOCK_HOURS) {
    this.videoUnlocked = true;
    return true;
  }
  
  return false;
};

module.exports = mongoose.model('Match', MatchSchema);
