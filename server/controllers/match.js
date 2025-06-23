const Match = require('../models/Match');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config/config');
const matchmaker = require('../services/matchmaker');

// Import the socket instance to emit real-time updates
let io;
try {
  // We'll set this from server.js after initialization
  io = require('../server').io;
} catch (error) {
  console.log('Socket.io not yet initialized in match controller');
  io = null;
}

// Helper function to broadcast match updates
const broadcastMatchUpdate = async (matchId, updateType, data) => {
  try {
    if (!io) {
      console.log('Socket.io not initialized, skipping real-time update');
      return false;
    }
    
    // Use the exported function from chat.js
    const chatSocket = require('../sockets/chat');
    if (chatSocket.broadcastMatchUpdate) {
      return await chatSocket.broadcastMatchUpdate(io, matchId, updateType, data);
    }
    return false;
  } catch (error) {
    console.error('Error broadcasting match update:', error);
    return false;
  }
};

// @desc    Get daily match for a user
// @route   GET /api/v1/match/daily
// @access  Private
exports.getDailyMatch = asyncHandler(async (req, res, next) => {
  const user = req.user;
  
  // Check and update user state based on time constraints
  user.checkState();
  await user.save();
  
  // Return error if user is not available
  if (user.currentState !== 'available') {
    return next(
      new ErrorResponse(
        `Cannot get a match while in ${user.currentState} state`,
        400
      )
    );
  }

  // Check if the user already has a match today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingMatch = await Match.findOne({
    $or: [
      { userA: user._id },
      { userB: user._id }
    ],
    startTime: { $gte: today, $lt: tomorrow },
    isActive: true
  }).populate('userA userB', 'name email emotionalTraits psychologicalTraits');

  if (existingMatch) {
    // User already has a match today
    const matchedUser = existingMatch.userA.toString() === user._id.toString() 
      ? existingMatch.userB 
      : existingMatch.userA;
    
    // Update user state if not already set
    user.currentState = 'matched';
    user.currentMatchId = existingMatch._id;
    await user.save();
    
    return res.status(200).json({
      success: true,
      data: {
        match: existingMatch,
        matchedUser
      }
    });
  }

  // Generate a new match for the user
  const newMatch = await matchmaker.generateDailyMatch(user._id);
  
  if (!newMatch) {
    return next(
      new ErrorResponse('No compatible matches available today', 404)
    );
  }
  
  // Update both users' state
  user.currentState = 'matched';
  user.currentMatchId = newMatch._id;
  await user.save();
  
  const matchedUserId = newMatch.userA.toString() === user._id.toString()
    ? newMatch.userB
    : newMatch.userA;
    
  const matchedUser = await User.findById(matchedUserId);
  matchedUser.currentState = 'matched';
  matchedUser.currentMatchId = newMatch._id;
  await matchedUser.save();
  
  // Return the match data
  const populatedMatch = await Match.findById(newMatch._id)
    .populate('userA userB', 'name email emotionalTraits psychologicalTraits');
  
  const matchedUserData = populatedMatch.userA.toString() === user._id.toString()
    ? populatedMatch.userB
    : populatedMatch.userA;
  
  // Broadcast match update to both users for real-time updates
  await broadcastMatchUpdate(
    newMatch._id,
    'new_match',
    {
      match: populatedMatch,
      timestamp: new Date().toISOString()
    }
  );
  
  res.status(201).json({
    success: true,
    data: {
      match: populatedMatch,
      matchedUser: matchedUserData
    }
  });
});

// @desc    Pin a match (continue talking)
// @route   POST /api/v1/match/pin
// @access  Private
exports.pinMatch = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const { matchId } = req.body;
  
  if (!matchId) {
    return next(new ErrorResponse('Please provide a match ID', 400));
  }
  
  // Check if the match exists and the user is part of it
  const match = await Match.findOne({
    _id: matchId,
    $or: [
      { userA: user._id },
      { userB: user._id }
    ]
  });
  
  if (!match) {
    return next(new ErrorResponse('Match not found or user not part of match', 404));
  }
  
  // Already pinned, nothing to do
  if (match.pinned) {
    return res.status(200).json({
      success: true,
      message: 'Match is already pinned',
      data: match
    });
  }
  
  // Update match to pinned
  match.pinned = true;
  match.unpinnedBy = null;
  await match.save();
  
  // Broadcast match update for real-time updates
  await broadcastMatchUpdate(
    match._id,
    'match_pinned',
    {
      match,
      pinnedBy: user._id,
      timestamp: new Date().toISOString()
    }
  );
  
  res.status(200).json({
    success: true,
    message: 'Match pinned successfully',
    data: match
  });
});

// @desc    Unpin a match (trigger freeze and wait)
// @route   POST /api/v1/match/unpin
// @access  Private
exports.unpinMatch = asyncHandler(async (req, res, next) => {
  const user = req.user;
  const { matchId, feedback } = req.body;
  
  if (!matchId) {
    return next(new ErrorResponse('Please provide a match ID', 400));
  }
  
  // Check if the match exists and the user is part of it
  const match = await Match.findOne({
    _id: matchId,
    $or: [
      { userA: user._id },
      { userB: user._id }
    ]
  });
  
  if (!match) {
    return next(new ErrorResponse('Match not found or user not part of match', 404));
  }
  
  // Already unpinned
  if (!match.pinned) {
    return res.status(200).json({
      success: true,
      message: 'Match is already unpinned',
      data: match
    });
  }
  
  // Update match to unpinned
  match.pinned = false;
  match.unpinnedBy = user._id;
  match.isActive = false;
  
  if (feedback) {
    match.feedback = feedback;
    
    // Create feedback record
    await Feedback.create({
      userId: user._id,
      matchId: match._id,
      feedbackText: feedback
    });
  }
  
  await match.save();
  
  // Get the other user in the match
  const otherUserId = match.userA.toString() === user._id.toString() 
    ? match.userB 
    : match.userA;
  
  const otherUser = await User.findById(otherUserId);
    // Update current user state (freeze for 24 hours)
  const now = new Date();
  user.currentState = 'frozen';
  user.freezeUntil = new Date(
    now.getTime() + config.REFLECTION_FREEZE_HOURS * 60 * 60 * 1000
  );
  user.currentMatchId = null;
  await user.save();
    // Update other user state (wait for 2 hours)
  otherUser.currentState = 'waiting';
  otherUser.waitUntil = new Date(
    now.getTime() + config.WAITING_HOURS_AFTER_UNPIN * 60 * 60 * 1000
  );
  otherUser.currentMatchId = null;
  await otherUser.save();
  
  // Broadcast match update for real-time updates
  await broadcastMatchUpdate(
    match._id,
    'match_unpinned',
    {
      match,
      unpinnedBy: user._id,
      userFrozen: user._id,
      userWaiting: otherUser._id,
      timestamp: new Date().toISOString()
    }
  );
  
  res.status(200).json({
    success: true,
    message: 'Match unpinned successfully',
    data: {
      match,
      userState: {
        state: user.currentState,
        freezeUntil: user.freezeUntil
      }
    }
  });
});

// @desc    Get feedback from last match
// @route   GET /api/v1/match/feedback/:userId
// @access  Private
exports.getMatchFeedback = asyncHandler(async (req, res, next) => {
  const userId = req.params.userId;
  
  // Find the latest match with feedback for this user
  const latestMatch = await Match.findOne({
    $or: [
      { userA: userId },
      { userB: userId }
    ],
    feedback: { $ne: null }
  }).sort({ startTime: -1 });
  
  if (!latestMatch) {
    return next(new ErrorResponse('No feedback found for this user', 404));
  }
  
  // Get detailed feedback if available
  const feedback = await Feedback.findOne({
    matchId: latestMatch._id
  });
  
  res.status(200).json({
    success: true,
    data: {
      match: latestMatch,
      feedback: feedback || latestMatch.feedback
    }
  });
});
