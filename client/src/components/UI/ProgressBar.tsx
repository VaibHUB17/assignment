import React from 'react';

interface ProgressBarProps {
  progress: number;
  max: number;
  label?: string;
  showValues?: boolean;
  color?: 'primary' | 'secondary' | 'success';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  max,
  label,
  showValues = true,
  color = 'primary',
  className = ''
}) => {
  const percentage = Math.min((progress / max) * 100, 100);
  
  const colorClasses = {
    primary: 'bg-gradient-to-r from-rose-500 to-pink-600',
    secondary: 'bg-gradient-to-r from-purple-500 to-violet-600',
    success: 'bg-gradient-to-r from-green-500 to-emerald-600'
  };

  return (
    <div className={`w-full ${className}`}>
      {(label || showValues) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showValues && (
            <span className="text-sm text-gray-500">
              {progress} / {max}
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-300 ${colorClasses[color]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};