/**
 * AbroadPath AI - Footer with Verification Policy & Privacy Pledge
 * File: src/components/common/Footer.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R2, R4)
 */

import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer id="contact" className="bg-[#F3EEE2] text-[#2B3A33] border-t border-[#E6DFCF] mt-auto py-10 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs text-[#5C6B63]">
          <div>
            <div className="flex items-center space-x-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#1B4D3E] flex items-center justify-center text-[#FAF7F0] font-bold">
                CG
              </div>
              <span className="text-base font-bold text-[#1B4D3E] tracking-tight">
                Career<span className="text-[#B45309]">Goals</span>
              </span>
            </div>
            <p className="leading-relaxed text-[#5C6B63]">
              Verified study abroad admissions guidance derived exclusively from official university admissions portals in Germany, Ireland, and the United Kingdom.
            </p>
          </div>

          <div>
            <p className="font-semibold text-[#1B4D3E] flex items-center gap-1.5 mb-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-[#B45309]" />
              Data Integrity Policy
            </p>
            <p className="leading-relaxed text-[#5C6B63]">
              Criteria not explicitly confirmed by university authorities are excluded from fit scoring. Always verify deadlines, fees, and requirements directly on the institution's official portal.
            </p>
          </div>

          <div>
            <p className="font-semibold text-[#1B4D3E] flex items-center gap-1.5 mb-2 text-sm">
              <Lock className="w-4 h-4 text-[#B45309]" />
              Admissions Support &amp; Privacy
            </p>
            <p className="leading-relaxed text-[#5C6B63] mb-2">
              Official admissions guidance powered by verified institution requirements. Direct portal verification for all deadlines and criteria.
            </p>
            <p className="text-[11px] text-[#5C6B63]">
              Your profile data is kept strictly private and never shared.
            </p>
          </div>
        </div>

        <div className="border-t border-[#E6DFCF] pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-[#5C6B63] gap-2">
          <p>© 2026 CareerGoals | Study Abroad Guide. All rights reserved.</p>
          <p className="flex items-center gap-1 text-[#5C6B63]">
            Official admissions criteria &bull; Live change detection
          </p>
        </div>
      </div>
    </footer>
  );
};
