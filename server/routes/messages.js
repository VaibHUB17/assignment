const express = require('express');
const { 
  getMessages, 
  sendMessage, 
  getMessageProgress,
  checkVideoEligibility
} = require('../controllers/messages');

const { protect, checkUserState } = require('../middlewares/auth');

const router = express.Router();

// Message routes
router.get('/:matchId', protect, checkUserState(['matched']), getMessages);
router.post('/send', protect, checkUserState(['matched']), sendMessage); // RESTful fallback
router.get('/progress/:matchId', protect, checkUserState(['matched']), getMessageProgress);
router.get('/unlock-video/:matchId', protect, checkUserState(['matched']), checkVideoEligibility);

module.exports = router;
