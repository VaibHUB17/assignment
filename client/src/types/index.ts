// WebSocket Event Types
export interface WebSocketEvent<T = unknown> {
  type: string;
  payload: T;
}

export interface SocketMessage {
  _id: string;
  matchId: string;
  content: string;
  senderId: string;
  timestamp: string;
}

export interface SocketTypingEvent {
  matchId: string;
  userId: string;
  isTyping: boolean;
}

export interface SocketMatchUpdate {
  matchId: string;
  status: string;
  users: string[];
  timestamp: string;
  lastActivity?: string;
  messagesExchanged?: number;
  videoUnlocked?: boolean;
}

export interface SocketVideoEvent {
  matchId: string;
  unlocked: boolean;
  timestamp: string;
}

export interface SocketError {
  message: string;
  code?: string;
}

// User Types
export interface User {
  _id: string;
  name: string;
  email: string;
  emotionalTraits: string[];
  psychologicalTraits: string[];
  behavioralPatterns: string[];
  relationshipValues: string[];
  currentState: 'available' | 'matched' | 'frozen' | 'waiting';
  currentMatchId: string | null;
  freezeUntil: string | null;
  waitUntil: string | null;
  assessmentScore: number;
  createdAt: string;
}

// User State Type
export interface UserState {
  currentState: 'available' | 'matched' | 'frozen' | 'waiting';
  match?: Match;
  freezeUntil?: string;
  freezeRemaining?: number;
  waitUntil?: string;
  waitRemaining?: number;
}

// Auth Types
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  emotionalTraits: string[];
  psychologicalTraits: string[];
  behavioralPatterns: string[];
  relationshipValues: string[];
}

export interface AuthResponse {
  success: boolean;
  token: string;
  message?: string;
}

// Match Types
export interface Match {
  _id: string;
  userA: string | UserProfile;
  userB: string | UserProfile;
  pinned: boolean;
  startTime: string;
  unpinnedBy: string | null;
  messagesExchanged: number;
  videoUnlocked: boolean;
  feedback: string | null;
  isActive: boolean;
}

// Simplified User Profile (used in Match)
export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  emotionalTraits?: string[];
  psychologicalTraits?: string[];
  behavioralPatterns?: string[];
  relationshipValues?: string[];
}

export interface MatchResponse {
  success: boolean;
  data: {
    match: Match;
    matchedUser: UserProfile;
  };
}

// Message Types
export interface Message {
  _id: string;
  matchId: string;
  senderId: string;
  content: string;
  timestamp: string;
}

export interface MessagesResponse {
  success: boolean;
  data: Message[];
}

export interface MessageResponse {
  success: boolean;
  data: Message;
}

export interface MessageProgress {
  messagesExchanged: number;
  messagesRequired: number;
  messagesRemaining: number;
  timeElapsed: number;
  timeRemaining: number;
  timeWindow: number;
  isUnlocked: boolean;
}

export interface MessageProgressResponse {
  success: boolean;
  data: MessageProgress;
}

// Video Types
export interface VideoStatusResponse {
  success: boolean;
  data: {
    matchId: string;
    videoUnlocked: boolean;
    messagesExchanged: number;
  };
}

// User State
export interface UserStateResponse {
  success: boolean;
  data: {
    currentState: 'available' | 'matched' | 'frozen' | 'waiting';
    match?: Match;
    freezeUntil?: string;
    freezeRemaining?: number;
    waitUntil?: string;
    waitRemaining?: number;
  };
}

// API Error
export interface ApiError {
  message: string;
  code?: number;
}