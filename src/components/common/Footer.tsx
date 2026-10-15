/**
 * AbroadPath AI - Footer with Verification Policy & Privacy Pledge
 * File: src/components/common/Footer.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R2, R4)
 */

import React from 'react';
import { ShieldCheck, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Data Integrity & Official Verification Policy
            </p>
            <p className="leading-relaxed">
              CareerGoals provides structured guidance derived exclusively from official
              university websites and government education portals. Criteria not explicitly stated by official
              sources are recorded as <em>not confirmed</em> and excluded from scoring. Always verify
              deadlines, fees, and requirements directly on the official university portal before submitting.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Lock className="w-4 h-4 text-indigo-600" />
              Privacy & Zero-Data-Leak Pledge (R4 Compliant)
            </p>
            <p className="leading-relaxed">
              No student personal data (names, contact details, or exact test scores) is ever transmitted to any
              third-party LLM. Only public catalog facts and anonymous queries are analyzed. Built with 100% free
              and open verification pipelines.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-400 gap-2">
          <p>© 2026 CareerGoals — Study Abroad Guide</p>
          <p className="flex items-center gap-1">
            Engineered with verified official data for global students
          </p>
        </div>
      </div>
    </footer>
  );
};
