/**
 * Calculate compatibility score between two users
 * @param {Object} userA - First user object with traits
 * @param {Object} userB - Second user object with traits
 * @returns {Number} - Score between 0 and 100
 */
const calculateCompatibilityScore = (userA, userB) => {
  let score = 0;
  const maxScore = 100;
  
  // Calculate score based on emotional traits (30% weight)
  const emotionalScore = calculateTraitMatch(
    userA.emotionalTraits,
    userB.emotionalTraits
  );
  
  // Calculate score based on psychological traits (25% weight)
  const psychologicalScore = calculateTraitMatch(
    userA.psychologicalTraits,
    userB.psychologicalTraits
  );
  
  // Calculate score based on behavioral patterns (25% weight)
  const behavioralScore = calculateTraitMatch(
    userA.behavioralPatterns,
    userB.behavioralPatterns
  );
  
  // Calculate score based on relationship values (20% weight)
  const relationshipScore = calculateTraitMatch(
    userA.relationshipValues,
    userB.relationshipValues
  );
  
  // Calculate weighted average
  score = (
    emotionalScore * 0.3 +
    psychologicalScore * 0.25 +
    behavioralScore * 0.25 +
    relationshipScore * 0.2
  ) * maxScore;
  
  // Round to two decimal places
  return Math.round(score * 100) / 100;
};

/**
 * Calculate match percentage between two trait arrays
 * @param {Array} traitsA - First trait array
 * @param {Array} traitsB - Second trait array
 * @returns {Number} - Match percentage (0 to 1)
 */
const calculateTraitMatch = (traitsA, traitsB) => {
  if (!traitsA || !traitsB || traitsA.length === 0 || traitsB.length === 0) {
    return 0;
  }
  
  // Use Jaccard similarity coefficient
  // J(A,B) = |A ∩ B| / |A ∪ B|
  const intersection = traitsA.filter(trait => traitsB.includes(trait));
  const union = [...new Set([...traitsA, ...traitsB])];
  
  return intersection.length / union.length;
};

module.exports = { 
  calculateCompatibilityScore,
  calculateTraitMatch 
};
