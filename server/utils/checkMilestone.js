const config = require('../config/config');

/**
 * Check if video call milestone is achieved
 * @param {Object} match - Match document
 * @returns {Boolean} - True if milestone is achieved
 */
const checkVideoMilestone = (match) => {
  if (match.videoUnlocked) {
    return true;
  }
  
  const now = new Date();
  const hoursDifference = (now - match.startTime) / (1000 * 60 * 60);
  
  // Check if required messages exchanged within time window
  if (match.messagesExchanged >= config.MESSAGES_FOR_VIDEO && 
      hoursDifference <= config.VIDEO_UNLOCK_HOURS) {
    return true;
  }
  
  return false;
};

/**
 * Calculate progress towards video call milestone
 * @param {Object} match - Match document
 * @returns {Object} - Progress details
 */
const getVideoProgress = (match) => {
  const now = new Date();
  const hoursDifference = (now - match.startTime) / (1000 * 60 * 60);
  const timeRemaining = Math.max(0, config.VIDEO_UNLOCK_HOURS - hoursDifference);
  
  return {
    messagesExchanged: match.messagesExchanged,
    messagesRequired: config.MESSAGES_FOR_VIDEO,
    messagesRemaining: Math.max(0, config.MESSAGES_FOR_VIDEO - match.messagesExchanged),
    timeElapsed: hoursDifference,
    timeRemaining,
    timeWindow: config.VIDEO_UNLOCK_HOURS,
    isUnlocked: match.videoUnlocked || 
      (match.messagesExchanged >= config.MESSAGES_FOR_VIDEO && 
       hoursDifference <= config.VIDEO_UNLOCK_HOURS)
  };
};

module.exports = {
  checkVideoMilestone,
  getVideoProgress
};
