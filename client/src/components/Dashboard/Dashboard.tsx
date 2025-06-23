import React, { useState, useEffect, useCallback } from 'react';
import { LogOut, User } from 'lucide-react';
import { Button } from '../UI/Button';
import { MatchCard } from '../Match/MatchCard';
import { ChatInterface } from '../Chat/ChatInterface';
import { AvailableState } from '../States/AvailableState';
import { FrozenState } from '../States/FrozenState';
import { WaitingState } from '../States/WaitingState';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { socketService } from '../../services/socket';
import { Match, UserState, MessageProgress } from '../../types';

export const Dashboard: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [userState, setUserState] = useState<UserState | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [messageProgress, setMessageProgress] = useState<MessageProgress | null>(null);
  const [currentView, setCurrentView] = useState<'match' | 'chat'>('match');
  const [loading, setLoading] = useState(true);

  const loadUserState = useCallback(async () => {
    if (!user) return;

    try {
      const response = await apiService.getUserState(user._id);
      if (response.success) {
        setUserState(response.data);
        
        if (response.data.match) {
          setCurrentMatch(response.data.match);
          loadMessageProgress(response.data.match._id);
        }
      }
    } catch (error) {
      console.error('Failed to load user state:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadMessageProgress = async (matchId: string) => {
    try {
      const response = await apiService.getMessageProgress(matchId);
      if (response.success) {
        setMessageProgress(response.data);
      }
    } catch (error) {
      console.error('Failed to load message progress:', error);
    }
  };

  const handleMatchFound = (match: Match) => {
    setCurrentMatch(match);
    setUserState({ currentState: 'matched', match });
    loadMessageProgress(match._id);
    refreshUser();
  };

  const handlePinMatch = async () => {
    if (!currentMatch) return;

    try {
      await apiService.pinMatch(currentMatch._id);
      setCurrentMatch(prev => prev ? { ...prev, pinned: true } : null);
    } catch (error) {
      console.error('Failed to pin match:', error);
    }
  };

  const handleUnpinMatch = async (feedback: string) => {
    if (!currentMatch) return;

    try {
      await apiService.unpinMatch(currentMatch._id, feedback);
      // After unpinning, user goes to frozen state
      loadUserState();
    } catch (error) {
      console.error('Failed to unpin match:', error);
    }
  };

  const handleVideoCall = () => {
    // Implement video call functionality
    alert('Video call feature would be implemented here with your preferred video solution (WebRTC, Agora, etc.)');
  };

  // Set up real-time updates
  useEffect(() => {
    if (user) {
      // Initial load
      loadUserState();
      
      // Request match updates from server
      socketService.subscribeToMatches();
      socketService.requestMatchUpdates();
      
      // Listen for match updates
      const unsubscribe = socketService.onMatchUpdate((data) => {
        console.log('Match update received in Dashboard:', data);
        
        // Reload user state when match is updated
        if (data.matchId && (data.updateType === 'new_match' || 
                            data.updateType === 'match_pinned' || 
                            data.updateType === 'match_unpinned')) {
          loadUserState();
        }
      });
      
      // Listen for all matches updated
      socketService.onMatchesUpdated((data) => {
        console.log('All matches updated:', data);
        if (data.matches && data.matches.length > 0) {
          loadUserState();
        }
      });
      
      return () => {
        // Clean up listeners
        unsubscribe();
      };
    }
  }, [user, loadUserState]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !userState) {
    return null;
  }

  // Header for dashboard
  const renderHeader = () => (
    <div className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-rose-600">Lone Town</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center mr-2">
              <User className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium text-gray-900 mr-3">{user.name}</span>
          </div>
          <Button
            onClick={logout}
            variant="ghost"
            size="sm"
            icon={LogOut}
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );

  // Render appropriate state
  switch (userState.currentState) {
    case 'available':
      return (
        <div className="min-h-screen flex flex-col">
          {renderHeader()}
          <div className="flex-grow">
            <AvailableState onMatchFound={handleMatchFound} />
          </div>
        </div>
      );

    case 'frozen':
      return (
        <div className="min-h-screen flex flex-col">
          {renderHeader()}
          <div className="flex-grow">
            <FrozenState 
              freezeUntil={userState.freezeUntil!} 
              onRefresh={loadUserState}
            />
          </div>
        </div>
      );

    case 'waiting':
      return (
        <div className="min-h-screen flex flex-col">
          {renderHeader()}
          <div className="flex-grow">
            <WaitingState 
              waitUntil={userState.waitUntil!} 
              onRefresh={loadUserState}
            />
          </div>
        </div>
      );

    case 'matched':
      if (!currentMatch || !user) return null;

      if (currentView === 'chat') {
        return (
          <ChatInterface
            match={currentMatch}
            currentUserId={user._id}
            onBack={() => setCurrentView('match')}
            onVideoCall={handleVideoCall}
          />
        );
      }

      return (
        <div className="min-h-screen flex flex-col">
          {renderHeader()}
          <div className="flex-grow bg-gradient-to-br from-rose-50 via-white to-purple-50 py-8 px-4">
            <MatchCard
              match={currentMatch}
              currentUserId={user._id}
              messageProgress={messageProgress}
              onPin={handlePinMatch}
              onUnpin={handleUnpinMatch}
              onStartChat={() => setCurrentView('chat')}
              onVideoCall={handleVideoCall}
            />
          </div>
        </div>
      );

    default:
      return null;
  }
};