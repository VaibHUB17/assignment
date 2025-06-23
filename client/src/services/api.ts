import {
  ApiError,
  AuthResponse,
  Match,
  MatchResponse,
  MessageProgressResponse,
  MessageResponse,
  MessagesResponse,
  RegisterData,
  User,
  UserStateResponse,
  VideoStatusResponse
} from '../types';

const API_BASE_URL = 'http://localhost:5000/api/v1';

class ApiService {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  // Check if the token is valid
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  // Generic request method with improved error handling
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers
        }
      });

      const data = await response.json();

      if (!response.ok) {
        // Extract error message or use fallback
        const errorMessage = data.message || 'Request failed';
        const error: ApiError = {
          message: errorMessage,
          code: response.status
        };
        throw error;
      }

      return data as T;
    } catch (error: unknown) {
      // Make sure we have a consistent error format
      if (typeof error === 'object' && error !== null) {
        const err = error as Partial<ApiError>;
        if (err.message && err.code) {
          throw error;
        } else if (error instanceof SyntaxError) {
          throw { message: 'Invalid response format', code: 500 } as ApiError;
        } else if (error instanceof TypeError && (error as TypeError).message.includes('Failed to fetch')) {
          throw { message: 'Network error. Server might be down.', code: 0 } as ApiError;
        } else {
          throw { message: err.message || 'Unknown error occurred', code: 500 } as ApiError;
        }
      } else {
        throw { message: 'Unknown error occurred', code: 500 } as ApiError;
      }
    }
  }

  // Auth endpoints
  async register(userData: RegisterData): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }).then(response => {
      if (response.success && response.token) {
        localStorage.setItem('token', response.token);
      }
      return response;
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }).then(response => {
      if (response.success && response.token) {
        localStorage.setItem('token', response.token);
      }
      return response;
    });
  }

  async logout(): Promise<{ success: boolean }> {
    const response = await this.request<{ success: boolean }>('/auth/logout');
    localStorage.removeItem('token');
    return response;
  }

  async getCurrentUser(): Promise<{ success: boolean; data: User }> {
    return this.request<{ success: boolean; data: User }>('/auth/me');
  }

  // User endpoints
  async getUserState(userId: string): Promise<UserStateResponse> {
    return this.request<UserStateResponse>(`/users/state/${userId}`);
  }

  // Match endpoints
  async getDailyMatch(): Promise<MatchResponse> {
    return this.request<MatchResponse>('/match/daily');
  }

  async pinMatch(matchId: string): Promise<{ success: boolean; data: Match; message: string }> {
    return this.request<{ success: boolean; data: Match; message: string }>('/match/pin', {
      method: 'POST',
      body: JSON.stringify({ matchId })
    });
  }

  async unpinMatch(matchId: string, feedback: string): Promise<{ 
    success: boolean; 
    data: { match: Match; userState: { state: string; freezeUntil: string } };
    message: string;
  }> {
    return this.request<{ 
      success: boolean; 
      data: { match: Match; userState: { state: string; freezeUntil: string } };
      message: string;
    }>('/match/unpin', {
      method: 'POST',
      body: JSON.stringify({ matchId, feedback })
    });
  }

  // Message endpoints
  async getMessages(matchId: string): Promise<MessagesResponse> {
    return this.request<MessagesResponse>(`/messages/${matchId}`);
  }

  async sendMessage(matchId: string, content: string): Promise<MessageResponse> {
    return this.request<MessageResponse>('/messages/send', {
      method: 'POST',
      body: JSON.stringify({ matchId, content })
    });
  }

  async getMessageProgress(matchId: string): Promise<MessageProgressResponse> {
    return this.request<MessageProgressResponse>(`/messages/progress/${matchId}`);
  }

  // Video endpoints
  async getVideoStatus(matchId: string): Promise<VideoStatusResponse> {
    return this.request<VideoStatusResponse>(`/video/status/${matchId}`);
  }

  async unlockVideo(matchId: string): Promise<VideoStatusResponse> {
    return this.request<VideoStatusResponse>(`/video/unlock/${matchId}`, {
      method: 'POST'
    });
  }
}

export const apiService = new ApiService();