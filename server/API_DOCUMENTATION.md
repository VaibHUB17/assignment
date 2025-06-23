# Lone Town API Documentation for Frontend Integration

This document provides comprehensive information about the Lone Town backend API endpoints, WebSocket events, data models, and authentication flow for easy frontend integration.

## Base URL

```
http://localhost:5000/api/v1
```

## Authentication

All protected routes require a JWT token in the Authorization header.

```
Authorization: Bearer <your_jwt_token>
```

### Authentication Endpoints

#### Register User

- **URL**: `/auth/register`
- **Method**: `POST`
- **Description**: Register a new user with compatibility traits
- **Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "emotionalTraits": ["empathetic", "calm", "sensitive"],
  "psychologicalTraits": ["introverted", "analytical", "creative"],
  "behavioralPatterns": ["early-riser", "organized", "planner"],
  "relationshipValues": ["honesty", "communication", "independence"]
}
```
- **Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Login User

- **URL**: `/auth/login`
- **Method**: `POST`
- **Description**: Login a user and receive a JWT token
- **Request Body**:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
- **Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Logout User

- **URL**: `/auth/logout`
- **Method**: `GET`
- **Description**: Logout user and clear cookie
- **Response**:
```json
{
  "success": true,
  "data": {}
}
```

#### Get Current User

- **URL**: `/auth/me`
- **Method**: `GET`
- **Description**: Get the currently logged-in user's details
- **Response**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec8c41b3a22e90da1234",
    "name": "John Doe",
    "email": "john@example.com",
    "emotionalTraits": ["empathetic", "calm", "sensitive"],
    "psychologicalTraits": ["introverted", "analytical", "creative"],
    "behavioralPatterns": ["early-riser", "organized", "planner"],
    "relationshipValues": ["honesty", "communication", "independence"],
    "currentState": "available",
    "currentMatchId": null,
    "freezeUntil": null,
    "waitUntil": null,
    "assessmentScore": 0,
    "createdAt": "2023-06-25T14:30:22.123Z"
  }
}
```

## User Management

### User Endpoints

#### Get User Profile

- **URL**: `/users/profile/:id`
- **Method**: `GET`
- **Description**: Get a user's profile information
- **Response**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec8c41b3a22e90da1234",
    "name": "John Doe",
    "email": "john@example.com",
    "emotionalTraits": ["empathetic", "calm", "sensitive"],
    "psychologicalTraits": ["introverted", "analytical", "creative"],
    "behavioralPatterns": ["early-riser", "organized", "planner"],
    "relationshipValues": ["honesty", "communication", "independence"],
    "currentState": "available",
    "createdAt": "2023-06-25T14:30:22.123Z"
  }
}
```

#### Get User State

- **URL**: `/users/state/:id`
- **Method**: `GET`
- **Description**: Get a user's current state and related information
- **Response** (varies based on state):
```json
{
  "success": true,
  "data": {
    "currentState": "available"
  }
}
```

```json
{
  "success": true,
  "data": {
    "currentState": "matched",
    "match": {
      "_id": "60d5ec8c41b3a22e90da5678",
      "userA": {
        "_id": "60d5ec8c41b3a22e90da1234",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "userB": {
        "_id": "60d5ec8c41b3a22e90da5678",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "pinned": true,
      "startTime": "2023-06-25T14:30:22.123Z",
      "unpinnedBy": null,
      "messagesExchanged": 42,
      "videoUnlocked": false,
      "feedback": null
    }
  }
}
```

```json
{
  "success": true,
  "data": {
    "currentState": "frozen",
    "freezeUntil": "2023-06-26T14:30:22.123Z",
    "freezeRemaining": 14.5
  }
}
```

```json
{
  "success": true,
  "data": {
    "currentState": "waiting",
    "waitUntil": "2023-06-25T16:30:22.123Z",
    "waitRemaining": 1.5
  }
}
```

#### Update User State (Admin)

- **URL**: `/users/state/update`
- **Method**: `POST`
- **Description**: Update a user's state (admin only)
- **Request Body**:
```json
{
  "userId": "60d5ec8c41b3a22e90da1234",
  "newState": "available",
  "reason": "Manual reset by admin"
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "60d5ec8c41b3a22e90da1234",
      "name": "John Doe",
      "currentState": "available",
      "currentMatchId": null,
      "freezeUntil": null,
      "waitUntil": null
    },
    "message": "User state updated to available",
    "reason": "Manual reset by admin"
  }
}
```

#### Get User Analytics

- **URL**: `/users/analytics/intent/:userId`
- **Method**: `GET`
- **Description**: Get user behavior analytics
- **Response**:
```json
{
  "success": true,
  "data": {
    "totalMatches": 15,
    "pinRatio": 0.73,
    "averageMessageCount": 56.4,
    "videoUnlockRatio": 0.33,
    "unpinnedTotal": 4,
    "messageTotal": 846,
    "videoUnlockedTotal": 5
  }
}
```

## Matching System

### Match Endpoints

#### Get Daily Match

- **URL**: `/match/daily`
- **Method**: `GET`
- **Description**: Get today's exclusive match for the user
- **Requires State**: `available`
- **Response** (existing match):
```json
{
  "success": true,
  "data": {
    "match": {
      "_id": "60d5ec8c41b3a22e90da5678",
      "userA": {
        "_id": "60d5ec8c41b3a22e90da1234",
        "name": "John Doe",
        "email": "john@example.com",
        "emotionalTraits": ["empathetic", "calm", "sensitive"],
        "psychologicalTraits": ["introverted", "analytical", "creative"]
      },
      "userB": {
        "_id": "60d5ec8c41b3a22e90da5678",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "emotionalTraits": ["expressive", "passionate", "energetic"],
        "psychologicalTraits": ["extroverted", "intuitive", "spontaneous"]
      },
      "pinned": true,
      "startTime": "2023-06-25T14:30:22.123Z",
      "unpinnedBy": null,
      "messagesExchanged": 0,
      "videoUnlocked": false,
      "feedback": null,
      "isActive": true
    },
    "matchedUser": {
      "_id": "60d5ec8c41b3a22e90da5678",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "emotionalTraits": ["expressive", "passionate", "energetic"],
      "psychologicalTraits": ["extroverted", "intuitive", "spontaneous"]
    }
  }
}
```

#### Pin Match

- **URL**: `/match/pin`
- **Method**: `POST`
- **Description**: Pin a match to continue conversation
- **Requires State**: `matched`
- **Request Body**:
```json
{
  "matchId": "60d5ec8c41b3a22e90da5678"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Match pinned successfully",
  "data": {
    "_id": "60d5ec8c41b3a22e90da5678",
    "userA": "60d5ec8c41b3a22e90da1234",
    "userB": "60d5ec8c41b3a22e90da5678",
    "pinned": true,
    "startTime": "2023-06-25T14:30:22.123Z",
    "unpinnedBy": null,
    "messagesExchanged": 42,
    "videoUnlocked": false,
    "feedback": null,
    "isActive": true
  }
}
```

#### Unpin Match

- **URL**: `/match/unpin`
- **Method**: `POST`
- **Description**: Unpin a match, trigger 24hr freeze & 2hr wait
- **Requires State**: `matched`
- **Request Body**:
```json
{
  "matchId": "60d5ec8c41b3a22e90da5678",
  "feedback": "We didn't have much in common." 
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Match unpinned successfully",
  "data": {
    "match": {
      "_id": "60d5ec8c41b3a22e90da5678",
      "userA": "60d5ec8c41b3a22e90da1234",
      "userB": "60d5ec8c41b3a22e90da5678",
      "pinned": false,
      "startTime": "2023-06-25T14:30:22.123Z",
      "unpinnedBy": "60d5ec8c41b3a22e90da1234",
      "messagesExchanged": 42,
      "videoUnlocked": false,
      "feedback": "We didn't have much in common.",
      "isActive": false
    },
    "userState": {
      "state": "frozen",
      "freezeUntil": "2023-06-26T14:30:22.123Z"
    }
  }
}
```

#### Get Match Feedback

- **URL**: `/match/feedback/:userId`
- **Method**: `GET`
- **Description**: Get feedback from last match
- **Response**:
```json
{
  "success": true,
  "data": {
    "match": {
      "_id": "60d5ec8c41b3a22e90da5678",
      "userA": "60d5ec8c41b3a22e90da1234",
      "userB": "60d5ec8c41b3a22e90da5678",
      "pinned": false,
      "startTime": "2023-06-25T14:30:22.123Z",
      "unpinnedBy": "60d5ec8c41b3a22e90da1234",
      "messagesExchanged": 42,
      "videoUnlocked": false,
      "feedback": "We didn't have much in common."
    },
    "feedback": {
      "_id": "60d5ec8c41b3a22e90da9876",
      "userId": "60d5ec8c41b3a22e90da1234",
      "matchId": "60d5ec8c41b3a22e90da5678",
      "feedbackText": "We didn't have much in common.",
      "createdAt": "2023-06-25T18:30:22.123Z"
    }
  }
}
```

## Messaging System

### Message Endpoints

#### Get Messages

- **URL**: `/messages/:matchId`
- **Method**: `GET`
- **Description**: Fetch chat history for a match
- **Requires State**: `matched`
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "60d5ec8c41b3a22e90da1111",
      "matchId": "60d5ec8c41b3a22e90da5678",
      "senderId": "60d5ec8c41b3a22e90da1234",
      "content": "Hi there! Nice to meet you!",
      "timestamp": "2023-06-25T14:35:22.123Z"
    },
    {
      "_id": "60d5ec8c41b3a22e90da2222",
      "matchId": "60d5ec8c41b3a22e90da5678",
      "senderId": "60d5ec8c41b3a22e90da5678",
      "content": "Hello! Nice to meet you too!",
      "timestamp": "2023-06-25T14:36:22.123Z"
    }
  ]
}
```

#### Send Message (REST Fallback)

- **URL**: `/messages/send`
- **Method**: `POST`
- **Description**: Send message via REST API (fallback for WebSockets)
- **Requires State**: `matched`
- **Request Body**:
```json
{
  "matchId": "60d5ec8c41b3a22e90da5678",
  "content": "How's your day going?"
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "_id": "60d5ec8c41b3a22e90da3333",
    "matchId": "60d5ec8c41b3a22e90da5678",
    "senderId": "60d5ec8c41b3a22e90da1234",
    "content": "How's your day going?",
    "timestamp": "2023-06-25T14:40:22.123Z"
  }
}
```

#### Get Message Progress

- **URL**: `/messages/progress/:matchId`
- **Method**: `GET`
- **Description**: Get message count and progress toward video call
- **Requires State**: `matched`
- **Response**:
```json
{
  "success": true,
  "data": {
    "messagesExchanged": 42,
    "messagesRequired": 100,
    "messagesRemaining": 58,
    "timeElapsed": 12.5,
    "timeRemaining": 35.5,
    "timeWindow": 48,
    "isUnlocked": false
  }
}
```

#### Check Video Eligibility

- **URL**: `/messages/unlock-video/:matchId`
- **Method**: `GET`
- **Description**: Check if video call can be unlocked
- **Requires State**: `matched`
- **Response**:
```json
{
  "success": true,
  "data": {
    "isEligible": false,
    "messagesExchanged": 42,
    "messagesRequired": 100,
    "timeElapsed": 12.5,
    "timeRemaining": 35.5
  }
}
```

## Video Call System

### Video Call Endpoints

#### Unlock Video Call

- **URL**: `/video/unlock/:matchId`
- **Method**: `POST`
- **Description**: Mark match as video-call eligible
- **Requires State**: `matched`
- **Response**:
```json
{
  "success": true,
  "message": "Video calling has been unlocked for this match",
  "data": {
    "matchId": "60d5ec8c41b3a22e90da5678",
    "videoUnlocked": true,
    "messagesExchanged": 102
  }
}
```

#### Get Video Status

- **URL**: `/video/status/:matchId`
- **Method**: `GET`
- **Description**: Check video call unlock status
- **Requires State**: `matched`
- **Response**:
```json
{
  "success": true,
  "data": {
    "matchId": "60d5ec8c41b3a22e90da5678",
    "videoUnlocked": true,
    "messagesExchanged": 102
  }
}
```

## Timer System

### Timer Endpoints

#### Start Freeze

- **URL**: `/timers/start-freeze`
- **Method**: `POST`
- **Description**: Trigger 24hr freeze for user (admin)
- **Request Body**:
```json
{
  "userId": "60d5ec8c41b3a22e90da1234",
  "duration": 24
}
```
- **Response**:
```json
{
  "success": true,
  "message": "User 60d5ec8c41b3a22e90da1234 frozen for 24 hours",
  "data": {
    "userId": "60d5ec8c41b3a22e90da1234",
    "state": "frozen",
    "freezeUntil": "2023-06-26T14:30:22.123Z"
  }
}
```

#### Start Wait

- **URL**: `/timers/start-wait`
- **Method**: `POST`
- **Description**: Trigger 2hr wait for new match (admin)
- **Request Body**:
```json
{
  "userId": "60d5ec8c41b3a22e90da5678",
  "duration": 2
}
```
- **Response**:
```json
{
  "success": true,
  "message": "User 60d5ec8c41b3a22e90da5678 set to waiting for 2 hours",
  "data": {
    "userId": "60d5ec8c41b3a22e90da5678",
    "state": "waiting",
    "waitUntil": "2023-06-25T16:30:22.123Z"
  }
}
```

## WebSocket Events

### Connection

```javascript
// Connect to Socket.io server
const socket = io('http://localhost:5000');
```

### Authentication

```javascript
// Authenticate the socket with user ID
socket.emit('authenticate', { userId: '60d5ec8c41b3a22e90da1234' });

// Listen for authentication success
socket.on('authenticated', (response) => {
  console.log('Socket authenticated:', response.success);
});
```

### Joining a Match

```javascript
// Join a match chat room
socket.emit('joinMatch', { matchId: '60d5ec8c41b3a22e90da5678' });

// Listen for join success
socket.on('joinedMatch', (response) => {
  console.log('Joined match room:', response.matchId);
});
```

### Messaging

```javascript
// Send a message
socket.emit('sendMessage', {
  matchId: '60d5ec8c41b3a22e90da5678',
  content: 'Hello there!'
});

// Listen for new messages
socket.on('newMessage', (data) => {
  console.log('New message:', data.message);
  console.log('From user:', data.sender);
});
```

### Typing Indicators

```javascript
// Emit typing indicator
socket.emit('typing', { matchId: '60d5ec8c41b3a22e90da5678' });

// Emit stop typing
socket.emit('stopTyping', { matchId: '60d5ec8c41b3a22e90da5678' });

// Listen for typing indicators
socket.on('userTyping', (data) => {
  console.log('User is typing:', data.userId);
});

socket.on('userStoppedTyping', (data) => {
  console.log('User stopped typing:', data.userId);
});
```

### Video Call Unlocked

```javascript
// Listen for video call unlock event
socket.on('videoUnlocked', (data) => {
  console.log('Video calling unlocked for match:', data.matchId);
  console.log('Messages exchanged:', data.messagesExchanged);
});
```

### Error Handling

```javascript
// Listen for errors
socket.on('error', (error) => {
  console.error('Socket error:', error.message);
});
```

## Data Models

### User

```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  passwordHash: String,
  emotionalTraits: [String],
  psychologicalTraits: [String],
  behavioralPatterns: [String],
  relationshipValues: [String],
  currentState: "available" | "matched" | "frozen" | "waiting",
  currentMatchId: ObjectId | null,
  freezeUntil: Date | null,
  waitUntil: Date | null,
  assessmentScore: Number,
  createdAt: Date
}
```

### Match

```javascript
{
  _id: ObjectId,
  userA: ObjectId,
  userB: ObjectId,
  pinned: Boolean,
  startTime: Date,
  unpinnedBy: ObjectId | null,
  messagesExchanged: Number,
  videoUnlocked: Boolean,
  feedback: String | null,
  isActive: Boolean
}
```

### Message

```javascript
{
  _id: ObjectId,
  matchId: ObjectId,
  senderId: ObjectId,
  content: String,
  timestamp: Date
}
```

### Feedback

```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  matchId: ObjectId,
  feedbackText: String,
  createdAt: Date
}
```

## State Management Flow

### User States

1. **Available**
   - Can receive daily match
   - No active matches
   - No time restrictions

2. **Matched**
   - Has an active match
   - Can send/receive messages
   - Can pin/unpin match
   - Can unlock video if milestone met

3. **Frozen**
   - Result of unpinning a match
   - 24-hour reflection period
   - Automatically transitions to "available" after time expires

4. **Waiting**
   - Result of being unpinned by match
   - 2-hour waiting period for new match
   - Automatically transitions to "available" after time expires

### State Transitions

```
Available → Matched (When matched with another user)
Matched → Frozen (When user unpins match)
Matched → Waiting (When user is unpinned by match)
Frozen → Available (After 24 hours)
Waiting → Available (After 2 hours)
```

## Error Codes and Messages

- **400** - Bad Request (Invalid input)
- **401** - Unauthorized (Invalid/missing token)
- **403** - Forbidden (Wrong user state or unauthorized role)
- **404** - Not Found (Resource doesn't exist)
- **500** - Server Error

## Frontend Integration Guide

1. **Authentication Flow**
   - Register user with compatibility traits
   - Login to obtain JWT token
   - Store token in localStorage/sessionStorage
   - Include token in all subsequent requests

2. **User State Management**
   - Check user state on app load
   - Display appropriate UI based on state:
     - Available: Show match button
     - Matched: Show chat interface
     - Frozen: Show countdown timer
     - Waiting: Show countdown timer

3. **Matching Process**
   - Use `GET /match/daily` to retrieve daily match
   - Display match profile information
   - Provide pin/unpin options

4. **Real-time Messaging**
   - Connect to Socket.io server
   - Authenticate socket connection
   - Join match room
   - Send/receive messages in real time
   - Fallback to REST API if socket unavailable

5. **Video Call Unlocking**
   - Track progress toward video call milestone
   - Display progress bar (messages/time)
   - Unlock video call UI when milestone achieved
   - Implement preferred video call solution

6. **Reflection/Waiting Period**
   - Display countdown timers
   - Show motivational content during freeze period
   - Provide feedback form during waiting period

## Sample Frontend Code Snippets

### Authentication

```javascript
// Register a new user
async function registerUser(userData) {
  const response = await fetch('http://localhost:5000/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('token', data.token);
    return true;
  }
  return false;
}

// Login user
async function loginUser(email, password) {
  const response = await fetch('http://localhost:5000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('token', data.token);
    return true;
  }
  return false;
}

// Get authenticated user
async function getCurrentUser() {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:5000/api/v1/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
}
```

### Matching

```javascript
// Get daily match
async function getDailyMatch() {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:5000/api/v1/match/daily', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
}

// Unpin match
async function unpinMatch(matchId, feedback) {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:5000/api/v1/match/unpin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ matchId, feedback })
  });
  
  return await response.json();
}
```

### Real-time Chat

```javascript
// Setup chat with Socket.io
function setupChat(userId, matchId) {
  const socket = io('http://localhost:5000');
  
  // Authenticate
  socket.emit('authenticate', { userId });
  
  socket.on('authenticated', () => {
    // Join match room
    socket.emit('joinMatch', { matchId });
    
    // Listen for messages
    socket.on('newMessage', (data) => {
      // Add message to UI
      addMessageToChat(data.message);
      
      // Check for video unlocked
      if (data.match && data.match.videoUnlocked) {
        enableVideoCallButton();
      }
    });
    
    // Listen for video unlock
    socket.on('videoUnlocked', () => {
      enableVideoCallButton();
    });
  });
  
  // Send message function
  function sendMessage(content) {
    socket.emit('sendMessage', { matchId, content });
  }
  
  return { socket, sendMessage };
}
```

### User State Management

```javascript
// Check and handle user state
async function handleUserState(userId) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`http://localhost:5000/api/v1/users/state/${userId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const { data } = await response.json();
  
  switch(data.currentState) {
    case 'available':
      showMatchInterface();
      break;
    case 'matched':
      showChatInterface(data.match);
      break;
    case 'frozen':
      showFreezeCountdown(data.freezeUntil);
      break;
    case 'waiting':
      showWaitingCountdown(data.waitUntil);
      break;
  }
  
  return data;
}

// Format time remaining for countdown
function formatTimeRemaining(targetDate) {
  const now = new Date();
  const targetTime = new Date(targetDate);
  const diffMs = targetTime - now;
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}
```

### Video Call Integration

```javascript
// Check video call status
async function checkVideoStatus(matchId) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`http://localhost:5000/api/v1/video/status/${matchId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const { data } = await response.json();
  return data.videoUnlocked;
}

// Get message progress
async function getMessageProgress(matchId) {
  const token = localStorage.getItem('token');
  
  const response = await fetch(`http://localhost:5000/api/v1/messages/progress/${matchId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const { data } = await response.json();
  updateProgressUI(data);
  
  return data;
}
```

## Deployment Considerations

1. **Environment Variables**
   - JWT_SECRET
   - MONGODB_URI
   - NODE_ENV
   - PORT

2. **CORS Configuration**
   - Update allowed origins for production

3. **WebSocket Security**
   - Implement proper authentication
   - Set up secure WebSocket (WSS)

4. **Rate Limiting**
   - Implemented for API endpoints
   - Consider for WebSocket connections

---

This documentation provides all the necessary information for creating a frontend that integrates with the Lone Town backend API. It covers authentication, state management, matching, messaging, and video call functionality.
