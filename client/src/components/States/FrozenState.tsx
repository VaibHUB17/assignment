import React from 'react';
import { Snowflake, Heart } from 'lucide-react';
import { Card } from '../UI/Card';
import { useTimer } from '../../hooks/useTimer';

interface FrozenStateProps {
  freezeUntil: string;
  onRefresh: () => void;
}

export const FrozenState: React.FC<FrozenStateProps> = ({ freezeUntil, onRefresh }) => {
  const { formattedTime, isExpired } = useTimer(freezeUntil);

  React.useEffect(() => {
    if (isExpired) {
      onRefresh();
    }
  }, [isExpired, onRefresh]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mb-4">
            <Snowflake className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reflection Time</h1>
          <p className="text-gray-600">
            Take some time to reflect on your last connection. You'll be able to find a new match soon.
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Time Remaining</h2>
          <div className="text-3xl font-bold text-blue-600">
            {formattedTime}
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-left">
            <h3 className="font-semibold text-gray-900 mb-2">💭 While you wait:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Think about what you learned from your last match</li>
              <li>• Consider what you're looking for in a connection</li>
              <li>• Practice self-care and personal reflection</li>
              <li>• Stay positive about future possibilities</li>
            </ul>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center justify-center text-sm text-gray-500">
              <Heart className="w-4 h-4 mr-2 text-rose-400" />
              <span>Quality connections take time</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};