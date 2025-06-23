const express = require('express');
const { 
  unlockVideoCall, 
  getVideoStatus 
} = require('../controllers/video');

const { protect, checkUserState } = require('../middlewares/auth');

const router = express.Router();

// Video routes
router.post('/unlock/:matchId', protect, checkUserState(['matched']), unlockVideoCall);
router.get('/status/:matchId', protect, checkUserState(['matched']), getVideoStatus);

module.exports = router;
