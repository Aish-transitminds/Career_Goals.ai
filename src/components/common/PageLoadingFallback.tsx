/**
 * AbroadPath AI - Accessible Loading Fallback for Lazy Routes
 * File: src/components/common/PageLoadingFallback.tsx
 */

import React from 'react';

interface PageLoadingFallbackProps {
  message?: string;
}

export const PageLoadingFallback: React.FC<PageLoadingFallbackProps> = ({
  message = 'Loading verified data...',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4"
    >
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-orange-200 animate-ping opacity-75"></div>
        <div className="relative w-12 h-12 rounded-full border-4 border-[#FF5E00] border-t-transparent animate-spin"></div>
      </div>
      <p className="text-sm font-medium text-slate-600 animate-pulse font-poppins">{message}</p>
      <span className="sr-only">Loading content, please wait...</span>
    </div>
  );
};
