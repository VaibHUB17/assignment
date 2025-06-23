import { useState, useEffect } from 'react';

export const useTimer = (targetDate: string | null) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!targetDate) {
      setTimeRemaining(0);
      setIsExpired(true);
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference > 0) {
        setTimeRemaining(difference);
        setIsExpired(false);
      } else {
        setTimeRemaining(0);
        setIsExpired(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return {
    timeRemaining,
    isExpired,
    formattedTime: formatTime(timeRemaining),
    hours: Math.floor(timeRemaining / (1000 * 60 * 60)),
    minutes: Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((timeRemaining % (1000 * 60)) / 1000)
  };
};