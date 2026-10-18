/**
 * AbroadPath AI - Rule Changed Alert Banner
 * File: src/components/common/RuleChangedBanner.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R2, R3) & PROJECT.md
 */

import React from 'react';
import { AlertTriangle, History, ArrowRight } from 'lucide-react';

interface RuleChangedBannerProps {
  changedFields: string[];
  previousValues?: Record<string, any>;
  currentValues?: Record<string, any>;
  lastChanged?: string | null;
  demoSeeded?: boolean;
}

export const RuleChangedBanner: React.FC<RuleChangedBannerProps> = ({
  changedFields,
  previousValues = {},
  currentValues = {},
  lastChanged,
  demoSeeded = false,
}) => {
  const formatValue = (val: any): string => {
    if (val === null || val === undefined) return 'Not confirmed (Unstated)';
    if (typeof val === 'boolean') return val ? 'Required' : 'Waived';
    return String(val);
  };

  const formatFieldName = (field: string): string => {
    switch (field) {
      case 'gmat_required':
        return 'GMAT Requirement';
      case 'gre_required':
        return 'GRE Requirement';
      case 'min_ielts':
        return 'Minimum IELTS';
      case 'min_toefl':
        return 'Minimum TOEFL';
      case 'tuition_fee':
        return 'Tuition Fee Schedule';
      case 'application_deadline':
        return 'Application Deadline';
      default:
        return field.replace(/_/g, ' ');
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-amber-900 text-sm">
                {demoSeeded
                  ? 'Simulated Admission Rule Change (Demonstration Record)'
                  : 'Admission Rule Change Detected'}
              </span>
              {demoSeeded ? (
                <span className="bg-amber-200 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-300">
                  Demonstration Simulation &bull; Not Live Policy Change
                </span>
              ) : (
                <span className="bg-amber-200/80 text-amber-900 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Verified Alert
                </span>
              )}
            </div>
            {demoSeeded && (
              <p className="text-[11px] text-amber-900/90 leading-tight">
                This record demonstrates AbroadPath AI's automated change-detection flow using seeded before/after values. It is a demonstration simulation, not an active verified policy change.
              </p>
            )}

            {/* Changed Fields Diff */}
            <div className="text-xs text-amber-800 space-y-1">
              {changedFields.map((field) => {
                const prev = previousValues[field];
                const curr = currentValues[field];
                return (
                  <div key={field} className="flex flex-wrap items-center gap-1.5 font-medium">
                    <span className="capitalize">{formatFieldName(field)}:</span>
                    <span className="line-through text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">
                      {formatValue(prev)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-600 inline" />
                    <span className="font-bold text-amber-950 bg-amber-200 px-1.5 py-0.5 rounded">
                      {formatValue(curr)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {lastChanged && (
          <div className="flex items-center gap-1 text-[11px] text-amber-700 font-medium shrink-0 self-end sm:self-center">
            <History className="w-3.5 h-3.5" />
            <span>Updated on {lastChanged}</span>
          </div>
        )}
      </div>
    </div>
  );
};
