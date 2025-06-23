const Match = require('../models/Match');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const { checkVideoMilestone } = require('../utils/checkMilestone');

// @desc    Mark match as video call eligible
// @route   POST /api/v1/video/unlock/:matchId
// @access  Private
exports.unlockVideoCall = asyncHandler(async (req, res, next) => {
  const { matchId } = req.params;
  const userId = req.user._id;
  
  // Check if the match exists and the user is part of it
  const match = await Match.findOne({
    _id: matchId,
    $or: [
      { userA: userId },
      { userB: userId }
    ]
  });
  
  if (!match) {
    return next(
      new ErrorResponse('Match not found or user not part of match', 404)
    );
  }
  
  // Check if video call can be unlocked
  const canUnlock = checkVideoMilestone(match);
  
  if (!canUnlock) {
    return next(
      new ErrorResponse(
        'Video call cannot be unlocked yet. Need more messages within the time window',
        400
      )
    );
  }
  
  // Update match to enable video calls
  match.videoUnlocked = true;
  await match.save();
  
  res.status(200).json({
    success: true,
    message: 'Video calling has been unlocked for this match',
    data: {
      matchId: match._id,
      videoUnlocked: match.videoUnlocked,
      messagesExchanged: match.messagesExchanged
    }
  });
});

// @desc    Check video call status
// @route   GET /api/v1/video/status/:matchId
// @access  Private
exports.getVideoStatus = asyncHandler(async (req, res, next) => {
  const { matchId } = req.params;
  const userId = req.user._id;
  
  // Check if the match exists and the user is part of it
  const match = await Match.findOne({
    _id: matchId,
    $or: [
      { userA: userId },
      { userB: userId }
    ]
  });
  
  if (!match) {
    return next(
      new ErrorResponse('Match not found or user not part of match', 404)
    );
  }
  
  // Get video call status
  const videoUnlocked = match.videoUnlocked || checkVideoMilestone(match);
  
  // Update if newly unlocked
  if (videoUnlocked && !match.videoUnlocked) {
    match.videoUnlocked = true;
    await match.save();
  }
  
  res.status(200).json({
    success: true,
    data: {
      matchId: match._id,
      videoUnlocked,
      messagesExchanged: match.messagesExchanged
    }
  });
});
