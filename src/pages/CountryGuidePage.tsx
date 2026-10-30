/**
 * AbroadPath AI - Comprehensive Interactive Country Guide Page
 * File: src/pages/CountryGuidePage.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (Screens #4, R2) & PROJECT.md
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  FileText,
} from 'lucide-react';


const CG_FLAGS: Record<string, React.ReactNode> = {
  germany: (
    <svg className="w-4 h-3 rounded-2xs shadow-xs inline-block align-middle shrink-0" viewBox="0 0 640 480">
      <path fill="#000" d="M0 0h640v160H0z"/>
      <path fill="#D00" d="M0 160h640v160H0z"/>
      <path fill="#FFCE00" d="M0 320h640v160H0z"/>
    </svg>
  ),
  ireland: (
    <svg className="w-4 h-3 rounded-2xs shadow-xs inline-block align-middle shrink-0" viewBox="0 0 640 480">
      <path fill="#169B62" d="M0 0h213.3v480H0z"/>
      <path fill="#FFF" d="M213.3 0h213.4v480H213.3z"/>
      <path fill="#FF883E" d="M426.7 0H640v480H426.7z"/>
    </svg>
  ),
  uk: (
    <svg className="w-4 h-3 rounded-2xs shadow-xs inline-block align-middle shrink-0" viewBox="0 0 640 480">
      <path fill="#012169" d="M0 0v480h640V0z"/>
      <path stroke="#FFF" strokeWidth="60" d="m0 0 640 480m0-480L0 480"/>
      <path stroke="#C8102E" strokeWidth="40" d="m0 0 640 480m0-480L0 480"/>
      <path stroke="#FFF" strokeWidth="100" d="M320 0v480M0 240h640"/>
      <path stroke="#C8102E" strokeWidth="60" d="M320 0v480M0 240h640"/>
    </svg>
  ),
};

export const CountryGuidePage: React.FC = () => {
  const { id: paramCountryId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { countries, universities, loading } = useCatalog();

  const [activeCountryId, setActiveCountryId] = useState<string>(
    paramCountryId || 'germany'
  );
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});

  // Resolve selected programme for active country (from searchParams or localStorage)
  const urlProgId = searchParams.get('programId');
  const urlIntake = searchParams.get('intake');
  const selectedProgId = urlProgId || localStorage.getItem('abroadpath_last_selected_program');
  const selectedIntake = urlIntake || localStorage.getItem('abroadpath_last_selected_intake') || '2026';

  const countrySelectedProgram = universities.find(
    (u) => u.id === selectedProgId && u.countryId === activeCountryId
  );

  const handleCheckStatementRequirements = () => {
    if (countrySelectedProgram) {
      navigate(
        `/letter-helper?programId=${encodeURIComponent(countrySelectedProgram.id)}&intake=${encodeURIComponent(selectedIntake)}`
      );
    } else {
      // If no programme is selected, direct user to Matches to choose one first
      navigate(`/matches?country=${activeCountryId}`);
    }
  };

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
    <div className="space-y-6 font-poppins">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B4D3E]">
          Country Admission & Visa Guides
        </h1>
        <p className="text-[#5C6B63] text-sm mt-1">
          Verified admission criteria, language rules, blocked accounts, and official application portals.
        </p>
      </div>

      {/* Country Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#E6DFCF] pb-3">
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-[6px] text-sm font-bold transition-all ${
                isActive
                  ? 'bg-[#1B4D3E] text-[#FAF7F0] shadow-sm'
                  : 'bg-white text-[#2B3A33] hover:bg-[#F3EEE2] border border-[#E6DFCF]'
              }`}
            >
              {CG_FLAGS[tab.id]}
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
            <div className="bg-amber-50 border border-amber-300 rounded-[8px] p-4 sm:p-5 flex items-start gap-3 shadow-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-amber-900">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm">
                    {ruleChangedUnivs.every((u) => u.demoSeeded)
                      ? `Simulated Admission Rule Change Demonstration in ${activeCountry.name}`
                      : `Admission Rule Changes Detected in ${activeCountry.name}`}
                  </span>
                  <span className="bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded-[4px] text-[10px] uppercase tracking-wider border border-amber-300">
                    {ruleChangedUnivs.every((u) => u.demoSeeded)
                      ? 'Demonstration Record'
                      : 'Verified Change Alert'}
                  </span>
                </div>
                {ruleChangedUnivs.map((u) => (
                  <p key={u.id} className="text-amber-800 leading-relaxed">
                    <strong>{u.name} ({u.program})</strong>: Admission criteria shifted.
                    {u.changedFields && u.changedFields.length > 0 && (
                      <span> Updated fields: {u.changedFields.join(', ')}.</span>
                    )}
                    {u.demoSeeded && (
                      <span className="italic ml-1 font-medium text-amber-900">
                        (Demonstration record showing change-detection flow; not an active live verified policy change).
                      </span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Top Country Hero Card */}
          <div className="bg-white rounded-[8px] border border-[#E6DFCF] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#1B4D3E] transition-colors">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-[#1B4D3E]">
                  National Admissions Dossier
                </span>
                <span className="text-[#5C6B63]">&bull;</span>
                <VerifiedBadge
                  lastChecked={activeCountry.lastChecked}
                  sourceUrl={activeCountry.sourceUrl}
                />
              </div>
              <h2 className="text-2xl font-black text-[#1B4D3E] flex items-center gap-2">{CG_FLAGS[activeCountry.id]}<span>{activeCountry.name}</span></h2>
              <p className="text-xs text-[#5C6B63]">
                Official destination guidelines for international degree-seeking students.
              </p>
            </div>

            <a
              href={activeCountry.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[6px] bg-[#1B4D3E] hover:bg-[#2E6B57] text-[#FAF7F0] text-xs font-semibold shadow-xs transition-colors self-start md:self-center"
            >
              <span>Visit Official National Portal</span>
              <ExternalLink className="w-4 h-4 text-[#FAF7F0]" />
            </a>
          </div>

          {/* Grid of Key Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Language & Admission Standards */}
            <div className="bg-white rounded-[8px] border border-slate-200 p-6 space-y-3 shadow-sm hover:border-[#FF5E00] transition-colors">
              <div className="flex items-center gap-2 text-[#FF5E00]">
                <GraduationCap className="w-5 h-5 text-[#FF5E00]" />
                <h3 className="font-bold text-[#0B1026] text-base">Language Requirements</h3>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeCountry.languageNote}
              </p>
              <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-semibold text-[#0B1026]">Key Takeaway:</span>
                <p>
                  Always verify whether individual departments require English C1 (IELTS 7.0+) or B2 (IELTS 6.0/6.5). Scores must be sent directly via ETS or British Council.
                </p>
              </div>
            </div>

            {/* Living Costs & Blocked Account */}
            <div className="bg-white rounded-[8px] border border-slate-200 p-6 space-y-3 shadow-sm hover:border-[#FF5E00] transition-colors">
              <div className="flex items-center gap-2 text-[#FF5E00]">
                <Euro className="w-5 h-5 text-[#FF5E00]" />
                <h3 className="font-bold text-[#0B1026] text-base">Cost & Financial Proof</h3>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {activeCountry.costRange}
              </p>
              <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 text-xs text-slate-600 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#0B1026]">Financial Proof Requirement:</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-[4px] border border-emerald-200">
                    🇮🇳 Indian Student Reference
                  </span>
                </div>
                <p>
                  {activeCountryId === 'germany' &&
                    'Requires a Sperrkonto (blocked account) with €11,904/year (€992/month) [approx. ₹10.86 Lakhs INR] deposited prior to visa issuance.'}
                  {activeCountryId === 'ireland' &&
                    'Requires evidence of immediate access to at least €10,000 for living expenses [approx. ₹9.12 Lakhs INR] in addition to paid course tuition.'}
                  {activeCountryId === 'uk' &&
                    'Requires maintenance funds (£1,334/mo [approx. ₹1.46L/mo] for London or £1,023/mo [approx. ₹1.12L/mo] outside) held consecutively for at least 28 days.'}
                </p>
              </div>
            </div>

            {/* Visa & Post-Study Work Regulations */}
            <div className="bg-white rounded-[8px] border border-slate-200 p-6 space-y-3 shadow-sm lg:col-span-2 hover:border-[#FF5E00] transition-colors">
              <div className="flex items-center gap-2 text-[#FF5E00]">
                <Briefcase className="w-5 h-5 text-[#FF5E00]" />
                <h3 className="font-bold text-[#0B1026] text-base">
                  Visa Regulations & Post-Study Work Rights
                </h3>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {activeCountry.visaNote}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 text-xs">
                  <span className="block font-bold text-[#0B1026]">Visa Type</span>
                  <span className="text-slate-700 font-semibold">
                    {activeCountryId === 'germany' && 'National Visa (Type D)'}
                    {activeCountryId === 'ireland' && 'Study Visa (Stamp 2)'}
                    {activeCountryId === 'uk' && 'Student Visa (Points-based)'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 text-xs">
                  <span className="block font-bold text-[#0B1026]">Post-Study Work</span>
                  <span className="text-slate-700 font-semibold">
                    {activeCountryId === 'germany' && '18 months (Job Seeker)'}
                    {activeCountryId === 'ireland' && '24 months (Master’s Stamp 1G)'}
                    {activeCountryId === 'uk' && '2 years (Graduate Route)'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 text-xs">
                  <span className="block font-bold text-[#0B1026]">Portal Architecture</span>
                  <span className="text-slate-700 font-semibold">
                    {activeCountryId === 'germany' && 'uni-assist VPD / Direct Portal'}
                    {activeCountryId === 'ireland' && 'CAO (UG) / Direct University (PG)'}
                    {activeCountryId === 'uk' && 'UCAS (UG) / Direct University (PG)'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Document Checklist */}
          <div className="bg-white rounded-[8px] border border-slate-200 p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-emerald-600">
                  <FileCheck2 className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-[#0B1026] text-lg">
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
                  <span className="text-xs font-bold text-[#0B1026]">
                    {completedCount} of {totalCount} ready
                  </span>
                  <div className="w-28 bg-slate-100 rounded-full h-2 mt-1 overflow-hidden">
                    <div
                      className="bg-[#FF5E00] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={selectAllDocs}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#FF5E00] bg-slate-100 hover:bg-slate-200 rounded-[6px] transition-colors"
                  title="Select All"
                >
                  All
                </button>
                <button
                  onClick={resetDocs}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-[6px] transition-colors"
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
                const isStatementDoc =
                  docItem.toLowerCase().includes('motivation letter') ||
                  docItem.toLowerCase().includes('statement of purpose') ||
                  docItem.toLowerCase().includes('personal statement');

                return (
                  <div
                    key={idx}
                    onClick={() => toggleDoc(docItem)}
                    className={`flex flex-col gap-2 p-3.5 rounded-[6px] border text-xs cursor-pointer transition-all select-none ${
                      isChecked
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 font-medium'
                        : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      <span className={isChecked ? 'line-through text-slate-500' : 'leading-relaxed'}>
                        {docItem}
                      </span>
                    </div>

                    {isStatementDoc && (
                      <div className="mt-1 pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pl-7">
                        <span className="text-[11px] text-slate-500 font-normal">
                          {countrySelectedProgram ? (
                            <span>
                              Selected programme:{' '}
                              <strong className="text-slate-800">{countrySelectedProgram.name}</strong> ({countrySelectedProgram.program})
                            </span>
                          ) : (
                            <span>
                              No programme selected yet for {activeCountry.name}. Choose one on Matches first.
                            </span>
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCheckStatementRequirements();
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[6px] bg-[#FF5E00] hover:bg-[#E65400] text-[#0B1026] text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto shrink-0"
                          title="Check official statement requirements"
                        >
                          <FileText className="w-3.5 h-3.5 text-[#0B1026]" />
                          <span>Check statement requirements</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-[6px] text-xs text-slate-500">
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
