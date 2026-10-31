/**
 * AbroadPath AI - Match Explanation Card Component
 * File: src/components/common/MatchExplanationCard.tsx
 *
 * Displays a human-readable explanation of why a university was recommended,
 * including strengths, concerns, unverified requirements, and disclaimers.
 * Does not present manufactured admission probabilities.
 */

import React, { useState } from 'react';
import { MatchResult, UserProfile, EnhancedFitCategory } from '../../types';
import { buildMatchExplanation, mapFitCategoryToEnhanced } from '../../utils/eligibilityEngine';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  Sparkles,
} from 'lucide-react';

interface MatchExplanationCardProps {
  matchResult: MatchResult;
  profile: UserProfile;
  defaultExpanded?: boolean;
}

/** Returns styling for the enhanced fit category */
function getCategoryStyle(category: EnhancedFitCategory): {
  className: string;
  icon: React.ReactNode;
} {
  switch (category) {
    case 'Strong Match':
      return {
        className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        icon: <Sparkles className="w-3.5 h-3.5" />,
      };
    case 'Moderate Match':
      return {
        className: 'text-blue-700 bg-blue-50 border-blue-200',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      };
    case 'Ambitious Match':
      return {
        className: 'text-amber-700 bg-amber-50 border-amber-200',
        icon: <AlertCircle className="w-3.5 h-3.5" />,
      };
    case 'Not Eligible':
      return {
        className: 'text-rose-700 bg-rose-50 border-rose-200',
        icon: <AlertCircle className="w-3.5 h-3.5" />,
      };
    default:
      return {
        className: 'text-slate-700 bg-slate-50 border-slate-200',
        icon: <Info className="w-3.5 h-3.5" />,
      };
  }
}

export const MatchExplanationCard: React.FC<MatchExplanationCardProps> = ({
  matchResult,
  profile,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const explanation = buildMatchExplanation(matchResult, profile);
  const enhancedCategory = mapFitCategoryToEnhanced(matchResult.fitCategory, matchResult);
  const categoryStyle = getCategoryStyle(enhancedCategory);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#1B4D3E]" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Why This Match?
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${categoryStyle.className}`}
          >
            {categoryStyle.icon}
            <span>{enhancedCategory}</span>
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-3">
          {/* Primary reason */}
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {explanation.primaryReason}
          </p>

          {/* Strengths */}
          {explanation.strengths.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Strengths
              </h4>
              <ul className="space-y-0.5">
                {explanation.strengths.slice(0, 5).map((strength, idx) => (
                  <li key={`strength-${idx}`} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                    <span className="text-emerald-500 shrink-0">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Concerns */}
          {explanation.concerns.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Areas to Address
              </h4>
              <ul className="space-y-0.5">
                {explanation.concerns.slice(0, 5).map((concern, idx) => (
                  <li key={`concern-${idx}`} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                    <span className="text-amber-500 shrink-0">!</span>
                    <span>{concern}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Unverified */}
          {explanation.unverified.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                Not Verified
              </h4>
              <ul className="space-y-0.5">
                {explanation.unverified.map((unv, idx) => (
                  <li key={`unverified-${idx}`} className="flex items-start gap-1.5 text-[11px] text-slate-500">
                    <span className="text-slate-400 shrink-0">?</span>
                    <span>{unv}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Disclaimer */}
          <div className="pt-2 border-t border-slate-100 flex items-start gap-1.5 text-[10px] text-slate-500">
            <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
            <span>{explanation.disclaimer}</span>
          </div>

          {/* Probability note */}
          {!explanation.canEstimateProbability && (
            <p className="text-[10px] text-slate-400 italic">
              Admission probability is not estimated. Meeting minimum requirements does not guarantee admission.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchExplanationCard;
