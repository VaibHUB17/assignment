const express = require('express');
const { 
  register,
  login,
  logout,
  getMe
} = require('../controllers/auth');

const { protect } = require('../middlewares/auth');

const router = express.Router();

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/logout', logout);
router.get('/me', protect, getMe);

module.exports = router;
