import React, { useState, useEffect } from 'react';
import { Heart, Sparkles, RefreshCw } from 'lucide-react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { apiService } from '../../services/api';
import { Match } from '../../types';

interface AvailableStateProps {
  onMatchFound: (match: Match) => void;
}

export const AvailableState: React.FC<AvailableStateProps> = ({ onMatchFound }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFindMatch = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await apiService.getDailyMatch();
      if (response.success && response.data.match) {
        onMatchFound(response.data.match);
      } else {
        setError('No matches available today. Try again tomorrow!');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to find a match');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-purple-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full mb-6">
            <Heart className="w-12 h-12 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Ready for Love</h1>
          <p className="text-gray-600 text-lg">
            Your daily match is waiting to be discovered
          </p>
        </div>

        <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-rose-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">How It Works</h2>
          </div>
          <ul className="text-sm text-gray-600 space-y-2 text-left">
            <li>• Get one carefully selected match per day</li>
            <li>• Start meaningful conversations</li>
            <li>• Unlock video calls after 100 messages</li>
            <li>• Pin matches you want to continue with</li>
          </ul>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <Button
          onClick={handleFindMatch}
          loading={loading}
          className="w-full"
          size="lg"
          icon={loading ? undefined : RefreshCw}
        >
          {loading ? 'Finding Your Match...' : 'Find My Daily Match'}
        </Button>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-center text-sm text-gray-500">
            <Heart className="w-4 h-4 mr-2 text-rose-400" />
            <span>One perfect match, every day</span>
          </div>
        </div>
      </Card>
    </div>
  );
};