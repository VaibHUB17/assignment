const User = require('../models/User');
const Match = require('../models/Match');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get user profile
// @route   GET /api/v1/users/profile/:id
// @access  Private
exports.getUserProfile = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-passwordHash');

  if (!user) {
    return next(new ErrorResponse(`User not found with id ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Get user state
// @route   GET /api/v1/users/state/:id
// @access  Private
exports.getUserState = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new ErrorResponse(`User not found with id ${req.params.id}`, 404));
  }
  
  // Check and update state based on time constraints
  const previousState = user.currentState;
  const currentState = user.checkState();
  
  if (previousState !== currentState) {
    await user.save();
  }

  // Get additional state information
  const stateInfo = {
    currentState: user.currentState
  };
  
  // Add match info if user is matched
  if (user.currentState === 'matched' && user.currentMatchId) {
    const match = await Match.findById(user.currentMatchId)
      .populate('userA')
      .populate('userB');
    
    if (match) {
      stateInfo.match = match;
    }
  }
  
  // Add freeze time if user is frozen
  if (user.currentState === 'frozen' && user.freezeUntil) {
    stateInfo.freezeUntil = user.freezeUntil;
    stateInfo.freezeRemaining = Math.max(0, 
      (user.freezeUntil - new Date()) / (1000));
  }
  
  // Add wait time if user is waiting
  if (user.currentState === 'waiting' && user.waitUntil) {
    stateInfo.waitUntil = user.waitUntil;
    stateInfo.waitRemaining = Math.max(0, 
      (user.waitUntil - new Date()) / (1000));
  }
  
  res.status(200).json({
    success: true,
    data: stateInfo
  });
});

// @desc    Update user state (admin only)
// @route   POST /api/v1/users/state/update
// @access  Private/Admin
exports.updateUserState = asyncHandler(async (req, res, next) => {
  const { userId, newState, reason } = req.body;

  if (!userId || !newState) {
    return next(new ErrorResponse('Please provide userId and newState', 400));
  }

  const user = await User.findById(userId);

  if (!user) {
    return next(new ErrorResponse(`User not found with id ${userId}`, 404));
  }

  const validStates = ['available', 'matched', 'frozen', 'waiting'];
  if (!validStates.includes(newState)) {
    return next(new ErrorResponse(`Invalid state: ${newState}`, 400));
  }

  user.currentState = newState;
  
  // Set additional state-specific fields
  if (newState === 'frozen') {
    const now = new Date();
    user.freezeUntil = new Date(
      now.getTime() + 1000
    );
  } else if (newState === 'waiting') {
    const now = new Date();
    user.waitUntil = new Date(
      now.getTime() + 1000
    );
  } else if (newState === 'available') {
    user.currentMatchId = null;
    user.freezeUntil = null;
    user.waitUntil = null;
  }

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      user,
      message: `User state updated to ${newState}`,
      reason: reason || 'Admin action'
    }
  });
});

// @desc    Get user analytics for intent
// @route   GET /api/v1/users/analytics/intent/:userId
// @access  Private/Admin
exports.getUserAnalytics = asyncHandler(async (req, res, next) => {
  const userId = req.params.userId;
  
  // Get all matches for user
  const matches = await Match.find({
    $or: [
      { userA: userId },
      { userB: userId }
    ]
  });
  
  if (!matches || matches.length === 0) {
    return res.status(200).json({
      success: true,
      data: {
        totalMatches: 0,
        pinRatio: 0,
        averageMessageCount: 0,
        videoUnlockRatio: 0
      }
    });
  }
  
  // Calculate analytics
  const totalMatches = matches.length;
  const pinnedMatches = matches.filter(match => match.pinned).length;
  const pinRatio = pinnedMatches / totalMatches;
  
  const totalMessages = matches.reduce((sum, match) => sum + match.messagesExchanged, 0);
  const averageMessageCount = totalMessages / totalMatches;
  
  const videoUnlocked = matches.filter(match => match.videoUnlocked).length;
  const videoUnlockRatio = videoUnlocked / totalMatches;
  
  res.status(200).json({
    success: true,
    data: {
      totalMatches,
      pinRatio,
      averageMessageCount,
      videoUnlockRatio,
      unpinnedTotal: totalMatches - pinnedMatches,
      messageTotal: totalMessages,
      videoUnlockedTotal: videoUnlocked
    }
  });
});
