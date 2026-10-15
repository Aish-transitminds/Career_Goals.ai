/**
 * AbroadPath AI - Comprehensive Interactive Country Guide Page
 * File: src/pages/CountryGuidePage.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (Screens #4, R2) & PROJECT.md
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCatalog } from '../hooks/useCatalog';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import {
  FileCheck2,
  Euro,
  ExternalLink,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  CheckSquare,
  Square,
  RotateCcw,
  Info,
} from 'lucide-react';

export const CountryGuidePage: React.FC = () => {
  const { id: paramCountryId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { countries, universities, loading } = useCatalog();

  const [activeCountryId, setActiveCountryId] = useState<string>(
    paramCountryId || 'germany'
  );
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});

  // Sync activeCountryId with URL params
  useEffect(() => {
    if (paramCountryId && ['germany', 'ireland', 'uk'].includes(paramCountryId)) {
      setActiveCountryId(paramCountryId);
    }
  }, [paramCountryId]);

  // Load checked documents from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`abroadpath_docs_${activeCountryId}`);
      if (saved) {
        setCheckedDocs(JSON.parse(saved));
      } else {
        setCheckedDocs({});
      }
    } catch {
      setCheckedDocs({});
    }
  }, [activeCountryId]);

  const activeCountry = countries.find((c) => c.id === activeCountryId) || countries[0];

  // Detect rule changes in this country or universities within this country
  const ruleChangedUnivs = universities.filter(
    (u) => u.countryId === activeCountryId && u.ruleChanged
  );

  const toggleDoc = (docName: string) => {
    const updated = { ...checkedDocs, [docName]: !checkedDocs[docName] };
    setCheckedDocs(updated);
    try {
      localStorage.setItem(`abroadpath_docs_${activeCountryId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save checklist state', e);
    }
  };

  const selectAllDocs = () => {
    if (!activeCountry) return;
    const updated: Record<string, boolean> = {};
    activeCountry.documents.forEach((d) => {
      updated[d] = true;
    });
    setCheckedDocs(updated);
    try {
      localStorage.setItem(`abroadpath_docs_${activeCountryId}`, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save checklist state', e);
    }
  };

  const resetDocs = () => {
    setCheckedDocs({});
    try {
      localStorage.removeItem(`abroadpath_docs_${activeCountryId}`);
    } catch (e) {
      console.warn('Failed to remove checklist state', e);
    }
  };

  const completedCount = activeCountry
    ? activeCountry.documents.filter((d) => checkedDocs[d]).length
    : 0;
  const totalCount = activeCountry ? activeCountry.documents.length : 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Country Admission & Visa Guides
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Verified admission criteria, language rules, blocked accounts, and official application portals.
        </p>
      </div>

      {/* Country Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'germany', name: 'Germany', flag: '🇩🇪' },
          { id: 'ireland', name: 'Ireland', flag: '🇮🇪' },
          { id: 'uk', name: 'United Kingdom', flag: '🇬🇧' },
        ].map((tab) => {
          const isActive = activeCountryId === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveCountryId(tab.id);
                navigate(`/countries/${tab.id}`);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{tab.flag}</span>
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {loading || !activeCountry ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Loading country dossier...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Amber Rule-Changed Alert Banner */}
          {(activeCountry.ruleChanged || ruleChangedUnivs.length > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-amber-900">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">
                    Admission Rule Changes Detected in {activeCountry.name}
                  </span>
                  <span className="bg-amber-200 text-amber-950 font-semibold px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                    Live Verified Alert
                  </span>
                </div>
                {ruleChangedUnivs.map((u) => (
                  <p key={u.id} className="text-amber-800 leading-relaxed">
                    <strong>{u.name} ({u.program})</strong>: Admission criteria shifted.
                    {u.changedFields && u.changedFields.length > 0 && (
                      <span> Updated fields: {u.changedFields.join(', ')}.</span>
                    )}
                    {u.demoSeeded && (
                      <span className="italic ml-1">(Demonstration-seeded rule change record).</span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Top Country Hero Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-indigo-600">
                  National Admissions Dossier
                </span>
                <span className="text-slate-300">&bull;</span>
                <VerifiedBadge
                  lastChecked={activeCountry.lastChecked}
                  sourceUrl={activeCountry.sourceUrl}
                />
              </div>
              <h2 className="text-2xl font-black text-slate-900">{activeCountry.name}</h2>
              <p className="text-xs text-slate-500">
                Official destination guidelines for international degree-seeking students.
              </p>
            </div>

            <a
              href={activeCountry.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors self-start md:self-center"
            >
              <span>Visit Official National Portal</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Grid of Key Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Language & Admission Standards */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-600">
                <GraduationCap className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Language Requirements</h3>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeCountry.languageNote}
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800">Key Takeaway:</span>
                <p>
                  Always verify whether individual departments require English C1 (IELTS 7.0+) or B2 (IELTS 6.0/6.5). Scores must be sent directly via ETS or British Council.
                </p>
              </div>
            </div>

            {/* Living Costs & Blocked Account */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-indigo-600">
                <Euro className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">Cost & Financial Proof</h3>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {activeCountry.costRange}
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800">Financial Proof Requirement:</span>
                <p>
                  {activeCountryId === 'germany' &&
                    'Requires a Sperrkonto (blocked account) with €11,904/year (€992/month) deposited prior to visa issuance.'}
                  {activeCountryId === 'ireland' &&
                    'Requires evidence of immediate access to at least €10,000 for living expenses in addition to paid course tuition.'}
                  {activeCountryId === 'uk' &&
                    'Requires maintenance funds (£1,334/mo for London or £1,023/mo outside) held consecutively for at least 28 days.'}
                </p>
              </div>
            </div>

            {/* Visa & Post-Study Work Regulations */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2 text-indigo-600">
                <Briefcase className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">
                  Visa Regulations & Post-Study Work Rights
                </h3>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeCountry.visaNote}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs">
                  <span className="block font-bold text-indigo-900">Visa Type</span>
                  <span className="text-indigo-700">
                    {activeCountryId === 'germany' && 'National Visa (Type D)'}
                    {activeCountryId === 'ireland' && 'Study Visa (Stamp 2)'}
                    {activeCountryId === 'uk' && 'Student Visa (Points-based)'}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs">
                  <span className="block font-bold text-indigo-900">Post-Study Work</span>
                  <span className="text-indigo-700">
                    {activeCountryId === 'germany' && '18 months (Job Seeker)'}
                    {activeCountryId === 'ireland' && '24 months (Master’s Stamp 1G)'}
                    {activeCountryId === 'uk' && '2 years (Graduate Route)'}
                  </span>
                </div>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs">
                  <span className="block font-bold text-indigo-900">Portal Architecture</span>
                  <span className="text-indigo-700">
                    {activeCountryId === 'germany' && 'uni-assist VPD / Direct Portal'}
                    {activeCountryId === 'ireland' && 'CAO (UG) / Direct University (PG)'}
                    {activeCountryId === 'uk' && 'UCAS (UG) / Direct University (PG)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Document Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-600">
                  <FileCheck2 className="w-5 h-5" />
                  <h3 className="font-bold text-slate-900 text-lg">
                    Pre-Flight Document Checklist: {activeCountry.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Interactive checklist saved to your browser session. Mark items as you assemble your dossier.
                </p>
              </div>

              {/* Progress Pill & Actions */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900">
                    {completedCount} of {totalCount} ready
                  </span>
                  <div className="w-28 bg-slate-100 rounded-full h-2 mt-1 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={selectAllDocs}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Select All"
                >
                  All
                </button>
                <button
                  onClick={resetDocs}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Reset Checklist"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Checklist Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeCountry.documents.map((docItem, idx) => {
                const isChecked = Boolean(checkedDocs[docItem]);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleDoc(docItem)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border text-xs cursor-pointer transition-all select-none ${
                      isChecked
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 font-medium'
                        : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <span className={isChecked ? 'line-through text-slate-500' : ''}>
                      {docItem}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Note: Translations must be notarized or issued by recognized sworn translators. Always confirm specific apostille / legalisation rules for your home country.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryGuidePage;
