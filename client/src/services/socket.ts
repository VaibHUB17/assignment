import { io, Socket } from 'socket.io-client';

// Define proper types for the socket data
interface AuthData {
  success: boolean;
  userId?: string;
  error?: string;
}

interface MessageData {
  _id: string;
  matchId: string;
  content: string;
  senderId: string;
  timestamp: string;
}

interface TypingData {
  matchId: string;
  userId: string;
}

interface MatchUpdateData {
  updateType: string;
  matchId: string;
  status: string;
  users: string[];
  // Additional optional fields
  timestamp?: string;
  lastActivity?: string;
  milestones?: Record<string, boolean>;
  extraData?: Record<string, unknown>;
}

interface VideoUnlockedData {
  matchId: string;
  unlocked: boolean;
  timestamp: string;
}

interface MatchesUpdatedData {
  matches: MatchUpdateData[];
  timestamp: string;
}

interface ErrorData {
  message: string;
  code?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private isAuthenticated = false;
  private userId: string | null = null;
  private matchUpdateHandlers: Array<(data: MatchUpdateData) => void> = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // ms

  connect() {
    if (!this.socket) {
      console.log('Connecting to socket server...');
      this.socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling'], // Try WebSocket first, fallback to polling
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000, // 10 second timeout
        forceNew: true, // Force a new connection
        autoConnect: true // Automatically connect
      });
      this.setupEventListeners();
      console.log('Socket connection initiated');
    }
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isAuthenticated = false;
      this.userId = null;
      this.reconnectAttempts = 0;
    }
  }

  authenticate(userId: string) {
    if (this.socket) {
      this.socket.emit('authenticate', { userId });
      this.userId = userId;
      console.log(`Authenticating user: ${userId}`);
    } else {
      // Auto-connect if not connected yet
      console.log('Socket not connected, connecting first...');
      this.connect();
      setTimeout(() => {
        if (this.socket) {
          console.log(`Authenticating user after connect: ${userId}`);
          this.socket.emit('authenticate', { userId });
          this.userId = userId;
        }
      }, 1000); // Wait a bit longer to ensure connection is established
    }
  }

  joinMatch(matchId: string) {
    if (this.socket && this.isAuthenticated && this.userId) {
      console.log(`Joining match room: ${matchId}`);
      this.socket.emit('joinMatch', { matchId, userId: this.userId });
    } else if (!this.userId) {
      console.error('Cannot join match: User not authenticated');
      // Try to authenticate if we have a userId but aren't authenticated
      if (this.userId && !this.isAuthenticated && this.socket) {
        console.log('Re-authenticating before joining match');
        this.authenticate(this.userId);
        setTimeout(() => {
          if (this.socket && this.isAuthenticated) {
            console.log(`Joining match room after re-auth: ${matchId}`);
            this.socket.emit('joinMatch', { matchId, userId: this.userId });
          }
        }, 1000);
      }
    } else if (!this.socket) {
      console.error('Cannot join match: Socket not connected');
    }
  }

  sendMessage(matchId: string, content: string) {
    if (this.socket && this.isAuthenticated && this.userId) {
      const messageData = { matchId, content, userId: this.userId };
      this.socket.emit('sendMessage', messageData);
      console.log('Sending message via socket:', messageData);
      return true;
    } else if (!this.userId) {
      console.error('Cannot send message: User not authenticated');
      return false;
    }
    return false;
  }

  startTyping(matchId: string) {
    if (this.socket && this.isAuthenticated && this.userId) {
      this.socket.emit('typing', { matchId, userId: this.userId });
    }
  }

  stopTyping(matchId: string) {
    if (this.socket && this.isAuthenticated && this.userId) {
      this.socket.emit('stopTyping', { matchId, userId: this.userId });
    }
  }

  onAuthenticated(callback: (data: AuthData) => void) {
    if (this.socket) {
      this.socket.on('authenticated', (data: AuthData) => {
        this.isAuthenticated = data.success;
        callback(data);
      });
    }
    return () => {
      if (this.socket) {
        this.socket.off('authenticated', callback);
      }
    };
  }

  onNewMessage(callback: (data: MessageData) => void) {
    if (this.socket) {
      const handler = (data: MessageData | { message: MessageData }) => {
        // Handle both formats: direct message data or {message: MessageData}
        if ('message' in data) {
          callback(data.message);
        } else {
          callback(data);
        }
      };
      
      this.socket.on('newMessage', handler);
      
      return () => {
        if (this.socket) {
          this.socket.off('newMessage', handler);
        }
      };
    }
    return () => {};
  }

  onUserTyping(callback: (data: TypingData) => void) {
    if (this.socket) {
      this.socket.on('userTyping', callback);
    }
    return () => {
      if (this.socket) {
        this.socket.off('userTyping', callback);
      }
    };
  }

  onUserStoppedTyping(callback: (data: TypingData) => void) {
    if (this.socket) {
      this.socket.on('userStoppedTyping', callback);
    }
    return () => {
      if (this.socket) {
        this.socket.off('userStoppedTyping', callback);
      }
    };
  }

  onVideoUnlocked(callback: (data: VideoUnlockedData) => void) {
    if (this.socket) {
      this.socket.on('videoUnlocked', callback);
    }
    return () => {
      if (this.socket) {
        this.socket.off('videoUnlocked', callback);
      }
    };
  }

  onError(callback: (error: ErrorData) => void) {
    if (this.socket) {
      this.socket.on('error', callback);
    }
    return () => {
      if (this.socket) {
        this.socket.off('error', callback);
      }
    };
  }

  // Subscribe to match updates
  subscribeToMatches() {
    if (this.socket && this.isAuthenticated && this.userId) {
      this.socket.emit('subscribeToMatches', { userId: this.userId });
      console.log('Subscribed to match updates');
    } else {
      console.error('Cannot subscribe to matches: User not authenticated');
    }
  }
  
  // Request latest match updates
  requestMatchUpdates() {
    if (this.socket && this.isAuthenticated && this.userId) {
      this.socket.emit('requestMatchUpdates', { userId: this.userId });
      console.log('Requested match updates');
    } else {
      console.error('Cannot request match updates: User not authenticated');
      // Try to reconnect if needed
      if (!this.socket) {
        this.connect();
      }
    }
  }
  
  // Register handler for match updates
  onMatchUpdate(callback: (data: MatchUpdateData) => void) {
    this.matchUpdateHandlers.push(callback);
    return () => {
      this.matchUpdateHandlers = this.matchUpdateHandlers.filter(h => h !== callback);
    };
  }
  
  // Register handler for matchesUpdated event
  onMatchesUpdated(callback: (data: MatchesUpdatedData) => void) {
    if (this.socket) {
      this.socket.on('matchesUpdated', callback);
    }
    return () => {
      if (this.socket) {
        this.socket.off('matchesUpdated', callback);
      }
    };
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Force reconnect
  reconnect() {
    console.log('Forcing socket reconnection');
    const savedUserId = this.userId;
    
    if (this.socket) {
      console.log('Disconnecting existing socket');
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    
    this.socket = null;
    this.isAuthenticated = false;
    
    console.log('Creating new socket connection');
    this.connect();
    
    // Re-authenticate if we had a userId
    if (savedUserId) {
      console.log(`Re-authenticating as user: ${savedUserId}`);
      setTimeout(() => {
        this.authenticate(savedUserId);
      }, 1000);
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
      
      // Re-authenticate if we have a userId (after reconnect)
      if (this.userId) {
        console.log(`Re-authenticating after connection: ${this.userId}`);
        setTimeout(() => {
          if (this.socket) {
            this.socket.emit('authenticate', { userId: this.userId });
          }
        }, 500);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isAuthenticated = false;
    });
    
    // Add connection error handler
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.reconnectAttempts++;
    });
    
    // Add connect_timeout handler
    this.socket.on('connect_timeout', () => {
      console.error('Socket connection timeout');
    });
    
    // Socket reconnect error handler
    this.socket.on('reconnect_error', (error) => {
      console.error('Socket reconnect error:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached. Please refresh the page.');
      }
    });

    // Socket reconnect success
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected to server after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
      
      // Re-authenticate after reconnection
      if (this.userId) {
        setTimeout(() => {
          if (this.socket) {
            console.log(`Re-authenticating after reconnect: ${this.userId}`);
            this.socket.emit('authenticate', { userId: this.userId });
          }
        }, 500);
      }
    });
    
    // Socket reconnect attempt
    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`Reconnect attempt ${attempt}...`);
    });
    
    // Authentication success handler
    this.socket.on('authenticated', (data: AuthData) => {
      console.log('Authentication response:', data);
      this.isAuthenticated = data.success;
    });
    
    // Register global match update listener
    this.socket.on('matchUpdate', (data: MatchUpdateData) => {
      console.log('Match update received:', data);
      this.matchUpdateHandlers.forEach(handler => handler(data));
    });
  }
}

export const socketService = new SocketService();