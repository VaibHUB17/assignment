const Message = require('../models/Message');
const Match = require('../models/Match');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const { checkVideoMilestone, getVideoProgress } = require('../utils/checkMilestone');

// @desc    Get messages for a match
// @route   GET /api/v1/messages/:matchId
// @access  Private
exports.getMessages = asyncHandler(async (req, res, next) => {
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
  
  // Get messages for this match
  const messages = await Message.find({ matchId })
    .sort({ timestamp: 1 });
  
  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages
  });
});

// @desc    Send a message (RESTful fallback)
// @route   POST /api/v1/messages/send
// @access  Private
exports.sendMessage = asyncHandler(async (req, res, next) => {
  const { matchId, content } = req.body;
  const userId = req.user._id;
  
  if (!matchId || !content) {
    return next(new ErrorResponse('Please provide matchId and content', 400));
  }
  
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
  
  // Create the message
  const message = await Message.create({
    matchId,
    senderId: userId,
    content
  });
  
  // Increment the message count in the match
  match.messagesExchanged += 1;
  await match.save();
  
  // Check if video call should be unlocked
  let videoUnlocked = false;
  if (checkVideoMilestone(match)) {
    match.videoUnlocked = true;
    await match.save();
    videoUnlocked = true;
  }
  
  res.status(201).json({
    success: true,
    data: message,
    videoUnlocked
  });
});

// @desc    Get message count and progress toward video call
// @route   GET /api/v1/messages/progress/:matchId
// @access  Private
exports.getMessageProgress = asyncHandler(async (req, res, next) => {
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
  
  // Get progress information
  const progress = getVideoProgress(match);
  
  res.status(200).json({
    success: true,
    data: progress
  });
});

// @desc    Check video call eligibility
// @route   GET /api/v1/messages/unlock-video/:matchId
// @access  Private
exports.checkVideoEligibility = asyncHandler(async (req, res, next) => {
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
  
  // Check eligibility
  const isEligible = match.checkVideoEligibility();
  
  if (isEligible && !match.videoUnlocked) {
    match.videoUnlocked = true;
    await match.save();
  }
  
  res.status(200).json({
    success: true,
    data: {
      isEligible,
      videoUnlocked: match.videoUnlocked,
      messagesExchanged: match.messagesExchanged
    }
  });
});
