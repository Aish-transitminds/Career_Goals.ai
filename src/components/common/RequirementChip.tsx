/**
 * AbroadPath AI - Requirement Chip Component
 * File: src/components/common/RequirementChip.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R2, Matching Logic)
 */

import React from 'react';
import { Check, AlertCircle, HelpCircle } from 'lucide-react';

interface RequirementChipProps {
  label: string;
  requiredVal: number | string | boolean | null | undefined;
  userVal: number | null | undefined;
  unit?: string;
  isBooleanRequirement?: boolean;
}

export const RequirementChip: React.FC<RequirementChipProps> = ({
  label,
  requiredVal,
  userVal,
  unit = '',
  isBooleanRequirement = false,
}) => {
  // If requirement is unconfirmed (null or undefined)
  if (requiredVal === null || requiredVal === undefined) {
    return (
      <span
        title="Requirement not confirmed by official source. Excluded from score."
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-500 border border-slate-200 text-xs font-medium"
      >
        <HelpCircle className="w-3 h-3 text-slate-400" />
        <span>{label}: not confirmed</span>
      </span>
    );
  }

  // If boolean requirement (e.g. GRE / GMAT required or waived)
  if (isBooleanRequirement) {
    if (requiredVal === 'Waived' || requiredVal === false) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
          <Check className="w-3 h-3 text-emerald-600" />
          <span>{label}: Not Required</span>
        </span>
      );
    }
    // Required
    const satisfied = userVal !== null && userVal !== undefined && userVal > 0;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border ${
          satisfied
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}
      >
        {satisfied ? (
          <Check className="w-3 h-3 text-emerald-600" />
        ) : (
          <AlertCircle className="w-3 h-3 text-amber-600" />
        )}
        <span>{label}: {satisfied ? 'Satisfied' : 'Required'}</span>
      </span>
    );
  }

  // Numeric cutoffs (IELTS, TOEFL)
  const numericReq = Number(requiredVal);
  if (userVal === null || userVal === undefined) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
        <span>{label}: min {requiredVal}{unit}</span>
      </span>
    );
  }

  const met = userVal >= numericReq;
  // Near thresholds: IELTS within 0.5, TOEFL within 5
  const isNear =
    !met &&
    ((label.toLowerCase().includes('ielts') && userVal >= numericReq - 0.5) ||
      (label.toLowerCase().includes('toefl') && userVal >= numericReq - 5));

  if (met) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
        <Check className="w-3 h-3 text-emerald-600" />
        <span>{label}: Met ({userVal} ≥ {requiredVal}{unit})</span>
      </span>
    );
  }

  if (isNear) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
        <AlertCircle className="w-3 h-3 text-amber-600" />
        <span>{label}: Near ({userVal} / {requiredVal}{unit})</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
      <AlertCircle className="w-3 h-3 text-rose-600" />
      <span>{label}: Below ({userVal} &lt; {requiredVal}{unit})</span>
    </span>
  );
};
