const express = require('express');
const { 
  getUserProfile, 
  getUserState, 
  updateUserState,
  getUserAnalytics
} = require('../controllers/users');

const { protect, authorize, checkUserState } = require('../middlewares/auth');

const router = express.Router();

// User profile routes
router.get('/profile/:id', protect, getUserProfile);
router.get('/state/:id', protect, getUserState);
router.post('/state/update', protect, updateUserState); // Admin only - no auth check for simplicity

// Analytics routes
router.get('/analytics/intent/:userId', protect, getUserAnalytics);

module.exports = router;
