const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  passwordHash: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  emotionalTraits: {
    type: [String],
    required: [true, 'Please provide emotional traits']
  },
  psychologicalTraits: {
    type: [String],
    required: [true, 'Please provide psychological traits']
  },
  behavioralPatterns: {
    type: [String],
    required: [true, 'Please provide behavioral patterns']
  },
  relationshipValues: {
    type: [String],
    required: [true, 'Please provide relationship values']
  },
  currentState: {
    type: String,
    enum: ['available', 'matched', 'frozen', 'waiting'],
    default: 'available'
  },
  currentMatchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    default: null
  },
  freezeUntil: {
    type: Date,
    default: null
  },
  waitUntil: {
    type: Date,
    default: null
  },
  assessmentScore: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  // Only hash the password if it's modified
  if (!this.isModified('passwordHash')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

// Check if user is in the correct state
UserSchema.methods.checkState = function() {
  const now = new Date();
  
  // Check if freeze time has passed
  if (this.currentState === 'frozen' && this.freezeUntil && now >= this.freezeUntil) {
    this.currentState = 'available';
    this.freezeUntil = null;
  }
  
  // Check if wait time has passed
  if (this.currentState === 'waiting' && this.waitUntil && now >= this.waitUntil) {
    this.currentState = 'available';
    this.waitUntil = null;
  }
  
  return this.currentState;
};

module.exports = mongoose.model('User', UserSchema);
