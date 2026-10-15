/**
 * AbroadPath AI - Fit Tier Badge Component
 * File: src/components/common/FitTierBadge.tsx
 */

import React from 'react';
import { FitCategory } from '../../types';
import { CheckCircle, AlertCircle, TrendingUp, BookOpen } from 'lucide-react';

interface FitTierBadgeProps {
  category: FitCategory;
  score?: number;
}

export const FitTierBadge: React.FC<FitTierBadgeProps> = ({ category, score }) => {
  const percentage = score !== undefined && score >= 0 ? `${Math.round(score * 100)}%` : null;

  switch (category) {
    case 'Strong fit':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Strong Fit {percentage ? `(${percentage})` : ''}</span>
        </span>
      );
    case 'Possible':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Possible {percentage ? `(${percentage})` : ''}</span>
        </span>
      );
    case 'Reach':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-sm">
          <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
          <span>Reach {percentage ? `(${percentage})` : ''}</span>
        </span>
      );
    case 'Prep needed':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-300 shadow-sm">
          <BookOpen className="w-3.5 h-3.5 text-slate-600" />
          <span>Prep Needed</span>
        </span>
      );
  }
};
