import React from 'react';

interface BatchProgressProps {
  current: number;
  total: number;
  currentKey?: string; // Add new prop for the current key being processed
}

const BatchProgress: React.FC<BatchProgressProps> = ({ current, total, currentKey }) => {
  // Ensure we don't divide by zero and get a valid percentage
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  // Determine if processing is truly complete
  const isComplete = total > 0 && current === total;
  
  // Check if processing has actually started
  const hasStarted = current > 0;

  return (
    <div className="w-96">
      {/* Progress text */}
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-secondary-700">
          {hasStarted ? `Processing... (${current}/${total} items)` : `Initializing... (0/${total} items)`}
        </span>
        <span className="text-sm font-medium text-secondary-700">
          {percentage}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-secondary-200 rounded-full h-2.5">
        <div
          className="bg-primary-600 h-2.5 rounded-full transition-all duration-500 ease-in-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Current key being processed - only show if key is provided */}
      {currentKey && hasStarted && !isComplete && (
        <div className="mt-1 text-xs text-secondary-600">
          Current key: <span className="font-medium">{currentKey}</span>
        </div>
      )}

      {/* Status message - only show when truly complete */}
      {isComplete && (
        <div className="mt-1 text-xs text-secondary-500">
          <span className="text-green-600">Processing complete</span>
        </div>
      )}
    </div>
  );
};

export default BatchProgress;