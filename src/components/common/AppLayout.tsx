/**
 * AbroadPath AI - Application Layout Wrapper
 * File: src/components/common/AppLayout.tsx
 */

import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F0] text-[#2B3A33] w-full max-w-full">
      <Navbar />
      <main className="flex-1 max-w-[1520px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-w-0">
        {children}
      </main>
      <Footer />
    </div>
  );
};
