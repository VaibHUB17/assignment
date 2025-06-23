import React from 'react';
import { Clock, Heart } from 'lucide-react';
import { Card } from '../UI/Card';
import { useTimer } from '../../hooks/useTimer';

interface WaitingStateProps {
  waitUntil: string;
  onRefresh: () => void;
}

export const WaitingState: React.FC<WaitingStateProps> = ({ waitUntil, onRefresh }) => {
  const { formattedTime, isExpired } = useTimer(waitUntil);

  React.useEffect(() => {
    if (isExpired) {
      onRefresh();
    }
  }, [isExpired, onRefresh]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full mb-4">
            <Clock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Almost Ready</h1>
          <p className="text-gray-600">
            We're preparing your next perfect match. Just a little more patience!
          </p>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">New Match In</h2>
          <div className="text-3xl font-bold text-amber-600">
            {formattedTime}
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 mb-2">✨ Getting ready for you:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Finding someone who matches your personality</li>
              <li>• Ensuring mutual compatibility</li>
              <li>• Creating the perfect timing for connection</li>
              <li>• Setting up for meaningful conversation</li>
            </ul>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Heart className="w-4 h-4 mr-2 text-rose-400" />
              <span>Great matches are worth the wait</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};