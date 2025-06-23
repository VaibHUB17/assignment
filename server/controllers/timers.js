const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config/config');

// @desc    Start freeze period for a user
// @route   POST /api/v1/timers/start-freeze
// @access  Private/Admin
exports.startFreeze = asyncHandler(async (req, res, next) => {
  const { userId, duration } = req.body;
  
  if (!userId) {
    return next(new ErrorResponse('Please provide a user ID', 400));
  }
  
  const user = await User.findById(userId);
  
  if (!user) {
    return next(new ErrorResponse(`User not found with id ${userId}`, 404));
  }
  
  // Set freeze duration (default to configured hours)
  const freezeHours = duration || config.REFLECTION_FREEZE_HOURS;
    // Update user state
  const now = new Date();
  user.currentState = 'frozen';
  user.freezeUntil = new Date(
    now.getTime() + freezeHours * 60 * 60 * 1000
  );
  user.currentMatchId = null;
  
  await user.save();
  
  res.status(200).json({
    success: true,
    message: `User ${userId} frozen for ${freezeHours} hours`,
    data: {
      userId: user._id,
      state: user.currentState,
      freezeUntil: user.freezeUntil
    }
  });
});

// @desc    Start wait period for a user
// @route   POST /api/v1/timers/start-wait
// @access  Private/Admin
exports.startWait = asyncHandler(async (req, res, next) => {
  const { userId, duration } = req.body;
  
  if (!userId) {
    return next(new ErrorResponse('Please provide a user ID', 400));
  }
  
  const user = await User.findById(userId);
  
  if (!user) {
    return next(new ErrorResponse(`User not found with id ${userId}`, 404));
  }
  
  // Set wait duration (default to configured hours)
  const waitHours = duration || config.WAITING_HOURS_AFTER_UNPIN;
    // Update user state
  const now = new Date();
  user.currentState = 'waiting';
  user.waitUntil = new Date(
    now.getTime() + waitHours * 60 * 60 * 1000
  );
  user.currentMatchId = null;
  
  await user.save();
  
  res.status(200).json({
    success: true,
    message: `User ${userId} set to waiting for ${waitHours} hours`,
    data: {
      userId: user._id,
      state: user.currentState,
      waitUntil: user.waitUntil
    }
  });
});
