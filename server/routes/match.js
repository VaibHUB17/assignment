const express = require('express');
const { 
  getDailyMatch, 
  pinMatch, 
  unpinMatch,
  getMatchFeedback
} = require('../controllers/match');

const { protect, checkUserState } = require('../middlewares/auth');

const router = express.Router();

// Match routes
router.get('/daily', protect, checkUserState(['available']), getDailyMatch);
router.post('/pin', protect, checkUserState(['matched']), pinMatch);
router.post('/unpin', protect, checkUserState(['matched']), unpinMatch);
router.get('/feedback/:userId', protect, getMatchFeedback);

module.exports = router;
