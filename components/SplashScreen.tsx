'use client';

import { useEffect, useState } from 'react';

export default function SplashScreen({ onComplete }: { onComplete?: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 4, 100));
    }, 40);

    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(() => onComplete?.(), 500);
    }, 1800);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#0f0a1a] via-[#1a0f2e] to-[#150e22] transition-opacity duration-500 ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      dir="rtl"
    >
      <div className="flex flex-col items-center gap-8 px-8">
        <div className="relative animate-bounce-in">
          <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] rounded-3xl blur-2xl opacity-50 animate-pulse-glow" />
          <div className="relative w-28 h-28 bg-gradient-to-br from-[#8b5cf6] to-[#ec4899] rounded-3xl flex items-center justify-center shadow-2xl">
            <span className="text-white font-black text-3xl tracking-wider">MS</span>
          </div>
        </div>

        <div className="text-center space-y-2 animate-slideUp delay-150">
          <h1 className="text-3xl font-black gradient-text">MS Fix</h1>
          <p className="text-sm text-[#b8b0d0]">مركز صيانة الهواتف</p>
        </div>

        <div className="w-48 h-1.5 bg-[#2d1f4a] rounded-full overflow-hidden animate-fadeIn delay-300">
          <div
            className="h-full bg-gradient-to-r from-[#8b5cf6] to-[#ec4899] rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="text-xs text-[#8479a0] animate-pulse delay-500">
          جاري التحميل...
        </div>
      </div>
    </div>
  );
}