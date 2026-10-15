/**
 * AbroadPath AI - University Matches Page
 * File: src/pages/MatchesPage.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R2) & PROJECT.md
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../hooks/useCatalog';
import { getUserApplications, setUserApplication } from '../services/firestoreService';
import { MatchResult, FitCategory } from '../types';
import { calculateMatches } from '../utils/matchEngine';
import { RuleChangedBanner } from '../components/common/RuleChangedBanner';
import { VerifiedBadge } from '../components/common/VerifiedBadge';
import { FitTierBadge } from '../components/common/FitTierBadge';
import { RequirementChip } from '../components/common/RequirementChip';
import { getTuitionInrEstimate } from '../utils/currencyUtils';
import {
  Search,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  BookOpen,
} from 'lucide-react';

export const MatchesPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { universities, loading: catalogLoading } = useCatalog();
  const navigate = useNavigate();

  // Filters state
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appliedUnivIds, setAppliedUnivIds] = useState<Set<string>>(new Set());

  // Load existing applied universities for user
  useEffect(() => {
    if (user) {
      getUserApplications(user.uid)
        .then((apps) => {
          const applied = new Set<string>();
          apps.forEach((a) => {
            if (a.status === 'applied') {
              applied.add(a.universityId);
            }
          });
          setAppliedUnivIds(applied);
        })
        .catch((err) => {
          console.warn('[MatchesPage] Failed to fetch applied universities:', err);
        });
    }
  }, [user]);

  // Calculate matches via deterministic matchEngine
  const matchResults: MatchResult[] = useMemo(() => {
    if (!profile || universities.length === 0) {
      return universities.map((u) => ({
        university: u,
        fitCategory: 'Prep needed' as FitCategory,
        fitScore: -1,
        missingExams: [],
        metRequirements: [],
        unconfirmedRequirements: [],
        ruleChanged: Boolean(u.ruleChanged),
      }));
    }
    return calculateMatches(profile, universities);
  }, [profile, universities]);

  // Filter matches based on user filter selections
  const filteredMatches = useMemo(() => {
    return matchResults.filter((m) => {
      const u = m.university;
      // Country Filter
      if (selectedCountry !== 'all' && u.countryId !== selectedCountry) {
        return false;
      }
      // Tier Filter
      if (selectedTier !== 'all' && m.fitCategory !== selectedTier) {
        return false;
      }
      // Search Filter (with 500 char cap)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim().slice(0, 500);
        const nameMatch = u.name.toLowerCase().includes(query);
        const programMatch = u.program.toLowerCase().includes(query);
        if (!nameMatch && !programMatch) return false;
      }
      return true;
    });
  }, [matchResults, selectedCountry, selectedTier, searchQuery]);

  // Handle "I Have Applied" Quick Action
  const handleMarkApplied = async (universityId: string) => {
    if (!user) {
      navigate('/onboarding');
      return;
    }
    try {
      await setUserApplication(user.uid, universityId, 'applied');
      setAppliedUnivIds((prev) => new Set([...prev, universityId]));
    } catch (err) {
      console.error('[MatchesPage] Failed to mark university applied:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Verified University Matches
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Ranked by deterministic score calculation against verified admission criteria.
          </p>
        </div>

        {!profile && (
          <button
            onClick={() => navigate('/onboarding')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Complete Onboarding Profile</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Search & Tier Dropdown */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              maxLength={500}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.slice(0, 500))}
              placeholder="Search university or program name..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">All Fit Tiers</option>
            <option value="Strong fit">Strong Fit (≥ 90%)</option>
            <option value="Possible">Possible (60% – 89%)</option>
            <option value="Reach">Reach (&lt; 60%)</option>
            <option value="Prep needed">Prep Needed</option>
          </select>
        </div>

        {/* Country Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs font-semibold text-slate-500 uppercase mr-1">Country:</span>
          {[
            { id: 'all', label: 'All Destinations' },
            { id: 'germany', label: 'Germany' },
            { id: 'ireland', label: 'Ireland' },
            { id: 'uk', label: 'United Kingdom' },
          ].map((tab) => {
            const isActive = selectedCountry === tab.id;
            const count =
              tab.id === 'all'
                ? matchResults.length
                : matchResults.filter((m) => m.university.countryId === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedCountry(tab.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Counter */}
      <div className="text-xs text-slate-500 font-medium px-1 flex justify-between items-center">
        <span>Showing {filteredMatches.length} matching institutions</span>
        <span className="text-slate-400">All data verified with source links</span>
      </div>

      {/* University Matches Cards List */}
      {catalogLoading ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Loading verified universities...
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">
            No universities match your filters
          </h3>
          <p className="text-xs text-slate-500">
            Try resetting the country or tier filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map(({ university: u, fitCategory, fitScore, missingExams }) => {
            const isApplied = appliedUnivIds.has(u.id);

            return (
              <div
                key={u.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all"
              >
                {/* RULE CHANGED BANNER (rendered when ruleChanged is true, e.g. tum_informatics) */}
                {u.ruleChanged && (
                  <RuleChangedBanner
                    changedFields={u.changedFields || ['gmat_required']}
                    previousValues={u.previousValues || { gmat_required: null }}
                    currentValues={{ gmat_required: u.requirements.gmat_required }}
                    lastChanged={u.lastChanged || u.lastChecked}
                    demoSeeded={u.demoSeeded}
                  />
                )}

                <div className="p-5 sm:p-6 space-y-4">
                  {/* Top Row: Info & Fit Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase font-bold tracking-wider text-slate-500">
                          {u.countryId.toUpperCase()}
                        </span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-xs font-semibold text-slate-600">{u.program}</span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-900">{u.name}</h2>
                    </div>

                    {/* Fit Score Tier Badge */}
                    <div className="flex items-center gap-2">
                      <FitTierBadge category={fitCategory} score={fitScore} />
                    </div>
                  </div>

                  {/* Requirements Breakdown Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {/* IELTS */}
                    <RequirementChip
                      label="IELTS"
                      requiredVal={u.requirements.min_ielts}
                      userVal={profile?.exams?.ielts ?? null}
                      unit=""
                    />
                    {/* TOEFL */}
                    <RequirementChip
                      label="TOEFL"
                      requiredVal={u.requirements.min_toefl}
                      userVal={profile?.exams?.toefl ?? null}
                      unit=""
                    />
                    {/* GRE */}
                    <RequirementChip
                      label="GRE"
                      requiredVal={
                        u.requirements.gre_required
                          ? u.requirements.min_gre || 'Required'
                          : u.requirements.gre_required === false
                          ? 'Waived'
                          : null
                      }
                      userVal={profile?.exams?.gre ?? null}
                      isBooleanRequirement={u.requirements.gre_required !== null}
                    />
                    {/* GMAT */}
                    <RequirementChip
                      label="GMAT"
                      requiredVal={
                        u.requirements.gmat_required
                          ? u.requirements.min_gmat || 'Required'
                          : u.requirements.gmat_required === false
                          ? 'Waived'
                          : null
                      }
                      userVal={profile?.exams?.gmat ?? null}
                      isBooleanRequirement={u.requirements.gmat_required !== null}
                    />
                  </div>

                  {/* Missing Exams Note if in Prep Needed */}
                  {fitCategory === 'Prep needed' && missingExams.length > 0 && (
                    <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-950 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>
                        <strong>Prep Action:</strong> This program evaluates: {missingExams.join(', ')}. Begin preparation to qualify.
                      </span>
                    </div>
                  )}

                  {/* Tuition & Deadline Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-700">Tuition Fee:</span>
                      <span>{u.tuition}</span>
                      {getTuitionInrEstimate(u.tuition) && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-900 font-bold text-[11px] tracking-tight inline-flex items-center gap-1 shadow-2xs">
                          <span>🇮🇳</span>
                          <span>{getTuitionInrEstimate(u.tuition)}</span>
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">Deadline:</span>{' '}
                      {u.requirements.application_deadline || 'Not confirmed'}
                    </div>
                  </div>

                  {/* Bottom Row: Verified Badge & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    {/* Verified Badge with source URL */}
                    <VerifiedBadge lastChecked={u.lastChecked} sourceUrl={u.sourceUrl} />

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <a
                        href={u.portalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                      >
                        <span>Official Portal</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => handleMarkApplied(u.id)}
                        disabled={isApplied}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          isApplied
                            ? 'bg-emerald-100 text-emerald-800 cursor-default'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{isApplied ? 'Application Tracked' : 'I Have Applied'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MatchesPage;
