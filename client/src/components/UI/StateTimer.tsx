import React from 'react';
import { Clock } from 'lucide-react';
import { useTimer } from '../../hooks/useTimer';

interface StateTimerProps {
  state: 'frozen' | 'waiting';
  endTime: string;
  onExpired?: () => void;
}

export const StateTimer: React.FC<StateTimerProps> = ({ state, endTime, onExpired }) => {
  const { formattedTime, isExpired } = useTimer(endTime);

  React.useEffect(() => {
    if (isExpired && onExpired) {
      onExpired();
    }
  }, [isExpired, onExpired]);

  const getStateLabel = () => {
    return state === 'frozen' ? 'Reflection Period' : 'Waiting for New Match';
  };

  const getDescription = () => {
    return state === 'frozen'
      ? 'Take some time to reflect on your last connection'
      : 'We\'re finding you a new match soon';
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <div className="flex items-center">
        <Clock className="w-5 h-5 mr-2 text-gray-500" />
        <p className="text-sm font-medium text-gray-700">
          {getStateLabel()}: <span className="font-bold text-rose-600">{formattedTime}</span>
        </p>
      </div>
      <p className="text-xs text-gray-500 mt-1 ml-7">{getDescription()}</p>
    </div>
  );
};
