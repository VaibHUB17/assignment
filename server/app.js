const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middlewares/error');

// Create Express app
const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Set security headers
app.use(helmet());


// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Mount routers
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/match', require('./routes/match'));
app.use('/api/v1/messages', require('./routes/messages'));
app.use('/api/v1/video', require('./routes/video'));
app.use('/api/v1/timers', require('./routes/timers'));

// Base route
app.get('/', (req, res) => {
  res.send('Welcome to Lone Town API');
});

// Error handler middleware
app.use(errorHandler);

module.exports = app;
