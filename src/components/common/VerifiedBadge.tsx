/**
 * AbroadPath AI - Verified Badge Component
 * File: src/components/common/VerifiedBadge.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R2)
 */

import React from 'react';
import { ShieldCheck, ExternalLink } from 'lucide-react';

interface VerifiedBadgeProps {
  lastChecked: string;
  sourceUrl: string;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ lastChecked, sourceUrl }) => {
  return (
    <div className="inline-flex items-center gap-2 text-xs flex-wrap">
      <span className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>Verified on {lastChecked}</span>
      </span>

      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Verify directly on official university site"
        className="inline-flex items-center gap-1 text-[#FF5E00] hover:text-[#E65400] hover:underline font-medium"
      >
        <span>Official Source</span>
        <ExternalLink className="w-3 h-3 shrink-0" />
      </a>
    </div>
  );
};
