const Message = require('../models/Message');
const Match = require('../models/Match');
const User = require('../models/User');
const { checkVideoMilestone } = require('../utils/checkMilestone');

/**
 * Set up socket.io chat handlers
 * @param {Object} io - Socket.io server instance
 */
const setupSocketHandlers = (io) => {
  // Track active users and their sockets
  const activeUsers = new Map(); // userId -> Set of socketIds
  
  // Helper function to broadcast to all users in a match
  const broadcastToMatch = async (matchId, eventName, data) => {
    try {
      const sockets = await io.in(`match_${matchId}`).fetchSockets();
      console.log(`Broadcasting ${eventName} to ${sockets.length} sockets in match_${matchId}`);
      
      sockets.forEach(socket => {
        socket.emit(eventName, data);
      });
      
      return true;
    } catch (error) {
      console.error(`Error broadcasting to match ${matchId}:`, error);
      return false;
    }
  };
  
  // Helper function to broadcast match updates to relevant users
  const broadcastMatchUpdate = async (matchId, updateType, data) => {
    try {
      const match = await Match.findById(matchId);
      if (!match) {
        console.error(`Match ${matchId} not found for update broadcast`);
        return false;
      }
      
      // Get both users in the match
      const userA = match.userA.toString();
      const userB = match.userB.toString();
      
      // Broadcast to all sockets of both users
      const usersToNotify = [userA, userB];
      let notifiedCount = 0;
      
      for (const userId of usersToNotify) {
        if (activeUsers.has(userId)) {
          const userSockets = Array.from(activeUsers.get(userId));
          console.log(`Broadcasting match update to user ${userId} with ${userSockets.length} active sockets`);
          
          userSockets.forEach(socketId => {
            io.to(socketId).emit('matchUpdate', {
              matchId,
              updateType,
              data,
              timestamp: new Date().toISOString()
            });
            notifiedCount++;
          });
        }
      }
      
      console.log(`Broadcast match update completed: ${notifiedCount} sockets notified`);
      return notifiedCount > 0;
    } catch (error) {
      console.error(`Error broadcasting match update for ${matchId}:`, error);
      return false;
    }
  };

  // Helper function to register a user's socket
  const registerUserSocket = (userId, socketId) => {
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, new Set());
    }
    activeUsers.get(userId).add(socketId);
    console.log(`Registered socket ${socketId} for user ${userId}. Active sockets: ${activeUsers.get(userId).size}`);
  };

  // Helper function to unregister a user's socket
  const unregisterUserSocket = (userId, socketId) => {
    if (activeUsers.has(userId)) {
      activeUsers.get(userId).delete(socketId);
      if (activeUsers.get(userId).size === 0) {
        activeUsers.delete(userId);
      }
      console.log(`Unregistered socket ${socketId} for user ${userId}`);
    }
  };

  // Helper function to check if user is online
  const isUserOnline = (userId) => {
    return activeUsers.has(userId) && activeUsers.get(userId).size > 0;
  };

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    
    // Handle authentication
    socket.on('authenticate', async (data) => {
      try {
        const { userId } = data;
        
        // Store user ID in socket
        socket.userId = userId;
        console.log(`User ${userId} authenticated on socket ${socket.id}`);
        
        // Register this socket for the user
        registerUserSocket(userId, socket.id);
        
        // Get user's current match
        const user = await User.findById(userId);
        if (user && user.currentMatchId) {
          const match = await Match.findById(user.currentMatchId);
          if (match) {
            // Join room for this match
            socket.join(`match_${match._id}`);
            console.log(`User ${userId} joined match room ${match._id}`);
            
            // Notify others in the room that this user is online
            socket.to(`match_${match._id}`).emit('userOnline', { 
              userId,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        // Find all active matches for this user
        const activeMatches = await Match.find({
          $or: [{ userA: userId }, { userB: userId }],
          isActive: true
        });
        
        // Join all active match rooms
        for (const match of activeMatches) {
          socket.join(`match_${match._id}`);
          console.log(`User ${userId} joined match room ${match._id}`);
        }
        
        socket.emit('authenticated', { success: true });
      } catch (error) {
        console.error('Authentication error:', error);
        socket.emit('error', { message: 'Authentication failed' });
      }
    });      // Handle joining a match room
    socket.on('joinMatch', async (data) => {
      try {
        const { matchId } = data;
        const userId = socket.userId;
        
        if (!userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }
        
        // Check if user is part of this match
        const match = await Match.findOne({
          _id: matchId,
          $or: [
            { userA: userId },
            { userB: userId }
          ]
        });
        
        if (!match) {
          socket.emit('error', { message: 'Match not found or user not part of match' });
          return;
        }
        
        // Leave any previous match rooms (if any)
        for (const room of socket.rooms) {
          if (room.startsWith('match_') && room !== `match_${matchId}`) {
            socket.leave(room);
            console.log(`User ${userId} left previous match room ${room}`);
          }
        }
        
        // Leave any existing rooms except the socket's own room (which is always the socket.id)
        const socketRooms = Array.from(socket.rooms);
        for (const room of socketRooms) {
          if (room !== socket.id) {
            socket.leave(room);
            console.log(`User ${userId} left room ${room}`);
          }
        }
          // Join the match room
        const roomName = `match_${matchId}`;
        socket.join(roomName);
        console.log(`User ${userId} joined match room ${roomName}`);
        
        // Debug: verify the socket is in the room
        const socketsInRoom = await io.in(roomName).allSockets();
        console.log(`Current sockets in room ${roomName}:`, Array.from(socketsInRoom));
        
        // Get the other user in this match
        const otherUserId = match.userA.toString() === userId ? match.userB : match.userA;
        
        // Check if the other user is online
        const otherUserOnline = isUserOnline(otherUserId);
        
        // Notify others in the room that this user has joined
        socket.to(`match_${matchId}`).emit('userJoined', {
          userId,
          matchId,
          timestamp: new Date().toISOString()
        });
        
        // Get recent messages for this match (last 50)
        const recentMessages = await Message.find({ matchId })
          .sort({ timestamp: -1 })
          .limit(50)
          .lean();
        
        // Mark all unread messages as read
        await Message.updateMany(
          { 
            matchId, 
            senderId: otherUserId,
            isRead: { $ne: true } 
          }, 
          { 
            isRead: true,
            readAt: new Date()
          }
        );
          
        socket.emit('joinedMatch', { 
          success: true, 
          matchId,
          otherUserId,
          otherUserOnline,
          recentMessages: recentMessages.reverse(),
          lastSeen: otherUserOnline ? 'online' : (new Date().toISOString())
        });
      } catch (error) {
        console.error('Join match error:', error);
        socket.emit('error', { message: 'Error joining match room' });
      }
    });    // Handle sending a message
    socket.on('sendMessage', async (data) => {
      try {
        const { matchId, content, tempId } = data;
        const senderId = socket.userId;
        
        if (!senderId) {
          socket.emit('error', { 
            message: 'Not authenticated',
            tempId
          });
          return;
        }
        
        if (!matchId || !content) {
          socket.emit('error', { 
            message: 'Missing matchId or content',
            tempId
          });
          return;
        }
        
        // Check if user is part of this match
        const match = await Match.findOne({
          _id: matchId,
          $or: [
            { userA: senderId },
            { userB: senderId }
          ]
        });
        
        if (!match) {
          socket.emit('error', { 
            message: 'Match not found or user not part of match',
            tempId
          });
          return;
        }
          
        // Get the other user in this match
        const otherUserId = match.userA.toString() === senderId ? match.userB : match.userA;
        
        // Check if recipient is online
        const isRecipientOnline = isUserOnline(otherUserId);
        
        // Make sure user is in the match room - fix for Socket.IO v4+ compatibility
        const isInRoom = Array.from(socket.rooms).includes(`match_${matchId}`);
        if (!isInRoom) {
          socket.join(`match_${matchId}`);
          console.log(`User ${senderId} auto-joined match room ${matchId}`);
        }
        
        // Create the message
        const message = await Message.create({
          matchId,
          senderId,
          content,
          status: 'sent',
          sentAt: new Date(),
          deliveredAt: isRecipientOnline ? new Date() : null,
          isRead: false,
          readAt: null
        });
        
        // Increment message count
        match.messagesExchanged += 1;
        await match.save();
        
        // Make sure to include message ID in the response
        const messageData = {
          _id: message._id,
          matchId: message.matchId,
          senderId: message.senderId,
          content: message.content,
          timestamp: message.timestamp,
          status: isRecipientOnline ? 'delivered' : 'sent',
          sentAt: message.sentAt,
          deliveredAt: message.deliveredAt,
          isRead: message.isRead,
          readAt: message.readAt,
          tempId // Include temporary ID for client reconciliation
        };
        
        console.log(`Broadcasting message to match room ${matchId} from user ${senderId}`);
        
        // Get all sockets in this room for debugging
        const socketsInRoom = await io.in(`match_${matchId}`).allSockets();
        console.log(`Sockets in room match_${matchId}:`, Array.from(socketsInRoom));
        
        // Package message data for broadcasting
        const messageEventData = {
          message: messageData,
          sender: senderId
        };
          // Broadcast to everyone in the match using our helper function
        const broadcastSuccess = await broadcastToMatch(matchId, 'newMessage', messageEventData);
        console.log(`Message broadcast to all users in match_${matchId}: ${broadcastSuccess ? 'success' : 'failed'}`);
        
        // Send the message back to the sender with a different event for confirmation
        socket.emit('messageSent', { 
          success: true, 
          messageId: message._id,
          tempId,
          message: messageData
        });
        console.log(`Message confirmation sent to sender ${senderId}`);
        
        // Update message status based on recipient online status
        if (isRecipientOnline) {
          // If recipient is online, mark as delivered immediately
          message.status = 'delivered';
          message.deliveredAt = new Date();
          await message.save();
        } else {
          // If recipient is offline, queue for delivery when they reconnect
          console.log(`Recipient ${otherUserId} is offline, message will be delivered on reconnect`);
        }
        
        // Check if video call should be unlocked
        if (checkVideoMilestone(match)) {
          // Only update if not already unlocked
          if (!match.videoUnlocked) {
            match.videoUnlocked = true;
            await match.save();
            
            // Emit event to everyone in the room
            io.to(`match_${matchId}`).emit('videoUnlocked', {
              matchId,
              messagesExchanged: match.messagesExchanged
            });
          }
        }
      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Error sending message' });
      }
    });
    
    // Handle typing indicator
    socket.on('typing', (data) => {
      const { matchId } = data;
      const userId = socket.userId;
      
      if (!userId || !matchId) return;
      
      // Broadcast to others in the room
      socket.to(`match_${matchId}`).emit('userTyping', {
        userId
      });
    });
    
    // Handle stop typing indicator
    socket.on('stopTyping', (data) => {
      const { matchId } = data;
      const userId = socket.userId;
      
      if (!userId || !matchId) return;
      
      // Broadcast to others in the room
      socket.to(`match_${matchId}`).emit('userStoppedTyping', {
        userId
      });
    });    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      const userId = socket.userId;
      if (userId) {
        // Unregister this socket for the user
        unregisterUserSocket(userId, socket.id);
        
        // Only notify others if this was the last socket for this user
        if (!isUserOnline(userId)) {
          // Find user's active matches
          const activeMatches = await Match.find({
            $or: [{ userA: userId }, { userB: userId }],
            isActive: true
          }).select('_id').lean();
          
          const lastSeen = new Date().toISOString();
          
          // Notify others in all active match rooms that the user has disconnected
          for (const match of activeMatches) {
            io.to(`match_${match._id}`).emit('userOffline', {
              userId,
              lastSeen,
              matchId: match._id
            });
          }
        } else {
          console.log(`User ${userId} still has ${activeUsers.get(userId).size} active connections`);
        }
      }
    });    // New handler for direct messages when room-based messaging fails
    socket.on('directMessage', async (data) => {
      try {
        const { matchId, recipientId, content, tempId } = data;
        const senderId = socket.userId;
        
        if (!senderId || !matchId || !recipientId || !content) {
          socket.emit('error', { 
            message: 'Missing required data for direct message',
            tempId
          });
          return;
        }
        
        // Check if recipient is online
        const isRecipientOnline = isUserOnline(recipientId);
        
        // Create the message in the database
        const message = await Message.create({
          matchId,
          senderId,
          content,
          status: 'sent',
          sentAt: new Date(),
          deliveredAt: isRecipientOnline ? new Date() : null,
          isRead: false,
          readAt: null
        });
        
        // Find the match and increment message count
        const match = await Match.findById(matchId);
        if (match) {
          match.messagesExchanged += 1;
          await match.save();
        }
        
        // Format message data
        const messageData = {
          _id: message._id,
          matchId: message.matchId,
          senderId: message.senderId,
          content: message.content,
          timestamp: message.timestamp,
          status: isRecipientOnline ? 'delivered' : 'sent',
          sentAt: message.sentAt,
          deliveredAt: message.deliveredAt,
          isRead: message.isRead,
          readAt: message.readAt,
          tempId // Include temporary ID for client reconciliation
        };
        
        // Send using activeUsers map for more reliable delivery
        if (isRecipientOnline) {
          const recipientSocketIds = Array.from(activeUsers.get(recipientId));
          console.log(`Found ${recipientSocketIds.length} active sockets for recipient ${recipientId}`);
          
          // Send to all sockets of the recipient
          recipientSocketIds.forEach(socketId => {
            io.to(socketId).emit('newMessage', {
              message: messageData,
              sender: senderId,
              direct: true,
              timestamp: new Date().toISOString()
            });
          });
          
          // Update message status to delivered
          message.status = 'delivered';
          message.deliveredAt = new Date();
          await message.save();
        } else {
          console.log(`Recipient ${recipientId} is offline, message will be delivered on reconnect`);
        }
        
        // Send confirmation to sender
        socket.emit('messageSent', { 
          success: true, 
          messageId: message._id,
          tempId,
          message: messageData,
          direct: true
        });
        
        console.log(`Direct message sent from ${senderId} to ${recipientId}`);
      } catch (error) {
        console.error('Direct message error:', error);
        socket.emit('error', { 
          message: 'Error sending direct message',
          tempId: data.tempId
        });
      }
    });

    // Handle explicit leaving of a match room
    socket.on('leaveMatch', async ({ matchId }) => {
      if (!matchId || !socket.userId) return;

      socket.leave(`match_${matchId}`);
      console.log(`User ${socket.userId} left match room ${matchId}`);
      
      // Notify others in the room
      socket.to(`match_${matchId}`).emit('userLeft', {
        userId: socket.userId,
        matchId
      });
      
      socket.emit('leftMatch', { success: true, matchId });
    });
    
    // Debug event for checking connection status
    socket.on('checkConnection', () => {
      const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
      socket.emit('connectionStatus', {
        socketId: socket.id,
        userId: socket.userId,
        rooms,
        connected: true
      });
    });
      // Force rejoin all relevant match rooms
    socket.on('forceReconnect', async () => {
      try {
        const userId = socket.userId;
        if (!userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        // Register this socket
        registerUserSocket(userId, socket.id);

        // Find user data
        const user = await User.findById(userId);
        if (!user) {
          socket.emit('error', { message: 'User not found' });
          return;
        }

        // Find all active matches user is part of
        const matches = await Match.find({
          $or: [{ userA: userId }, { userB: userId }],
          isActive: true
        });

        console.log(`User ${userId} found in ${matches.length} active matches`);
        
        // Leave all previous rooms
        for (const room of socket.rooms) {
          if (room !== socket.id) {
            socket.leave(room);
          }
        }
        
        // Join all match rooms and collect pending messages
        const pendingMessages = [];
        
        for (const match of matches) {
          const roomName = `match_${match._id}`;
          socket.join(roomName);
          console.log(`User ${userId} reconnected to match room ${roomName}`);
          
          // Get the other user in this match
          const otherUserId = match.userA.toString() === userId ? match.userB : match.userA;
          
          // Find undelivered messages sent to this user
          const undeliveredMessages = await Message.find({
            matchId: match._id,
            senderId: otherUserId,
            status: 'sent'
          }).lean();
          
          if (undeliveredMessages.length > 0) {
            pendingMessages.push({
              matchId: match._id.toString(),
              messages: undeliveredMessages,
              count: undeliveredMessages.length
            });
            
            // Mark these messages as delivered
            await Message.updateMany(
              {
                matchId: match._id,
                senderId: otherUserId,
                status: 'sent'
              },
              {
                status: 'delivered',
                deliveredAt: new Date()
              }
            );
            
            // Notify the sender that their messages were delivered
            io.to(roomName).emit('messagesDelivered', {
              matchId: match._id,
              messageIds: undeliveredMessages.map(msg => msg._id),
              deliveredTo: userId,
              timestamp: new Date().toISOString()
            });
          }
          
          // Notify other users in the match that this user is online
          socket.to(roomName).emit('userReconnected', { 
            userId,
            matchId: match._id,
            timestamp: new Date().toISOString()
          });
        }
        
        socket.emit('reconnectComplete', { 
          success: true, 
          matchCount: matches.length,
          matches: matches.map(m => m._id),
          pendingMessages,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Force reconnect error:', error);
        socket.emit('error', { message: 'Error during reconnection' });
      }
    });
    
    // Handle message read receipts
    socket.on('markMessagesRead', async (data) => {
      try {
        const { matchId, messageIds } = data;
        const userId = socket.userId;
        
        if (!userId || !matchId) {
          socket.emit('error', { message: 'Missing required data' });
          return;
        }
        
        // Check if user is part of this match
        const match = await Match.findOne({
          _id: matchId,
          $or: [{ userA: userId }, { userB: userId }]
        });
        
        if (!match) {
          socket.emit('error', { message: 'Match not found or user not part of match' });
          return;
        }
        
        // Get the other user id (who sent the messages)
        const otherUserId = match.userA.toString() === userId ? match.userB : match.userA;
        
        // Update message status to read
        let updateQuery = {
          matchId,
          senderId: otherUserId,
          isRead: { $ne: true }
        };
        
        // If specific message IDs are provided, use them
        if (messageIds && messageIds.length > 0) {
          updateQuery._id = { $in: messageIds };
        }
        
        const result = await Message.updateMany(
          updateQuery,
          {
            status: 'read',
            isRead: true,
            readAt: new Date()
          }
        );
        
        console.log(`Marked ${result.modifiedCount} messages as read in match ${matchId}`);
        
        // Notify the sender that their messages were read
        socket.to(`match_${matchId}`).emit('messagesRead', {
          matchId,
          readBy: userId,
          messageIds: messageIds || [],
          timestamp: new Date().toISOString(),
          count: result.modifiedCount
        });
        
        // Confirm to the reader
        socket.emit('messagesMarkedRead', {
          success: true,
          matchId,
          count: result.modifiedCount
        });
      } catch (error) {
        console.error('Mark messages read error:', error);
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });
    
    // Handle message delivery confirmation
    socket.on('confirmDelivery', async (data) => {
      try {
        const { matchId, messageIds } = data;
        const userId = socket.userId;
        
        if (!userId || !matchId || !messageIds) {
          socket.emit('error', { message: 'Missing required data' });
          return;
        }
        
        // Update message status to delivered
        await Message.updateMany(
          {
            _id: { $in: messageIds },
            matchId,
            status: 'sent'
          },
          {
            status: 'delivered',
            deliveredAt: new Date()
          }
        );
        
        // Notify the sender
        socket.to(`match_${matchId}`).emit('messagesDelivered', {
          matchId,
          messageIds,
          deliveredTo: userId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Confirm delivery error:', error);
      }
    });

    // Handle reconnection synchronization
    socket.on('syncMessages', async (data) => {
      try {
        const { matchId, lastMessageTimestamp } = data;
        const userId = socket.userId;
        
        if (!userId || !matchId) {
          socket.emit('error', { message: 'Missing required data for sync' });
          return;
        }
        
        // Find messages newer than the last timestamp
        const query = { matchId };
        if (lastMessageTimestamp) {
          query.timestamp = { $gt: new Date(lastMessageTimestamp) };
        }
        
        const newMessages = await Message.find(query)
          .sort({ timestamp: 1 })
          .limit(100)
          .lean();
          
        console.log(`Found ${newMessages.length} new messages for sync in match ${matchId}`);
        
        // Mark messages from others as delivered if user is online
        const match = await Match.findById(matchId);
        if (match) {
          const otherUserId = match.userA.toString() === userId ? match.userB : match.userA;
          
          await Message.updateMany(
            {
              matchId,
              senderId: otherUserId,
              status: 'sent'
            },
            {
              status: 'delivered',
              deliveredAt: new Date()
            }
          );
        }
        
        // Send sync data to user
        socket.emit('messagesSynced', {
          matchId,
          messages: newMessages,
          syncedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Sync messages error:', error);
        socket.emit('error', { message: 'Failed to sync messages' });
      }
    });
    
    // Handle requests for match updates
    socket.on('requestMatchUpdates', async () => {
      try {
        const userId = socket.userId;
        if (!userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }
        
        // Find all active matches for this user
        const matches = await Match.find({
          $or: [{ userA: userId }, { userB: userId }],
          isActive: true
        })
        .populate('userA', 'username name profileImage status')
        .populate('userB', 'username name profileImage status')
        .lean();
        
        // Send matches to the user
        socket.emit('matchesUpdated', {
          matches,
          timestamp: new Date().toISOString()
        });
        
        console.log(`Sent ${matches.length} match updates to user ${userId}`);
      } catch (error) {
        console.error('Request match updates error:', error);
        socket.emit('error', { message: 'Failed to get match updates' });
      }
    });
    
    // Subscribe to real-time match updates
    socket.on('subscribeToMatches', async () => {
      try {
        const userId = socket.userId;
        if (!userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }
        
        // Find all active matches for this user
        const matches = await Match.find({
          $or: [{ userA: userId }, { userB: userId }],
          isActive: true
        }).select('_id');
        
        // Join match rooms
        for (const match of matches) {
          const roomName = `match_updates_${match._id}`;
          socket.join(roomName);
          console.log(`User ${userId} subscribed to match updates for ${match._id}`);
        }
        
        // Also join a personal room for direct match notifications
        socket.join(`user_matches_${userId}`);
        
        socket.emit('matchSubscriptionConfirmed', {
          success: true,
          matchCount: matches.length
        });
      } catch (error) {
        console.error('Subscribe to matches error:', error);
        socket.emit('error', { message: 'Failed to subscribe to match updates' });
      }
    });
    
    // Publish a match update (can be called from outside the socket context)
    socket.on('publishMatchUpdate', async (data) => {
      try {
        const { matchId, updateType, updateData } = data;
        const userId = socket.userId;
        
        if (!userId || !matchId) {
          socket.emit('error', { message: 'Missing required data for match update' });
          return;
        }
        
        // Check if user is part of this match
        const match = await Match.findOne({
          _id: matchId,
          $or: [{ userA: userId }, { userB: userId }]
        });
        
        if (!match) {
          socket.emit('error', { message: 'Match not found or user not part of match' });
          return;
        }
        
        // Broadcast the update to both users
        await broadcastMatchUpdate(matchId, updateType, updateData);
        
        socket.emit('matchUpdatePublished', {
          success: true,
          matchId,
          updateType
        });
      } catch (error) {
        console.error('Publish match update error:', error);
        socket.emit('error', { message: 'Failed to publish match update' });
      }
    });  });
};

// Export the setup function and the broadcastMatchUpdate function
module.exports = setupSocketHandlers;
module.exports.broadcastMatchUpdate = (io, matchId, updateType, data) => {
  // We need to recreate the function here since it's defined within the setupSocketHandlers closure
  return new Promise(async (resolve) => {
    try {
      const Match = require('../models/Match');
      const match = await Match.findById(matchId);
      if (!match) {
        console.error(`Match ${matchId} not found for update broadcast`);
        resolve(false);
        return;
      }
      
      // Get both users in the match
      const userA = match.userA.toString();
      const userB = match.userB.toString();
      
      // Broadcast to match room
      io.to(`match_${matchId}`).emit('matchUpdate', {
        matchId,
        updateType,
        data,
        timestamp: new Date().toISOString()
      });
      
      // Also broadcast to user-specific rooms
      io.to(`user_matches_${userA}`).emit('matchUpdate', {
        matchId,
        updateType,
        data,
        timestamp: new Date().toISOString()
      });
      
      io.to(`user_matches_${userB}`).emit('matchUpdate', {
        matchId,
        updateType,
        data,
        timestamp: new Date().toISOString()
      });
      
      console.log(`Broadcast match update completed for match ${matchId}`);
      resolve(true);
    } catch (error) {
      console.error(`Error in exported broadcastMatchUpdate for ${matchId}:`, error);
      resolve(false);
    }
  });
};
