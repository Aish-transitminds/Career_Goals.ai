/**
 * AbroadPath AI - Requirement Chip Component with Provenance & Verbatim Quote Tooltip
 * File: src/components/common/RequirementChip.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R2, Matching Logic)
 */

import React, { useState } from 'react';
import { Check, AlertCircle, HelpCircle, ExternalLink, Quote } from 'lucide-react';

export interface RequirementChipProps {
  label: string;
  requiredVal: number | string | boolean | null | undefined;
  userVal: number | null | undefined;
  unit?: string;
  isBooleanRequirement?: boolean;
  sourceUrl?: string | null;
  verifiedOn?: string | null;
  sourceSnippet?: string | null;
  showProvenance?: boolean;
}

export const RequirementChip: React.FC<RequirementChipProps> = ({
  label,
  requiredVal,
  userVal,
  unit = '',
  isBooleanRequirement = false,
  sourceUrl,
  verifiedOn,
  sourceSnippet,
  showProvenance = false,
}) => {
  const [showQuote, setShowQuote] = useState(false);

  // Helper to render provenance footer when showProvenance is true
  const renderProvenanceLine = () => {
    if (!sourceUrl && !verifiedOn) return null;
    return (
      <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap">
        <span>Source:</span>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 underline font-medium inline-flex items-center gap-0.5"
          >
            <span>official link</span>
            <ExternalLink className="w-2.5 h-2.5 inline" />
          </a>
        ) : (
          <span>official portal</span>
        )}
        {verifiedOn && (
          <span className="text-slate-400">, verified on {verifiedOn}</span>
        )}
        {sourceSnippet && (
          <button
            type="button"
            onClick={() => setShowQuote(!showQuote)}
            className="text-indigo-500 hover:text-indigo-700 ml-1 inline-flex items-center gap-0.5"
            title="View verbatim quote from official site"
          >
            <Quote className="w-2.5 h-2.5" />
            <span className="text-[10px] underline">{showQuote ? 'Hide quote' : 'View quote'}</span>
          </button>
        )}
      </div>
    );
  };

  const renderQuoteBox = () => {
    if (!showQuote || !sourceSnippet) return null;
    return (
      <div className="mt-1 p-2 bg-indigo-50/70 border border-indigo-200 rounded text-[11px] text-indigo-900 italic">
        &ldquo;{sourceSnippet}&rdquo;
      </div>
    );
  };

  // If requirement is unconfirmed (null or undefined)
  if (requiredVal === null || requiredVal === undefined) {
    return (
      <div className="inline-block">
        <span
          title="Requirement not confirmed by official source. Excluded from score."
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-500 border border-slate-200 text-xs font-medium"
        >
          <HelpCircle className="w-3 h-3 text-slate-400" />
          <span>{label}: not confirmed</span>
        </span>
        {showProvenance && renderProvenanceLine()}
        {showProvenance && renderQuoteBox()}
      </div>
    );
  }

  // If boolean requirement (e.g. GRE / GMAT required or waived)
  if (isBooleanRequirement) {
    if (requiredVal === 'Waived' || requiredVal === false) {
      return (
        <div className="inline-block">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
            <Check className="w-3 h-3 text-emerald-600" />
            <span>{label}: Not Required</span>
          </span>
          {showProvenance && renderProvenanceLine()}
          {showProvenance && renderQuoteBox()}
        </div>
      );
    }
    // Required
    const satisfied = userVal !== null && userVal !== undefined && userVal > 0;
    return (
      <div className="inline-block">
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
        {showProvenance && renderProvenanceLine()}
        {showProvenance && renderQuoteBox()}
      </div>
    );
  }

  // Numeric cutoffs (IELTS, TOEFL, GRE, GMAT)
  const numericReq = Number(requiredVal);
  if (userVal === null || userVal === undefined) {
    return (
      <div className="inline-block">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
          <span>{label}: min {requiredVal}{unit}</span>
        </span>
        {showProvenance && renderProvenanceLine()}
        {showProvenance && renderQuoteBox()}
      </div>
    );
  }

  const met = userVal >= numericReq;
  // Near thresholds: IELTS within 0.5, TOEFL within 5, GRE within 5, GMAT within 20
  const isNear =
    !met &&
    ((label.toLowerCase().includes('ielts') && userVal >= numericReq - 0.5) ||
      (label.toLowerCase().includes('toefl') && userVal >= numericReq - 5) ||
      (label.toLowerCase().includes('gre') && userVal >= numericReq - 5) ||
      (label.toLowerCase().includes('gmat') && userVal >= numericReq - 20));

  if (met) {
    return (
      <div className="inline-block">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
          <Check className="w-3 h-3 text-emerald-600" />
          <span>{label}: Met ({userVal} ≥ {requiredVal}{unit})</span>
        </span>
        {showProvenance && renderProvenanceLine()}
        {showProvenance && renderQuoteBox()}
      </div>
    );
  }

  if (isNear) {
    return (
      <div className="inline-block">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 text-xs font-medium">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          <span>{label}: Near ({userVal} / {requiredVal}{unit})</span>
        </span>
        {showProvenance && renderProvenanceLine()}
        {showProvenance && renderQuoteBox()}
      </div>
    );
  }

  return (
    <div className="inline-block">
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
        <AlertCircle className="w-3 h-3 text-rose-600" />
        <span>{label}: Below ({userVal} &lt; {requiredVal}{unit})</span>
      </span>
      {showProvenance && renderProvenanceLine()}
      {showProvenance && renderQuoteBox()}
    </div>
  );
};
