/**
 * AbroadPath AI - Verification Status Badge Component
 * File: src/components/common/VerificationStatusBadge.tsx
 *
 * Displays verification status indicators for institutions, programs,
 * images, official links, and data freshness — using the verification
 * metadata from University records.
 */

import React from 'react';
import { University } from '../../types';
import {
  getInstitutionVerificationStatus,
  getProgramVerificationStatus,
  getAccreditationStatus,
  getAdmissionRequirementVerificationStatus,
  getImageVerificationStatus,
  getWebsiteVerificationStatus,
  getDataFreshnessStatus,
  getFreshnessLabel,
  getVerificationStatusLabel,
  getLinkStatusLabel,
  getImageStatusLabel,
} from '../../utils/verificationUtils';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Building2,
  GraduationCap,
  ImageIcon,
  LinkIcon,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface VerificationStatusBadgeProps {
  university: University;
  /** Which verification aspect to display */
  type: 'institution' | 'program' | 'accreditation' | 'admission' | 'image' | 'website' | 'freshness' | 'compact';
  /** Optional class override */
  className?: string;
}

/** Returns color and icon for a verification status */
function getStatusVisual(status: 'verified' | 'partially_verified' | 'unverified' | 'flagged'): {
  icon: React.ReactNode;
  className: string;
} {
  switch (status) {
    case 'verified':
      return {
        icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />,
        className: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      };
    case 'partially_verified':
      return {
        icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />,
        className: 'text-blue-700 bg-blue-50 border-blue-200',
      };
    case 'flagged':
      return {
        icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />,
        className: 'text-rose-700 bg-rose-50 border-rose-200',
      };
    default:
      return {
        icon: <ShieldQuestion className="w-3.5 h-3.5 text-amber-500" />,
        className: 'text-amber-700 bg-amber-50 border-amber-200',
      };
  }
}

export const VerificationStatusBadge: React.FC<VerificationStatusBadgeProps> = ({
  university,
  type,
  className = '',
}) => {
  // Compact mode: show institution + freshness in one inline row
  if (type === 'compact') {
    const instStatus = getInstitutionVerificationStatus(university);
    const freshness = getDataFreshnessStatus(university.lastChecked);
    const visual = getStatusVisual(instStatus);
    const freshnessClass =
      freshness === 'fresh'
        ? 'text-emerald-600'
        : freshness === 'stale'
        ? 'text-amber-600'
        : freshness === 'outdated'
        ? 'text-rose-600'
        : 'text-slate-400';

    return (
      <div className={`inline-flex items-center gap-2 flex-wrap ${className}`}>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${visual.className}`}
          title={getVerificationStatusLabel(instStatus)}
        >
          {visual.icon}
          <span>{getVerificationStatusLabel(instStatus)}</span>
        </span>
        {university.lastChecked && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${freshnessClass}`}
            title={getFreshnessLabel(freshness)}
          >
            <Clock className="w-3 h-3" />
            <span>{getFreshnessLabel(freshness)}</span>
          </span>
        )}
      </div>
    );
  }

  // Individual badge types
  let statusLabel: string;
  let visual: { icon: React.ReactNode; className: string };
  let icon: React.ReactNode;

  switch (type) {
    case 'institution': {
      const status = getInstitutionVerificationStatus(university);
      statusLabel = getVerificationStatusLabel(status);
      visual = getStatusVisual(status);
      icon = <Building2 className="w-3 h-3" />;
      break;
    }

    case 'program': {
      const status = getProgramVerificationStatus(university);
      statusLabel = getVerificationStatusLabel(status);
      visual = getStatusVisual(status);
      icon = <GraduationCap className="w-3 h-3" />;
      break;
    }

    case 'accreditation': {
      const status = getAccreditationStatus(university);
      statusLabel = getVerificationStatusLabel(status);
      visual = getStatusVisual(status);
      icon = <ShieldCheck className="w-3 h-3" />;
      break;
    }

    case 'admission': {
      const status = getAdmissionRequirementVerificationStatus(university);
      statusLabel = getVerificationStatusLabel(status);
      visual = getStatusVisual(status);
      icon = <CheckCircle2 className="w-3 h-3" />;
      break;
    }

    case 'image': {
      const status = getImageVerificationStatus(university);
      statusLabel = getImageStatusLabel(status);
      const imageClass =
        status === 'verified_authentic'
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
          : status === 'broken' || status === 'misleading' || status === 'duplicate'
          ? 'text-rose-700 bg-rose-50 border-rose-200'
          : 'text-slate-500 bg-slate-50 border-slate-200';
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${imageClass} ${className}`}
          title={statusLabel}
        >
          <ImageIcon className="w-3 h-3" />
          <span>{statusLabel}</span>
        </span>
      );
    }

    case 'website': {
      const status = getWebsiteVerificationStatus(university);
      statusLabel = getLinkStatusLabel(status);
      const linkClass =
        status === 'verified_official' || status === 'redirected_verified'
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
          : status === 'broken' || status === 'outdated'
          ? 'text-rose-700 bg-rose-50 border-rose-200'
          : 'text-amber-700 bg-amber-50 border-amber-200';
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${linkClass} ${className}`}
          title={statusLabel}
        >
          <LinkIcon className="w-3 h-3" />
          <span>{statusLabel}</span>
        </span>
      );
    }

    case 'freshness': {
      const status = getDataFreshnessStatus(university.lastChecked);
      const freshnessClass =
        status === 'fresh'
          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
          : status === 'stale'
          ? 'text-amber-700 bg-amber-50 border-amber-200'
          : status === 'outdated'
          ? 'text-rose-700 bg-rose-50 border-rose-200'
          : 'text-slate-500 bg-slate-50 border-slate-200';
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${freshnessClass} ${className}`}
          title={getFreshnessLabel(status)}
        >
          <Clock className="w-3 h-3" />
          <span>{getFreshnessLabel(status)}</span>
        </span>
      );
    }

    default:
      return null;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${visual.className} ${className}`}
      title={statusLabel}
    >
      {icon}
      <span>{statusLabel}</span>
    </span>
  );
};

export default VerificationStatusBadge;
