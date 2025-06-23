import React, { useState, useEffect } from 'react';
import { Heart, Pin, PinOff, Video, MessageCircle } from 'lucide-react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { ProgressBar } from '../UI/ProgressBar';
import { Modal } from '../UI/Modal';
import { Match, MessageProgress } from '../../types';
import { socketService } from '../../services/socket';

interface MatchCardProps {
  match: Match;
  currentUserId: string;
  messageProgress: MessageProgress | null;
  onPin: () => void;
  onUnpin: (feedback: string) => void;
  onStartChat: () => void;
  onVideoCall?: () => void;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  match,
  currentUserId,
  messageProgress,
  onPin,
  onUnpin,
  onStartChat,
  onVideoCall
}) => {
  const [showUnpinModal, setShowUnpinModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  
  const matchedUser = match.userA._id === currentUserId ? match.userB : match.userA;
  const isVideoUnlocked = match.videoUnlocked;
  
  // Listen for real-time updates to this match
  useEffect(() => {
    if (match && match._id) {
      // Join the match room to get updates
      socketService.joinMatch(match._id);
      
      // Listen for match updates
      const unsubscribe = socketService.onMatchUpdate((data) => {
        if (data.matchId === match._id) {
          console.log('Match updated in MatchCard:', data);
          // The parent component will handle the updates by reloading the match
        }
      });
      
      return () => {
        // Clean up
        unsubscribe();
      };
    }
  }, [match, match._id]);

  const handleUnpin = () => {
    onUnpin(feedback);
    setShowUnpinModal(false);
    setFeedback('');
  };

  return (
    <>
      <Card className="max-w-md mx-auto" hover>
        <div className="text-center mb-6">
          <div className="w-32 h-32 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Heart className="w-16 h-16 text-white" fill="white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{matchedUser.name}</h2>
          <p className="text-gray-600">{matchedUser.email}</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Emotional Traits</h3>
            <div className="flex flex-wrap gap-2">
              {matchedUser.emotionalTraits.map(trait => (
                <span key={trait} className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm">
                  {trait}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Psychological Traits</h3>
            <div className="flex flex-wrap gap-2">
              {matchedUser.psychologicalTraits.map(trait => (
                <span key={trait} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                  {trait}
                </span>
              ))}
            </div>
          </div>
        </div>

        {messageProgress && (
          <div className="mb-6">
            <ProgressBar
              progress={messageProgress.messagesExchanged}
              max={messageProgress.messagesRequired}
              label="Progress to Video Call"
              color="secondary"
            />
            <p className="text-sm text-gray-500 mt-2">
              {messageProgress.messagesRemaining} messages remaining • {Math.floor(messageProgress.timeRemaining)}h left
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={onStartChat}
            className="w-full"
            icon={MessageCircle}
            size="lg"
          >
            Start Conversation
          </Button>

          {isVideoUnlocked && (
            <Button
              onClick={onVideoCall}
              variant="secondary"
              className="w-full"
              icon={Video}
              size="lg"
            >
              Video Call Available
            </Button>
          )}

          <div className="flex gap-3">
            {!match.pinned ? (
              <Button
                onClick={onPin}
                variant="outline"
                className="flex-1"
                icon={Pin}
              >
                Pin Match
              </Button>
            ) : (
              <Button
                onClick={() => setShowUnpinModal(true)}
                variant="danger"
                className="flex-1"
                icon={PinOff}
              >
                Unpin Match
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Modal
        isOpen={showUnpinModal}
        onClose={() => setShowUnpinModal(false)}
        title="Unpin Match"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to unpin this match? This will end your connection and you'll enter a 24-hour reflection period.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feedback (optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts about this match..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setShowUnpinModal(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUnpin}
              variant="danger"
              className="flex-1"
            >
              Unpin Match
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};