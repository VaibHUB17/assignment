import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Video, ArrowLeft } from 'lucide-react';
import { Button } from '../UI/Button';
import { ProgressBar } from '../UI/ProgressBar';
import { StateTimer } from '../UI/StateTimer';
import { Message, Match, MessageProgress } from '../../types';
import { socketService } from '../../services/socket';
import { apiService } from '../../services/api';

interface ChatInterfaceProps {
  match: Match;
  currentUserId: string;
  onBack: () => void;
  onVideoCall?: () => void;
  userState?: {
    currentState: string;
    freezeUntil?: string;
    waitUntil?: string;
  };
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  match,
  currentUserId,
  onBack,
  onVideoCall,
  userState
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [messageProgress, setMessageProgress] = useState<MessageProgress | null>(null);  const [loading, setLoading] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [localUserState, setLocalUserState] = useState(userState);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  // Track local messages to prevent duplication
  const localMessagesRef = useRef<Set<string>>(new Set());

  // Store cleanup functions for socket listeners
  const socketCleanupRef = useRef<Array<() => void>>([]);

  // Handle matchedUser type safely
  const getMatchedUser = () => {
    const userA = typeof match.userA === 'string' ? { _id: match.userA, name: 'User A', email: '' } : match.userA;
    const userB = typeof match.userB === 'string' ? { _id: match.userB, name: 'User B', email: '' } : match.userB;
    return userA._id === currentUserId ? userB : userA;
  };

  const matchedUser = getMatchedUser();

  // Load messages from API
  const loadMessages = useCallback(async () => {
    try {
      const response = await apiService.getMessages(match._id);
      if (response.success) {
        // Merge existing messages with new messages to prevent duplicates
        setMessages(prevMessages => {
          // Create a map of existing messages by ID for quick lookup
          const messageMap = new Map<string, Message>();
          
          // Add existing messages to map first
          prevMessages.forEach(msg => {
            messageMap.set(msg._id, msg);
          });
          
          // Process new messages from API
          let hasNewMessages = false;
          response.data.forEach(apiMsg => {
            // Skip if we already have this message by ID
            if (messageMap.has(apiMsg._id)) return;
            
            // Create a fingerprint for this message
            const msgFingerprint = `${apiMsg.senderId}:${apiMsg.content}:${apiMsg.timestamp.substring(0, 19)}`;
            
            // Check if this might be a duplicate of a message we just sent
            if (apiMsg.senderId === currentUserId && localMessagesRef.current.has(msgFingerprint)) {
              console.log('Skipping duplicate message from API:', apiMsg);
              // We already have this message locally (probably with a temp ID)
              // Find the local message with matching content and replace it with the API version
              const localMsgIndex = prevMessages.findIndex(
                m => m.senderId === currentUserId && 
                     m.content === apiMsg.content &&
                     Math.abs(new Date(m.timestamp).getTime() - new Date(apiMsg.timestamp).getTime()) < 5000 // within 5 seconds
              );
              
              if (localMsgIndex !== -1) {
                // Replace the local message with the server version
                const updatedMsg = { ...apiMsg };
                messageMap.set(updatedMsg._id, updatedMsg);
                
                // Also add the real ID to our fingerprint set
                localMessagesRef.current.add(apiMsg._id);
                
                hasNewMessages = true;
                return;
              }
            }
            
            // It's a genuinely new message
            messageMap.set(apiMsg._id, apiMsg);
            hasNewMessages = true;
          });
          
          // If no new messages, don't update state
          if (!hasNewMessages) {
            return prevMessages;
          }
          
          // Convert map back to array and sort by timestamp
          const mergedMessages = Array.from(messageMap.values())
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            
          return mergedMessages;
        });
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  }, [match._id, currentUserId]);

  // Load message progress from API
  const loadMessageProgress = useCallback(async () => {
    try {
      const response = await apiService.getMessageProgress(match._id);
      if (response.success) {
        setMessageProgress(response.data);
      }
    } catch (error) {
      console.error('Failed to load message progress:', error);
    }
  }, [match._id]);

  // Fetch user state
  const fetchUserState = useCallback(async () => {
    try {
      const response = await apiService.getUserState(currentUserId);
      if (response.success) {
        setLocalUserState(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch user state:', error);
    }
  }, [currentUserId]);

  // Cleanup socket listeners
  const cleanupSocketListeners = useCallback(() => {
    socketCleanupRef.current.forEach(cleanup => cleanup());
    socketCleanupRef.current = [];
  }, []);

  // Setup socket listeners
  const setupSocketListeners = useCallback(() => {
    // Clear previous listeners first
    cleanupSocketListeners();
    
    // Make sure we have a socket connection
    if (!socketService.isConnected()) {
      socketService.connect();
      
      // Wait for connection to be established
      setTimeout(() => {
        socketService.authenticate(currentUserId);
        socketService.joinMatch(match._id);
        console.log('Delayed authentication and match join after connection');
      }, 500);
    } else {
      socketService.authenticate(currentUserId);
      socketService.joinMatch(match._id);
    }
    
    // Subscribe to match updates to get real-time state changes
    socketService.subscribeToMatches();
    socketService.requestMatchUpdates();
    
    // Register message handler
    const messageHandler = socketService.onNewMessage((data) => {
      console.log('New message received via socket:', data);
      
      // Add message to state if it doesn't exist already
      setMessages(prev => {
        // Check if message already exists by ID
        const existsById = prev.some(m => m._id === data._id);
        if (existsById) {
          return prev;
        }
        
        // For messages from the current user, check if this is a duplicate of a message we just sent
        if (data.senderId === currentUserId) {
          // Create fingerprint for this message
          const msgFingerprint = `${data.senderId}:${data.content}:${data.timestamp.substring(0, 19)}`;
          
          // Check if we already tracked this message locally
          if (localMessagesRef.current.has(msgFingerprint)) {
            console.log('Received own message back from socket, updating local copy');
            
            // Find temp message with matching content
            const tempMessageIndex = prev.findIndex(m => 
              m.senderId === currentUserId && 
              m.content === data.content &&
              m._id.startsWith('temp-') &&
              Math.abs(new Date(m.timestamp).getTime() - new Date(data.timestamp).getTime()) < 5000 // within 5 seconds
            );
            
            if (tempMessageIndex !== -1) {
              // Replace temp message with the server version
              const updatedMessages = [...prev];
              updatedMessages[tempMessageIndex] = data;
              
              // Add the real message ID to fingerprints
              localMessagesRef.current.add(data._id);
              
              return updatedMessages;
            }
          }
          
          // Check for content & time based duplication (even if we don't have a fingerprint)
          const similarMessageExists = prev.some(m => 
            m.senderId === data.senderId && 
            m.content === data.content && 
            Math.abs(new Date(m.timestamp).getTime() - new Date(data.timestamp).getTime()) < 5000
          );
          
          if (similarMessageExists) {
            console.log('Skipping similar message from socket');
            return prev;
          }
        }
        
        // It's a genuinely new message
        const newMessage = {
          _id: data._id,
          matchId: data.matchId, 
          senderId: data.senderId,
          content: data.content,
          timestamp: data.timestamp
        };
        
        // Create a new array with the new message
        const updatedMessages = [...prev, newMessage].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        return updatedMessages;
      });
      
      // Update message progress after receiving a new message
      loadMessageProgress();
      
      // Reset other user typing state
      if (data.senderId !== currentUserId) {
        setOtherUserTyping(false);
      }
    });
    
    // Register typing indicators
    const typingHandler = socketService.onUserTyping((data) => {
      if (data.userId !== currentUserId && data.matchId === match._id) {
        setOtherUserTyping(true);
      }
    });
    
    const stoppedTypingHandler = socketService.onUserStoppedTyping((data) => {
      if (data.userId !== currentUserId && data.matchId === match._id) {
        setOtherUserTyping(false);
      }
    });
    
    // Video unlock handler
    const videoUnlockHandler = socketService.onVideoUnlocked((data) => {
      if (data.matchId === match._id && data.unlocked) {
        loadMessageProgress();
      }
    });
    
    // Error handler
    const errorHandler = socketService.onError((error) => {
      console.error('Socket error:', error);
    });
      // Match update handler for state changes
    const matchUpdateHandler = socketService.onMatchUpdate((data) => {
      if (data.matchId === match._id) {
        console.log('Match update received in chat:', data);
        
        // Always refresh user state on any match update
        fetchUserState();
      }
    });
    
    // Store cleanup functions
    socketCleanupRef.current = [
      messageHandler,
      typingHandler,
      stoppedTypingHandler,
      videoUnlockHandler,
      errorHandler,
      matchUpdateHandler
    ];
    
    // Set socket connected state
    setSocketConnected(socketService.isConnected());
    
  }, [match._id, currentUserId, loadMessageProgress, cleanupSocketListeners, fetchUserState]);

  // Effect for initial setup
  useEffect(() => {
    loadMessages();
    loadMessageProgress();
    setupSocketListeners();
    
    // Store a reference to the current Set for cleanup
    const localMessages = localMessagesRef.current;

    // Poll for new messages every 10 seconds as a fallback in case sockets fail
    const messagePollingId = setInterval(() => {
      loadMessages();
    }, 10000);

    // Check socket connection status every 3 seconds
    const intervalId = setInterval(() => {
      const connected = socketService.isConnected();
      setSocketConnected(connected);
      
      if (!connected) {
        console.log('Socket disconnected, attempting to reconnect...');
        socketService.reconnect();
        setTimeout(() => {
          if (socketService.isConnected()) {
            setupSocketListeners();
            loadMessages(); // Fetch messages immediately after reconnection
            setSocketConnected(true);
          }
        }, 1000);
      }
    }, 3000);

    return () => {
      // Clear any pending typing timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Clean up socket listeners
      cleanupSocketListeners();
      
      // Clear intervals
      clearInterval(intervalId);
      clearInterval(messagePollingId);
      
      // Clear local message tracking
      localMessages.clear();
    };
  }, [match._id, loadMessages, loadMessageProgress, setupSocketListeners, cleanupSocketListeners]);

  // Handle changes to socket connection status
  useEffect(() => {
    if (socketConnected) {
      // When socket reconnects, refresh data
      loadMessages();
      loadMessageProgress();
      
      // Join chat room and subscribe to updates
      socketService.joinMatch(match._id);
      socketService.subscribeToMatches();
      socketService.requestMatchUpdates();
    }
  }, [socketConnected, match._id, loadMessages, loadMessageProgress]);
  // Update local user state when prop changes
  useEffect(() => {
    setLocalUserState(userState);
  }, [userState]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const messageContent = inputMessage.trim();
    setInputMessage('');

    try {
      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;
      const currentTime = new Date().toISOString();
      
      // Create a fingerprint for this message to detect duplicates later
      const messageFingerprint = `${currentUserId}:${messageContent}:${currentTime.substring(0, 19)}`; // match up to seconds precision
      localMessagesRef.current.add(messageFingerprint);
      
      // Add the message to state immediately (optimistic update)
      const newMessage: Message = {
        _id: tempId,
        matchId: match._id,
        senderId: currentUserId,
        content: messageContent,
        timestamp: currentTime
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Send via socket for real-time delivery
      const socketSent = socketService.sendMessage(match._id, messageContent);
      
      // If socket failed or not connected, send via REST API as fallback
      if (!socketSent) {
        const response = await apiService.sendMessage(match._id, messageContent);
        if (response.success) {
          // Replace the temp message with the real one from the API
          setMessages(prev => 
            prev.map(msg => msg._id === tempId ? response.data : msg)
          );
          
          // Update the fingerprint with the real message ID for future reference
          localMessagesRef.current.add(`${response.data._id}`);
        }
      }
      
      // Clean up old fingerprints after 1 minute to prevent memory leaks
      setTimeout(() => {
        localMessagesRef.current.delete(messageFingerprint);
      }, 60000);
      
      // Refresh progress after sending
      loadMessageProgress();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleInputChange = (value: string) => {
    setInputMessage(value);

    if (value && !isTyping) {
      setIsTyping(true);
      socketService.startTyping(match._id);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.stopTyping(match._id);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button
              onClick={onBack}
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
              className="mr-3"
            >
              Back
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{matchedUser.name}</h2>
              {otherUserTyping && (
                <p className="text-sm text-gray-500">typing...</p>
              )}
            </div>
          </div>
          
          {(match.videoUnlocked || messageProgress?.isUnlocked) && (
            <Button
              onClick={onVideoCall}
              variant="secondary"
              size="sm"
              icon={Video}
            >
              Video Call
            </Button>
          )}
        </div>        {/* State Timer Information */}
        {localUserState && localUserState.currentState === 'frozen' && localUserState.freezeUntil && (
          <div className="mb-4 mt-2">
            <StateTimer 
              state="frozen" 
              endTime={localUserState.freezeUntil}
              onExpired={fetchUserState}
            />
          </div>
        )}

        {localUserState && localUserState.currentState === 'waiting' && localUserState.waitUntil && (
          <div className="mb-4 mt-2">
            <StateTimer 
              state="waiting" 
              endTime={localUserState.waitUntil}
              onExpired={fetchUserState}
            />
          </div>
        )}

        {messageProgress && (
          <div className="mt-4">
            <ProgressBar
              progress={messageProgress.messagesExchanged}
              max={messageProgress.messagesRequired}
              label="Progress to Video Call"
              color="secondary"
            />
            <p className="text-sm text-gray-500 mt-1">
              {messageProgress.messagesRemaining} messages remaining • {Math.floor(messageProgress.timeRemaining)}h left
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isCurrentUserMessage = message.senderId === currentUserId;
          return (
            <div
              key={message._id}
              className={`flex ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  isCurrentUserMessage
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white'
                    : 'bg-white text-gray-900 border border-gray-200'
                }`}
              >
                <p>{message.content}</p>
                <p className={`text-xs mt-1 ${
                  isCurrentUserMessage ? 'text-rose-100' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex gap-3">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent"
          />
          <Button
            type="submit"
            disabled={!inputMessage.trim()}
            icon={Send}
            size="lg"
          >
            Send
          </Button>
        </form>
        <div className="flex items-center mt-2">
          <div className={`w-2 h-2 rounded-full mr-2 ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-500">
            {socketConnected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>
      </div>
    </div>
  );
};
