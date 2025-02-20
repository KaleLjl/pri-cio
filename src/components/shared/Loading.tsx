import React from 'react';

interface LoadingProps {
  fullScreen?: boolean;
  text?: string;
  spinnerSize?: 'sm' | 'md' | 'lg';
}

export default function Loading({ fullScreen = true, text, spinnerSize = 'md' }: LoadingProps) {
  const spinnerSizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  const containerClasses = fullScreen
    ? 'fixed inset-0 bg-black text-white flex items-center justify-center'
    : 'flex items-center justify-center';

  return (
    <div className={containerClasses}>
      <div className="flex items-center space-x-4">
        <div className={`animate-spin rounded-full border-b-2 border-purple-500 ${spinnerSizeClasses[spinnerSize]}`}></div>
        {text && <div className="text-xl text-white">{text}</div>}
      </div>
    </div>
  );
} 