/**
 * AbroadPath AI - Eligibility Comparison Table Component
 * File: src/components/common/EligibilityComparisonTable.tsx
 *
 * Displays a structured comparison table showing each requirement parameter,
 * the student's actual score, the university's requirement, the eligibility
 * status, and the exact gap.
 */

import React, { useState } from 'react';
import { EligibilityComparison, RequirementComparisonRow, EligibilityStatus } from '../../types';
import {
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';

interface EligibilityComparisonTableProps {
  comparison: EligibilityComparison;
  universityName?: string;
  defaultExpanded?: boolean;
}

/** Returns the appropriate icon and color class for an eligibility status */
function getStatusStyle(status: EligibilityStatus): {
  icon: React.ReactNode;
  className: string;
  label: string;
} {
  switch (status) {
    case 'Meets Requirement':
      return {
        icon: <Check className="w-3.5 h-3.5" />,
        className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        label: 'Meets',
      };
    case 'Exceeds Requirement':
      return {
        icon: <TrendingUp className="w-3.5 h-3.5" />,
        className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        label: 'Exceeds',
      };
    case 'Below Requirement':
      return {
        icon: <TrendingDown className="w-3.5 h-3.5" />,
        className: 'text-rose-700 bg-rose-50 border-rose-200',
        label: 'Below',
      };
    case 'Not Required':
      return {
        icon: <Minus className="w-3.5 h-3.5" />,
        className: 'text-slate-500 bg-slate-50 border-slate-200',
        label: 'Not Required',
      };
    case 'Not Verified':
      return {
        icon: <HelpCircle className="w-3.5 h-3.5" />,
        className: 'text-amber-700 bg-amber-50 border-amber-200',
        label: 'Not Verified',
      };
    case 'Conditional Requirement':
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5" />,
        className: 'text-orange-700 bg-orange-50 border-orange-200',
        label: 'Conditional',
      };
    default:
      return {
        icon: <HelpCircle className="w-3.5 h-3.5" />,
        className: 'text-slate-500 bg-slate-50 border-slate-200',
        label: status,
      };
  }
}

/** Renders a single comparison row */
function ComparisonRow({ row }: { row: RequirementComparisonRow }) {
  const style = getStatusStyle(row.status);

  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
      {/* Parameter */}
      <td className="py-2.5 px-3 sm:px-4 align-top">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-700">{row.parameter}</span>
          {row.requirementType === 'minimum' && (
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium bg-slate-100 px-1 py-0.5 rounded">
              min
            </span>
          )}
          {row.requirementType === 'competitive' && (
            <span className="text-[9px] uppercase tracking-wider text-blue-600 font-medium bg-blue-50 px-1 py-0.5 rounded">
              comp
            </span>
          )}
        </div>
      </td>

      {/* Student Score */}
      <td className="py-2.5 px-3 sm:px-4 align-top text-center">
        {row.studentScore !== null ? (
          <span className="text-xs font-semibold text-slate-800">{row.studentScore}</span>
        ) : (
          <span className="text-xs text-slate-400 italic">Not provided</span>
        )}
      </td>

      {/* University Requirement */}
      <td className="py-2.5 px-3 sm:px-4 align-top text-center">
        {row.universityRequirement !== null ? (
          <span className="text-xs font-medium text-slate-700">{row.universityRequirement}</span>
        ) : (
          <span className="text-xs text-slate-400 italic">Not specified</span>
        )}
      </td>

      {/* Status */}
      <td className="py-2.5 px-3 sm:px-4 align-top text-center whitespace-nowrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${style.className}`}
        >
          {style.icon}
          <span>{style.label}</span>
        </span>
      </td>

      {/* Gap */}
      <td className="py-2.5 px-3 sm:px-4 align-top text-center">
        {row.gapDescription !== null ? (
          <span
            className={`text-[10px] font-medium ${
              row.gap !== null && row.gap < 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {row.gapDescription}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        )}
      </td>
    </tr>
  );
}

export const EligibilityComparisonTable: React.FC<EligibilityComparisonTableProps> = ({
  comparison,
  universityName,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const overallEligibilityLabel: Record<string, string> = {
    eligible: 'Eligible (based on verified data)',
    potentially_eligible: 'Potentially Eligible',
    insufficient_info: 'Insufficient Information',
    not_eligible: 'Not Eligible',
  };

  const overallClass: Record<string, string> = {
    eligible: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    potentially_eligible: 'text-blue-700 bg-blue-50 border-blue-200',
    insufficient_info: 'text-amber-700 bg-amber-50 border-amber-200',
    not_eligible: 'text-rose-700 bg-rose-50 border-rose-200',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      {/* Header with toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1B4D3E]" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Eligibility Comparison
          </span>
          {universityName && (
            <span className="text-xs text-slate-400 hidden sm:inline">· {universityName}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
              overallClass[comparison.overallEligibility] || 'text-slate-600 bg-slate-50 border-slate-200'
            }`}
          >
            {overallEligibilityLabel[comparison.overallEligibility] || comparison.overallEligibility}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-slate-500 text-[10px] uppercase tracking-wider">
              <tr className="border-b border-slate-200">
                <th className="py-2 px-3 sm:px-4 font-semibold">Parameter</th>
                <th className="py-2 px-3 sm:px-4 font-semibold text-center">Your Score</th>
                <th className="py-2 px-3 sm:px-4 font-semibold text-center">Requirement</th>
                <th className="py-2 px-3 sm:px-4 font-semibold text-center">Status</th>
                <th className="py-2 px-3 sm:px-4 font-semibold text-center">Gap</th>
              </tr>
            </thead>
            <tbody>
              {comparison.rows.map((row, idx) => (
                <ComparisonRow key={`${row.parameter}-${idx}`} row={row} />
              ))}
            </tbody>
          </table>

          {/* Notes section */}
          {comparison.rows.some((r) => r.note) && (
            <div className="px-4 py-3 bg-amber-50/40 border-t border-slate-200 space-y-1.5">
              {comparison.rows
                .filter((r) => r.note)
                .map((r, idx) => (
                  <div key={`note-${idx}`} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                    <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-700">{r.parameter}:</strong> {r.note}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {/* Verification source footer */}
          {comparison.sourceUrl && comparison.lastChecked && (
            <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-200 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Requirements checked on {comparison.lastChecked}</span>
              <span className="text-slate-300">|</span>
              <a
                href={comparison.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF5E00] hover:underline font-medium inline-flex items-center gap-0.5"
              >
                Official source
              </a>
            </div>
          )}

          {!comparison.hasVerifiedData && (
            <div className="px-4 py-2.5 bg-amber-50/40 border-t border-slate-200 text-[10px] text-amber-700">
              Admissions details have not been independently verified in our catalog. Confirm requirements on the official university site.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EligibilityComparisonTable;
