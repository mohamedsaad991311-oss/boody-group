'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ 
  size = 'md', 
  text = 'جاري التحميل...',
  fullScreen = false 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-16 h-16 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} rounded-full border-[#2d1f4a] border-t-[#8b5cf6] border-r-[#ec4899] animate-spin`}
        />
      </div>
      {text && (
        <p className="text-sm text-[#b8b0d0] animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0a1a]/90 backdrop-blur-sm" dir="rtl">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-12" dir="rtl">
      {spinner}
    </div>
  );
}