
/**
 * AbroadPath AI - Fee Breakdown Panel Component
 * File: src/components/common/FeeBreakdownPanel.tsx
 *
 * Displays a structured fee breakdown distinguishing between officially
 * published tuition fees and estimated living expenses, with currency
 * conversion to the student's preferred display currency.
 */

import React, { useState } from 'react';
import { University } from '../../types';
import {
  buildFeeBreakdown,
  convertFeeBreakdown,
  formatCurrencyAmount,
  formatTotalCostSummary,
  DisplayCurrency,
} from '../../utils/financialUtils';
import {
  Wallet,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Home,
  Utensils,
  Bus,
  HeartPulse,
  FileText,
  Info,
} from 'lucide-react';

interface FeeBreakdownPanelProps {
  university: University;
  displayCurrency?: DisplayCurrency;
  defaultExpanded?: boolean;
}
/** Returns a more specific icon for labeled rows */
function getLabeledFeeIcon(label: string): React.ReactNode {
  const lower = label.toLowerCase();
  if (lower.includes('accommodation')) return <Home className="w-3.5 h-3.5 text-slate-400" />;
  if (lower.includes('food')) return <Utensils className="w-3.5 h-3.5 text-slate-400" />;
  if (lower.includes('transport')) return <Bus className="w-3.5 h-3.5 text-slate-400" />;
  if (lower.includes('insurance') || lower.includes('health')) return <HeartPulse className="w-3.5 h-3.5 text-slate-400" />;
  if (lower.includes('visa')) return <FileText className="w-3.5 h-3.5 text-slate-400" />;
  if (lower.includes('application')) return <FileText className="w-3.5 h-3.5 text-slate-400" />;
  if (lower.includes('tuition')) return <GraduationCap className="w-3.5 h-3.5 text-slate-400" />;
  return <Wallet className="w-3.5 h-3.5 text-slate-400" />;
}

export const FeeBreakdownPanel: React.FC<FeeBreakdownPanelProps> = ({
  university,
  displayCurrency = 'INR',
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const breakdown = buildFeeBreakdown(university, displayCurrency);
  const converted = convertFeeBreakdown(breakdown, displayCurrency);
  const currencySymbol = displayCurrency;

  // Group rows by type
  const tuitionRows = converted.rows.filter((r) => r.type === 'tuition');
  const livingRows = converted.rows.filter((r) => r.type === 'living');
  const adminRows = converted.rows.filter(
    (r) => r.type === 'administrative' || r.type === 'visa' || r.type === 'other'
  );

  const hasAnyData = converted.rows.some((r) => r.amount !== null);
  const hasLivingEstimates = livingRows.length > 0;

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
          <Wallet className="w-4 h-4 text-[#1B4D3E]" />
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Fees & Living Costs
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">
            {formatTotalCostSummary(breakdown, displayCurrency)}
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
          {!hasAnyData ? (
            <div className="flex items-start gap-2 text-xs text-slate-500 py-2">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Fee details are not confirmed in our catalog for this program. Check the official university website for current tuition and living cost information.
              </span>
            </div>
          ) : (
            <>
              {/* Tuition Section */}
              {tuitionRows.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    Tuition (Official)
                  </h4>
                  {tuitionRows.map((row, idx) => (
                    <div key={`tuition-${idx}`} className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {getLabeledFeeIcon(row.label)}
                        <span className="text-xs text-slate-600">{row.label}</span>
                        {row.verified && (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-slate-800">
                          {row.amount !== null
                            ? formatCurrencyAmount(row.amount, currencySymbol)
                            : 'Not confirmed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Living Costs Section */}
              {livingRows.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Home className="w-3 h-3" />
                    Living Costs (Estimated)
                  </h4>
                  {livingRows.map((row, idx) => (
                    <div key={`living-${idx}`} className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {getLabeledFeeIcon(row.label)}
                        <span className="text-xs text-slate-600">{row.label}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-700">
                        {row.amount !== null
                          ? formatCurrencyAmount(row.amount, currencySymbol)
                          : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Administrative / Visa / Other */}
              {adminRows.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Other Costs
                  </h4>
                  {adminRows.map((row, idx) => (
                    <div key={`admin-${idx}`} className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {getLabeledFeeIcon(row.label)}
                        <span className="text-xs text-slate-600">{row.label}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-700">
                        {row.amount !== null
                          ? formatCurrencyAmount(row.amount, currencySymbol)
                          : row.note || '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Total Summary */}
              {converted.estimatedTotalAnnualCost !== null && (
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Estimated Total / Year</span>
                  <span className="text-sm font-bold text-[#1B4D3E]">
                    {formatCurrencyAmount(converted.estimatedTotalAnnualCost, currencySymbol)}
                  </span>
                </div>
              )}

              {/* Currency & Academic Year */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
                {converted.academicYear && (
                  <span>Academic Year: {converted.academicYear}</span>
                )}
                <span>
                  Displayed in {currencySymbol} (est. from {converted.currency})
                </span>
                {!converted.feesVerified && (
                  <span className="inline-flex items-center gap-0.5 text-amber-600">
                    <AlertCircle className="w-3 h-3" />
                    Fees not independently verified
                  </span>
                )}
              </div>

              {/* Disclaimer */}
              {hasLivingEstimates && (
                <div className="flex items-start gap-1.5 text-[10px] text-slate-500 pt-1">
                  <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    Tuition is from official sources where available. Living costs are estimates and vary by city and lifestyle. Verify current figures on the official university website.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FeeBreakdownPanel;
