const express = require('express');
const { startFreeze, startWait } = require('../controllers/timers');

const { protect } = require('../middlewares/auth');

const router = express.Router();

// Timer routes
router.post('/start-freeze', protect, startFreeze);
router.post('/start-wait', protect, startWait);

module.exports = router;
