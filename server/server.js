const http = require('http');
const socketio = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config/config');
const chatSocket = require('./sockets/chat');

// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Export the io instance for use in other files
module.exports.io = io;

// Initialize chat socket handlers
chatSocket(io);

// Start server
const PORT = config.PORT;
server.listen(PORT, () => {
  console.log(`Server running in ${config.NODE_ENV} mode on port ${PORT}`);
});
