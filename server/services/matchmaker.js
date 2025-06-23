const User = require('../models/User');
const Match = require('../models/Match');
const { calculateCompatibilityScore } = require('../utils/compatibilityScore');

/**
 * Generate a daily match for a specific user
 * @param {ObjectId} userId - ID of the user to match
 * @returns {Promise<Object>} - The created match
 */
exports.generateDailyMatch = async (userId) => {
  try {
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }
    
    // Make sure user is available
    if (user.currentState !== 'available') {
      throw new Error(`User is in ${user.currentState} state and cannot be matched`);
    }
    
    // Find all available users except the current user
    const potentialMatches = await User.find({
      _id: { $ne: userId },
      currentState: 'available'
    });
    
    if (!potentialMatches || potentialMatches.length === 0) {
      console.log('No potential matches found');
      return null;
    }
    
    // Calculate compatibility scores for all potential matches
    const scoredMatches = potentialMatches.map(match => {
      const score = calculateCompatibilityScore(user, match);
      return {
        user: match,
        score
      };
    });
    
    // Sort by score (highest first)
    scoredMatches.sort((a, b) => b.score - a.score);
    
    // Select the top match
    const bestMatch = scoredMatches[0];
    
    // Ensure there's a minimum compatibility threshold (e.g., 40%)
    if (bestMatch.score < 40) {
      console.log('No matches met the minimum compatibility threshold');
      return null;
    }
    
    // Create a match
    const match = await Match.create({
      userA: userId,
      userB: bestMatch.user._id,
      pinned: true,
      startTime: new Date(),
      unpinnedBy: null,
      messagesExchanged: 0,
      videoUnlocked: false
    });
    
    return match;
  } catch (error) {
    console.error('Error generating match:', error);
    return null;
  }
};

/**
 * Find matches for all available users
 * @returns {Promise<Array>} - Array of created matches
 */
exports.generateMatchesForAll = async () => {
  try {
    // Find all available users
    const availableUsers = await User.find({ currentState: 'available' });
    
    if (!availableUsers || availableUsers.length < 2) {
      console.log('Not enough available users for matching');
      return [];
    }
    
    // Store matched user IDs to prevent duplicate matches
    const matchedUserIds = new Set();
    const createdMatches = [];
    
    // For each available user
    for (const user of availableUsers) {
      // Skip if already matched in this round
      if (matchedUserIds.has(user._id.toString())) {
        continue;
      }
      
      // Find all other available users not yet matched
      const potentialMatches = availableUsers.filter(
        potential => 
          !matchedUserIds.has(potential._id.toString()) && 
          potential._id.toString() !== user._id.toString()
      );
      
      if (potentialMatches.length === 0) {
        continue;
      }
      
      // Calculate compatibility scores
      const scoredMatches = potentialMatches.map(match => {
        const score = calculateCompatibilityScore(user, match);
        return {
          user: match,
          score
        };
      });
      
      // Sort by score (highest first)
      scoredMatches.sort((a, b) => b.score - a.score);
      
      // Select the top match if it meets the threshold
      const bestMatch = scoredMatches[0];
      if (bestMatch.score >= 40) {
        // Create a match
        const match = await Match.create({
          userA: user._id,
          userB: bestMatch.user._id,
          pinned: true,
          startTime: new Date(),
          unpinnedBy: null,
          messagesExchanged: 0,
          videoUnlocked: false
        });
        
        // Update both users to matched state
        await User.updateMany(
          { _id: { $in: [user._id, bestMatch.user._id] } },
          { 
            currentState: 'matched',
            currentMatchId: match._id
          }
        );
        
        // Add to matched set
        matchedUserIds.add(user._id.toString());
        matchedUserIds.add(bestMatch.user._id.toString());
        
        createdMatches.push(match);
      }
    }
    
    return createdMatches;
  } catch (error) {
    console.error('Error generating matches for all users:', error);
    return [];
  }
};
