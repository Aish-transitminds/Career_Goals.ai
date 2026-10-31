/**
 * AbroadPath AI - University Matches Page
 * File: src/pages/MatchesPage.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R2) & PROJECT.md
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../hooks/useCatalog';
import { getUserApplications, setUserApplication } from '../services/firestoreService';
import { MatchResult, FitCategory, University } from '../types';
import { calculateMatches, isDemonstrationRuleChange } from '../utils/matchEngine';
import { getUniversitiesByField } from '../services/firestoreService';
import { getSubjectSuggestions, SubjectSuggestion } from '../services/subjectSuggestionService';
import { RuleChangedBanner } from '../components/common/RuleChangedBanner';
import { EligibilityComparisonTable } from '../components/common/EligibilityComparisonTable';
import { VerificationStatusBadge } from '../components/common/VerificationStatusBadge';
import { FeeBreakdownPanel } from '../components/common/FeeBreakdownPanel';
import { MatchExplanationCard } from '../components/common/MatchExplanationCard';
import { buildEligibilityComparison, mapFitCategoryToEnhanced } from '../utils/eligibilityEngine';
import { getTuitionInrEstimate } from '../utils/currencyUtils';
import {
  Search,
  ExternalLink,
  Check,
  AlertCircle,
  BookOpen,
  Calendar,
  Shield,
  LayoutGrid,
  List,
  ArrowUpDown,
} from 'lucide-react';

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/** Formats country and program name in sentence case, avoiding all-caps */
function formatCountryAndProgram(countryId: string, program: string): string {
  const countryMap: Record<string, string> = {
    germany: 'Germany',
    ireland: 'Ireland',
    uk: 'United Kingdom',
    usa: 'United States',
    canada: 'Canada',
    australia: 'Australia',
  };
  const country = countryMap[countryId] || countryId.charAt(0).toUpperCase() + countryId.slice(1);
  return `${country} · ${program}`;
}

/** Formats date into readable verification label e.g. "Verified 15 Oct 2026" */
function formatVerificationDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Admissions details not verified';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = d.toLocaleDateString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `Verified ${day} ${month} ${year}`;
    }
  } catch {}
  return `Verified ${dateStr}`;
}

/** Extracts tuition main figure (INR) and small muted original figure */
function formatTuitionDisplay(tuitionStr: string | null | undefined): { main: string; sub: string } {
  if (!tuitionStr) return { main: 'Not listed', sub: '' };
  const lower = tuitionStr.toLowerCase();
  if (lower.includes('€0') || lower.includes('free') || lower.includes('tuition-free')) {
    return { main: '\u20B90 (Free)', sub: 'Tuition-free' };
  }
  const est = getTuitionInrEstimate(tuitionStr);
  const cleanSub = tuitionStr
    .replace(/\s*\/ semester\s*/i, ' / sem ')
    .replace(/\s*\/ year\s*/i, ' / yr ')
    .replace(/\(Non-EU\)/i, 'non-EU')
    .replace(/for non-EU students/i, 'non-EU')
    .trim();

  if (est) {
    const cleaned = est.replace('~', '').replace('Lakhs', 'L');
    return { main: cleaned, sub: cleanSub };
  }
  return { main: cleanSub, sub: '' };
}

/** Parses deadline string into primary date e.g. "Jul 1" and intake/sub-cycle */
function formatDeadlineDisplay(deadlineStr: string | null | undefined): { main: string; sub: string } {
  if (!deadlineStr) return { main: 'Not confirmed', sub: '' };

  const parenMatch = deadlineStr.match(/^([^(]+)(?:\(([^)]+)\))?/);
  if (parenMatch) {
    let main = parenMatch[1].trim();
    main = main
      .replace(/January/i, 'Jan')
      .replace(/February/i, 'Feb')
      .replace(/March/i, 'Mar')
      .replace(/April/i, 'Apr')
      .replace(/June/i, 'Jun')
      .replace(/July/i, 'Jul')
      .replace(/August/i, 'Aug')
      .replace(/September/i, 'Sep')
      .replace(/October/i, 'Oct')
      .replace(/November/i, 'Nov')
      .replace(/December/i, 'Dec');

    if (main.includes('/')) {
      main = main.split('/')[0].trim();
    }

    let sub = parenMatch[2]?.trim() || '';
    if (sub.toLowerCase().includes('rolling')) {
      sub = 'Rolling';
    } else if (deadlineStr.toLowerCase().includes('winter')) {
      sub = 'Winter intake';
    } else if (!sub) {
      sub = 'Regular cycle';
    }
    return { main, sub };
  }

  return { main: deadlineStr, sub: '' };
}

/** Evaluates user IELTS against requirement */
function getIeltsStatus(userIelts: number | null | undefined, minIelts: number | null | undefined): {
  text: string;
  status: 'met' | 'gap' | 'neutral';
} {
  if (minIelts == null) return { text: 'Not confirmed', status: 'neutral' };
  if (minIelts === 0) return { text: 'Not required', status: 'neutral' };
  if (userIelts != null && userIelts > 0) {
    if (userIelts >= minIelts) {
      return { text: `✓ You meet ${minIelts}`, status: 'met' };
    }
    const gap = (minIelts - userIelts).toFixed(1);
    return { text: `Needs ${minIelts} (gap ${gap})`, status: 'gap' };
  }
  return { text: `Min ${minIelts}`, status: 'neutral' };
}

/** Formats TOEFL display in plain text */
function getToeflDisplay(minToefl: number | null | undefined): string {
  if (minToefl == null) return 'Not confirmed';
  if (minToefl === 0) return 'Not required';
  return `Min ${minToefl}`;
}

/** Consolidates GRE/GMAT into a single muted line */
function getGreGmatSummary(req: any): string {
  if (req.gre_required && req.gmat_required) {
    return 'GRE & GMAT evaluated';
  }
  if (req.gre_required) {
    return req.min_gre ? `GRE required (min ${req.min_gre})` : 'GRE required';
  }
  if (req.gmat_required) {
    return req.min_gmat ? `GMAT required (min ${req.min_gmat})` : 'GMAT required';
  }
  if (req.gre_required === false && req.gmat_required === false) {
    return 'GRE/GMAT: Waived';
  }
  return 'GRE/GMAT: not required or unconfirmed';
}

/** Derives concise, human-readable reason instead of repeated "100%" */
function getFitReason(m: MatchResult, profile: any): string {
  if (m.fitCategory === 'Strong fit') {
    if (
      profile?.exams?.ielts &&
      m.university.requirements.min_ielts &&
      profile.exams.ielts >= m.university.requirements.min_ielts
    ) {
      return 'Meets IELTS, within budget';
    }
    const lower = (m.university.tuition || '').toLowerCase();
    if (lower.includes('free') || lower.includes('€0')) {
      return 'Tuition-free, academic fit';
    }
    return 'Meets academic & language criteria';
  }
  if (m.fitCategory === 'Possible') {
    if (m.missingExams && m.missingExams.length > 0) {
      return `Pending ${m.missingExams[0]}`;
    }
    return 'Near admission benchmark';
  }
  if (m.fitCategory === 'Reach') {
    return 'Competitive academic profile';
  }
  if (m.fitCategory === 'Prep needed') {
    if (m.missingExams && m.missingExams.length > 0) {
      return `Requires ${m.missingExams.join(', ')}`;
    }
    return 'Preparation recommended';
  }
  return 'Verified admission criteria';
}

/** Numeric tuition estimate for sorting */
function getNumericTuition(tuitionStr: string | null | undefined): number {
  if (!tuitionStr) return 0;
  const lower = tuitionStr.toLowerCase();
  if (lower.includes('free') || lower.includes('€0')) return 0;
  const m = tuitionStr.match(/[\d,]+/);
  if (m) {
    const raw = parseFloat(m[0].replace(/,/g, ''));
    if (tuitionStr.includes('£')) return raw * 1.2;
    return raw;
  }
  return 999999;
}

// ============================================================================
// MAIN MATCHES PAGE COMPONENT
// ============================================================================


const CampusSceneBanner: React.FC<{
  univName: string;
  photoUrl?: string;
  photoCredit?: string;
  photoLicense?: string;
  photoSourceUrl?: string;
  photoLicenseUrl?: string;
}> = ({
  univName,
  photoUrl,
  photoCredit,
  photoLicense,
  photoSourceUrl,
  photoLicenseUrl,
}) => {
  const [imageFailed, setImageFailed] = useState(!photoUrl);

  return (
    <div className="relative w-full h-full min-h-[180px] overflow-hidden rounded-xl bg-[#1B4D3E]">
      {photoUrl && !imageFailed ? (
        <img
          src={photoUrl}
          alt={`${univName} campus`}
          className="absolute inset-0 w-full h-full object-cover z-10"
          loading="lazy"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div
          className="absolute inset-0 z-10 flex items-end overflow-hidden bg-gradient-to-br from-[#123c32] via-[#23634f] to-[#81a88b] px-5 pb-5 pt-4"
          role="img"
          aria-label={`Illustrated campus placeholder for ${univName}`}
        >
          <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="absolute right-8 top-7 h-14 w-14 rounded-full border border-white/20 bg-white/10" aria-hidden="true" />
          <svg
            className="absolute inset-x-0 bottom-0 h-[82%] w-full text-[#102f2a]/45"
            viewBox="0 0 640 260"
            preserveAspectRatio="xMidYMax slice"
            fill="none"
            aria-hidden="true"
          >
            <path d="M0 220H640V260H0z" fill="currentColor" />
            <path d="M95 220V112h450v108H95Z" fill="currentColor" />
            <path d="m75 114 245-92 245 92H75Z" fill="currentColor" />
            <path d="M295 22h50v-16h-50v16Z" fill="currentColor" />
            <path d="M126 136h28v40h-28zm58 0h28v40h-28zm58 0h28v40h-28zm186 0h28v40h-28zm58 0h28v40h-28z" fill="#dbe9d8" fillOpacity=".42" />
            <path d="M284 138h72v82h-72z" fill="#dbe9d8" fillOpacity=".55" />
            <path d="M308 162h24v58h-24z" fill="currentColor" />
            <path d="M45 220c22-30 47-30 69 0m412 0c22-30 47-30 69 0" stroke="#dbe9d8" strokeOpacity=".3" strokeWidth="5" />
          </svg>
          <div className="relative z-10 max-w-[85%] text-white">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
              Campus preview
            </span>
            <span className="block text-lg font-semibold leading-tight drop-shadow-sm">{univName}</span>
          </div>
        </div>
      )}

      {!imageFailed && photoCredit && photoLicense && photoSourceUrl && photoLicenseUrl && (
        <div className="absolute bottom-2 left-3 z-20 flex flex-wrap items-center gap-1 rounded-full border border-white/20 bg-slate-900/85 px-2.5 py-1 text-[10px] font-medium text-white">
          <a href={photoSourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            Photo: {photoCredit}
          </a>
          <span aria-hidden="true">·</span>
          <a href={photoLicenseUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            {photoLicense}
          </a>
        </div>
      )}
    </div>
  );
};


const getCountryFlagSvg = (countryId: string) => {
  const c = (countryId || '').toLowerCase();
  if (c.includes('germany') || c === 'de') {
    return (
      <svg className="w-3.5 h-2.5 rounded-2xs shadow-xs inline-block align-middle mr-1 shrink-0" viewBox="0 0 640 480">
        <path fill="#000" d="M0 0h640v160H0z"/>
        <path fill="#D00" d="M0 160h640v160H0z"/>
        <path fill="#FFCE00" d="M0 320h640v160H0z"/>
      </svg>
    );
  }
  if (c.includes('ireland') || c === 'ie') {
    return (
      <svg className="w-3.5 h-2.5 rounded-2xs shadow-xs inline-block align-middle mr-1 shrink-0" viewBox="0 0 640 480">
        <path fill="#169B62" d="M0 0h213.3v480H0z"/>
        <path fill="#FFF" d="M213.3 0h213.4v480H213.3z"/>
        <path fill="#FF883E" d="M426.7 0H640v480H426.7z"/>
      </svg>
    );
  }
  if (c === 'uk' || c === 'gb' || c.includes('united kingdom')) return (
    <svg className="w-3.5 h-2.5 rounded-2xs shadow-xs inline-block align-middle mr-1 shrink-0" viewBox="0 0 640 480">
      <path fill="#012169" d="M0 0v480h640V0z"/>
      <path stroke="#FFF" strokeWidth="60" d="m0 0 640 480m0-480L0 480"/>
      <path stroke="#C8102E" strokeWidth="40" d="m0 0 640 480m0-480L0 480"/>
      <path stroke="#FFF" strokeWidth="100" d="M320 0v480M0 240h640"/>
      <path stroke="#C8102E" strokeWidth="60" d="M320 0v480M0 240h640"/>
    </svg>
  );
  return null;
};

export const MatchesPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { universities, loading: catalogLoading } = useCatalog();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Filters state
  const initialCountry = searchParams.get('country');
  const [selectedCountry, setSelectedCountry] = useState<string>(
    initialCountry && ['germany', 'ireland', 'uk', 'usa', 'canada', 'australia'].includes(initialCountry)
      ? initialCountry
      : 'all'
  );
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedIntake, setSelectedIntake] = useState<string>('2026');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appliedUnivIds, setAppliedUnivIds] = useState<Set<string>>(new Set());
  const [fieldUniversities, setFieldUniversities] = useState<University[]>([]);
  const [fieldQueryLoading, setFieldQueryLoading] = useState(false);
  const [fieldQueryError, setFieldQueryError] = useState<string | null>(null);
  const [subjectSuggestions, setSubjectSuggestions] = useState<SubjectSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const intendedSubject = profile?.intendedSubject?.trim() || '';

  // Sort & View controls
  const [sortBy, setSortBy] = useState<'fit' | 'deadline' | 'tuition'>('fit');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Sync selectedCountry if query param updates
  useEffect(() => {
    const c = searchParams.get('country');
    if (c && ['germany', 'ireland', 'uk', 'usa', 'canada', 'australia', 'all'].includes(c)) {
      setSelectedCountry(c);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    if (!intendedSubject) {
      setFieldUniversities([]);
      setFieldQueryError(null);
      setFieldQueryLoading(false);
      return () => { active = false; };
    }

    setFieldQueryLoading(true);
    setFieldQueryError(null);
    getUniversitiesByField(intendedSubject)
      .then((matches) => {
        if (active) setFieldUniversities(matches);
      })
      .catch((error: unknown) => {
        console.error('[MatchesPage] Subject query failed:', error);
        if (active) {
          setFieldUniversities([]);
          setFieldQueryError('Could not refresh subject matches from the catalog. Showing available local catalogue results.');
        }
      })
      .finally(() => {
        if (active) setFieldQueryLoading(false);
      });

    return () => { active = false; };
  }, [intendedSubject]);

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
    const localFieldMatches = intendedSubject
      ? universities.filter((university) =>
        university.fields?.includes(intendedSubject) || university.field === intendedSubject
      )
      : universities;
    const mergedById = new Map<string, University>();
    for (const university of [...localFieldMatches, ...fieldUniversities]) {
      const previous = mergedById.get(university.id);
      mergedById.set(university.id, previous
        ? { ...previous, ...university, fields: university.fields?.length ? university.fields : previous.fields }
        : university);
    }
    const filteredUniversities = Array.from(mergedById.values());
    if (!profile || filteredUniversities.length === 0) {
      return filteredUniversities.map((u) => ({
        university: u,
        fitCategory: 'Prep needed' as FitCategory,
        fitScore: -1,
        missingExams: [],
        metRequirements: [],
        nearRequirements: [],
        belowRequirements: [],
        unconfirmedRequirements: [],
        ruleChanged: Boolean(u.ruleChanged),
      }));
    }
    return calculateMatches(profile, filteredUniversities);
  }, [profile, universities, fieldUniversities, intendedSubject]);

  const subjectMatchesForCountry = useMemo(
    () => matchResults.filter(({ university }) =>
      selectedCountry === 'all' || university.countryId === selectedCountry
    ),
    [matchResults, selectedCountry]
  );

  useEffect(() => {
    let active = true;
    if (!intendedSubject || fieldQueryLoading || catalogLoading || subjectMatchesForCountry.length > 0) {
      setSubjectSuggestions([]);
      setSuggestionsError(null);
      setSuggestionsLoading(false);
      return () => { active = false; };
    }

    setSuggestionsLoading(true);
    setSuggestionsError(null);
    const country = selectedCountry === 'all'
      ? (profile?.targetCountries?.join(', ') || 'all supported countries')
      : selectedCountry;
    getSubjectSuggestions(intendedSubject, country, profile?.budget ?? null)
      .then((suggestions) => {
        if (active) setSubjectSuggestions(suggestions);
      })
      .catch((error: unknown) => {
        console.error('[MatchesPage] AI subject suggestions failed:', error);
        if (active) {
          setSubjectSuggestions([]);
          setSuggestionsError(error instanceof Error ? error.message : 'AI suggestions could not be loaded.');
        }
      })
      .finally(() => {
        if (active) setSuggestionsLoading(false);
      });

    return () => { active = false; };
  }, [
    intendedSubject,
    selectedCountry,
    subjectMatchesForCountry.length,
    fieldQueryLoading,
    catalogLoading,
    profile?.budget,
    profile?.targetCountries,
  ]);

  // Filter matches based on user filter selections
  const filteredMatches = useMemo(() => {
    return matchResults.filter((m) => {
      const u = m.university;
      if (selectedCountry !== 'all' && u.countryId !== selectedCountry) {
        return false;
      }
      if (selectedTier !== 'all' && m.fitCategory !== selectedTier) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim().slice(0, 500);
        const nameMatch = u.name.toLowerCase().includes(query);
        const programMatch = u.program.toLowerCase().includes(query);
        if (!nameMatch && !programMatch) return false;
      }
      return true;
    });
  }, [matchResults, selectedCountry, selectedTier, searchQuery]);

  // Sort filtered matches
  const sortedMatches = useMemo(() => {
    const list = [...filteredMatches];
    if (sortBy === 'tuition') {
      list.sort((a, b) => getNumericTuition(a.university.tuition) - getNumericTuition(b.university.tuition));
    } else if (sortBy === 'deadline') {
      list.sort((a, b) =>
        (a.university.requirements.application_deadline || '').localeCompare(
          b.university.requirements.application_deadline || ''
        )
      );
    } else {
      // Default: fit score descending
      list.sort((a, b) => b.fitScore - a.fitScore);
    }
    return list;
  }, [filteredMatches, sortBy]);

  // Memoized university counts per country tab
  const countryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: matchResults.length };
    for (const m of matchResults) {
      const cid = m.university.countryId;
      counts[cid] = (counts[cid] || 0) + 1;
    }
    return counts;
  }, [matchResults]);

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
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B4D3E]">
            Verified University Matches
          </h1>
          <p className="text-[#5C6B63] text-sm mt-1">
            Ranked by deterministic score calculation against verified admission criteria.
          </p>
        </div>

        {!profile && (
          <button
            onClick={() => navigate('/onboarding')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1B4D3E] hover:bg-[#2E6B57] text-[#FAF7F0] rounded-[6px] text-sm font-semibold shadow-xs transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Complete Onboarding Profile</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-[#E6DFCF] shadow-xs space-y-4">
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
              className="w-full pl-9 pr-4 py-2.5 rounded-[6px] border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#FF5E00] focus:ring-1 focus:ring-[#FF5E00]"
            />
          </div>

          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="px-3.5 py-2.5 rounded-[6px] border border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-[#FF5E00] focus:ring-1 focus:ring-[#FF5E00] bg-white"
          >
            <option value="all">All Match Levels</option>
            <option value="Strong fit">Strong Match (≥ 90%)</option>
            <option value="Possible">Moderate Match (60% – 89%)</option>
            <option value="Reach">Ambitious Match (&lt; 60%)</option>
            <option value="Prep needed">Not Eligible / Prep Needed</option>
          </select>
        </div>

        {/* Country Filter Tabs & Intake Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase mr-1">Country:</span>
            {[
              { id: 'all', label: 'All Destinations', flag: null },
              {
                id: 'germany',
                label: 'Germany',
                flag: getCountryFlagSvg('germany'),
              },
              {
                id: 'ireland',
                label: 'Ireland',
                flag: getCountryFlagSvg('ireland'),
              },
              {
                id: 'uk',
                label: 'United Kingdom',
                flag: getCountryFlagSvg('uk'),
              },
              { id: 'usa', label: 'United States', flag: null },
              { id: 'canada', label: 'Canada', flag: null },
              { id: 'australia', label: 'Australia', flag: null },
            ].map((tab) => {
              const isActive = selectedCountry === tab.id;
              const count = countryCounts[tab.id] || 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCountry(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#0B1026] text-[#FF5E00] border border-[#0B1026] shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {tab.flag}
                  <span>{tab.label}</span>
                  <span className="text-[11px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Intake Year Selection */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-[6px]">
            <span className="text-xs font-semibold text-slate-600 uppercase px-2 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#FF5E00]" />
              <span>Intake:</span>
            </span>
            {['2026', '2027', '2028'].map((year) => (
              <button
                key={year}
                onClick={() => setSelectedIntake(year)}
                className={`px-2.5 py-1 rounded-[4px] text-xs font-bold transition-all ${
                  selectedIntake === year
                    ? 'bg-[#FF5E00] text-[#0B1026] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {fieldQueryError && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {fieldQueryError}
        </p>
      )}

      {/* Sort & View Mode Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#5C6B63] font-medium px-1">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-[#5C6B63]" />
          <span>Sort by:</span>
          <div className="inline-flex rounded-[6px] border border-[#E6DFCF] bg-white p-0.5 shadow-2xs">
            <button
              onClick={() => setSortBy('fit')}
              className={`px-2.5 py-1 rounded-[4px] text-xs transition-colors ${
                sortBy === 'fit'
                  ? 'bg-[#1B4D3E] text-[#FAF7F0] font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fit
            </button>
            <button
              onClick={() => setSortBy('deadline')}
              className={`px-2.5 py-1 rounded-[4px] text-xs transition-colors ${
                sortBy === 'deadline'
                  ? 'bg-[#1B4D3E] text-[#FAF7F0] font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Deadline
            </button>
            <button
              onClick={() => setSortBy('tuition')}
              className={`px-2.5 py-1 rounded-[4px] text-xs transition-colors ${
                sortBy === 'tuition'
                  ? 'bg-[#1B4D3E] text-[#FAF7F0] font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tuition
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span>Showing {sortedMatches.length} matching institutions</span>
          <div className="inline-flex rounded-[6px] border border-[#E6DFCF] bg-white p-0.5 shadow-2xs">
            <button
              onClick={() => setViewMode('cards')}
              title="Cards View"
              className={`p-1 rounded-[4px] transition-colors ${
                viewMode === 'cards'
                  ? 'bg-[#1B4D3E] text-[#FAF7F0]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Compact Table View"
              className={`p-1 rounded-[4px] transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#1B4D3E] text-[#FAF7F0]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* University Matches Content: Cards View or Table View */}
      {catalogLoading || fieldQueryLoading ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          Loading universities for your selected subject...
        </div>
      ) : sortedMatches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-8 space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-semibold text-slate-800">
            No universities match your filters
          </h3>
          <p className="text-xs text-slate-500">
            Try resetting the country or tier filter.
          </p>
          {intendedSubject && subjectMatchesForCountry.length === 0 && (
            <section className="mx-auto mt-5 max-w-2xl space-y-3 border-t border-slate-200 pt-5 text-left">
              <h4 className="text-sm font-semibold text-slate-800">
                AI-suggested - verify on the official university site
              </h4>
              {suggestionsLoading ? (
                <p className="text-sm text-slate-600">Searching for possible programs...</p>
              ) : suggestionsError ? (
                <p role="status" className="text-sm text-amber-800">{suggestionsError}</p>
              ) : subjectSuggestions.length > 0 ? (
                <ul className="space-y-2">
                  {subjectSuggestions.map((suggestion) => (
                    <li key={`${suggestion.countryId}-${suggestion.name}-${suggestion.program}`} className="rounded-lg border border-slate-200 p-3">
                      <a
                        href={suggestion.officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#1B4D3E] underline underline-offset-2"
                      >
                        {suggestion.name}
                      </a>
                      <p className="text-sm text-slate-700">{formatCountryAndProgram(suggestion.countryId, suggestion.program)}</p>
                      <p className="text-xs text-slate-500">Tuition and deadlines not provided. Verify admissions details on the official site.</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">
                  No suggestions are available for this selection yet. Try another country or verify programs through official university sites.
                </p>
              )}
            </section>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* Optional Compact Table View */
        <div className="bg-white rounded-xl border border-[#E6E8F0] shadow-sm overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-[#E6E8F0] text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">University &amp; Program</th>
                <th className="py-3 px-4">Tuition</th>
                <th className="py-3 px-4">Deadline</th>
                <th className="py-3 px-4">IELTS</th>
                <th className="py-3 px-4">Fit Reason</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E8F0]">
              {sortedMatches.map((m) => {
                const { university: u, fitCategory, missingExams } = m;
                const isApplied = appliedUnivIds.has(u.id);
                const tuitionDisplay = formatTuitionDisplay(u.tuition);
                const deadlineDisplay = formatDeadlineDisplay(u.requirements.application_deadline);
                const ieltsStatus = getIeltsStatus(profile?.exams?.ielts, u.requirements.min_ielts);
                const enhancedCategory = mapFitCategoryToEnhanced(fitCategory, m);
                const fitReason = getFitReason(
                  { university: u, fitCategory, fitScore: 0, missingExams, metRequirements: [], nearRequirements: [], belowRequirements: [], unconfirmedRequirements: [], ruleChanged: false },
                  profile
                );

                return (
                  <tr key={u.id} className={isApplied ? 'bg-emerald-50/20' : 'hover:bg-slate-50/60'}>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-sm text-[#0B1026]">{u.name}</div>
                      <div className="text-slate-500 text-xs">
                        <span className="inline-flex items-center gap-1">{getCountryFlagSvg(u.countryId)}<span>{formatCountryAndProgram(u.countryId, u.program)}</span></span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-[#0B1026]">{tuitionDisplay.main}</div>
                      {tuitionDisplay.sub && (
                        <div className="text-slate-400 text-[11px]">{tuitionDisplay.sub}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-semibold text-[#0B1026]">{deadlineDisplay.main}</div>
                      {deadlineDisplay.sub && (
                        <div className="text-slate-400 text-[11px]">{deadlineDisplay.sub}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={
                          ieltsStatus.status === 'met'
                            ? 'text-emerald-700 font-medium'
                            : ieltsStatus.status === 'gap'
                            ? 'text-amber-700 font-medium'
                            : 'text-slate-700'
                        }
                      >
                        {ieltsStatus.text}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-slate-800 font-medium text-xs">{enhancedCategory}</span>
                      <span className="text-slate-400 text-[11px] block">{fitReason}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          try {
                            localStorage.setItem('abroadpath_last_selected_program', u.id);
                            localStorage.setItem('abroadpath_last_selected_intake', selectedIntake);
                          } catch {}
                          navigate(
                            `/letter-helper?programId=${encodeURIComponent(u.id)}&intake=${encodeURIComponent(selectedIntake)}`
                          );
                        }}
                        className="px-3 py-1.5 bg-[#FF5E00] hover:bg-[#E65400] text-[#0B1026] text-xs font-semibold rounded-[6px] shadow-xs transition-colors"
                      >
                        Check statement requirements
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Redesigned 3-Column Fixed Grid Match Cards */
        <div className="space-y-4">
          {sortedMatches.map((m) => {
            const { university: u, fitCategory, missingExams } = m;
            const isApplied = appliedUnivIds.has(u.id);
            const tuitionDisplay = formatTuitionDisplay(u.tuition);
            const deadlineDisplay = formatDeadlineDisplay(u.requirements.application_deadline);
            const ieltsStatus = getIeltsStatus(profile?.exams?.ielts, u.requirements.min_ielts);
            const toeflDisplay = getToeflDisplay(u.requirements.min_toefl);
            const greGmatSummary = getGreGmatSummary(u.requirements);
            const fitReason = getFitReason(
              { university: u, fitCategory, fitScore: 0, missingExams, metRequirements: [], nearRequirements: [], belowRequirements: [], unconfirmedRequirements: [], ruleChanged: false },
              profile
            );
            const enhancedCategory = mapFitCategoryToEnhanced(fitCategory, m);
            const eligibilityComparison = profile
              ? buildEligibilityComparison(profile, u)
              : null;

            return (
              <div
                key={u.id}
                className={`match-card bg-white rounded-2xl overflow-hidden border transition-all ${
                  isApplied
                    ? 'border-emerald-300 bg-emerald-50/10 shadow-2xs'
                    : 'border-[#E6E8F0] hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Rule Changed Banner (rendered when official criteria change detected) */}
                {u.ruleChanged && !isDemonstrationRuleChange(u) && (
                  <div className="match-card__banner">
                    <RuleChangedBanner
                      changedFields={u.changedFields || ['gmat_required']}
                      previousValues={u.previousValues || { gmat_required: null }}
                      currentValues={{ gmat_required: u.requirements.gmat_required }}
                      lastChanged={u.lastChanged || u.lastChecked}
                      demoSeeded={u.demoSeeded}
                    />
                  </div>
                )}

                <div className="match-card__media">
                  <CampusSceneBanner
                    univName={u.name}
                    photoUrl={u.photoUrl}
                    photoCredit={u.photoCredit}
                    photoLicense={u.photoLicense}
                    photoSourceUrl={u.photoSourceUrl}
                    photoLicenseUrl={u.photoLicenseUrl}
                  />
                </div>

                <div className="match-card__content">
                  <div className="match-card__main">
                    <div className="match-card__identity space-y-1.5 min-w-0">
                      <h2 className="text-[20px] font-semibold text-[#0B1026] leading-snug">
                        {u.name}
                      </h2>
                      <p className="text-sm font-normal text-slate-500">
                        {formatCountryAndProgram(u.countryId, u.program)}
                      </p>
                      <div className="pt-2 flex items-center gap-1.5 text-xs text-slate-400 font-normal">
                        <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatVerificationDate(u.lastChecked)}</span>
                      </div>
                      {/* Verification status indicators */}
                      <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                        <VerificationStatusBadge university={u} type="compact" />
                      </div>
                    </div>

                    <div className="match-card__facts min-w-0">
                      <div className="match-card__stats">
                    {/* Tuition */}
                    <div className="min-w-0">
                      <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Tuition
                      </span>
                      <span className="block text-sm font-semibold text-[#0B1026] mt-0.5">
                        {tuitionDisplay.main}
                      </span>
                      {tuitionDisplay.sub && (
                        <span className="block text-xs text-slate-500 font-normal leading-tight mt-0.5">
                          {tuitionDisplay.sub}
                        </span>
                      )}
                    </div>

                    {/* Deadline */}
                    <div className="min-w-0">
                      <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Deadline
                      </span>
                      <span className="block text-sm font-semibold text-[#0B1026] mt-0.5">
                        {deadlineDisplay.main}
                      </span>
                      {deadlineDisplay.sub && (
                        <span className="block text-xs text-slate-500 font-normal leading-tight mt-0.5 whitespace-nowrap">
                          {deadlineDisplay.sub}
                        </span>
                      )}
                    </div>

                    {/* IELTS */}
                    <div className="min-w-0">
                      <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        IELTS
                      </span>
                      <span
                        className={`block text-xs mt-0.5 leading-tight ${
                          ieltsStatus.status === 'met'
                            ? 'text-emerald-700 font-semibold'
                            : ieltsStatus.status === 'gap'
                            ? 'text-amber-700 font-semibold'
                            : 'text-slate-700 font-medium'
                        }`}
                      >
                        {ieltsStatus.text}
                      </span>
                    </div>

                    {/* TOEFL */}
                    <div className="min-w-0">
                      <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        TOEFL
                      </span>
                      <span className="block text-xs font-normal text-slate-700 mt-0.5 leading-tight">
                        {toeflDisplay}
                      </span>
                    </div>
                  </div>

                  {/* GRE / GMAT single muted line */}
                  <div className="pt-1 text-xs text-slate-500 font-normal flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    <span>{greGmatSummary}</span>
                  </div>
                  {!u.lastChecked && (
                    <p className="pt-2 text-xs leading-relaxed text-amber-800">
                      Admissions fees, deadlines, and requirements are not verified in our catalog yet. Check the official program page.
                    </p>
                  )}
                    </div>
                  </div>
                </div>

                {/* Enhanced: Eligibility Comparison, Fee Breakdown, Match Explanation */}
                <div className="px-5 pb-2 space-y-2">
                  {eligibilityComparison && (
                    <EligibilityComparisonTable
                      comparison={eligibilityComparison}
                      universityName={u.name}
                    />
                  )}
                  <FeeBreakdownPanel university={u} />
                  {profile && (
                    <MatchExplanationCard matchResult={m} profile={profile} />
                  )}
                </div>

                <div className="match-card__footer">
                  <div className="match-card__fit-line text-xs leading-normal min-w-0">
                    <span className="font-semibold text-[#0B1026]">{enhancedCategory}</span>
                    <span className="text-slate-400 mx-1">·</span>
                    <span className="text-slate-400 font-normal text-[11px]">{fitCategory}</span>
                    {fitReason && (
                      <>
                        <span className="text-slate-400 mx-1.5">·</span>
                        <span className="text-slate-500 font-normal">{fitReason}</span>
                      </>
                    )}
                  </div>

                  <div className="match-card__actions">
                    <button
                      onClick={() => {
                        try {
                          localStorage.setItem('abroadpath_last_selected_program', u.id);
                          localStorage.setItem('abroadpath_last_selected_intake', selectedIntake);
                        } catch {}
                        navigate(
                          `/letter-helper?programId=${encodeURIComponent(u.id)}&intake=${encodeURIComponent(selectedIntake)}`
                        );
                      }}
                      className="match-card__button px-6 py-3 bg-[#FF5E00] hover:bg-[#E65400] text-[#0B1026] text-xs font-semibold rounded-[6px] shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#FF5E00]"
                    >
                      Check requirements
                    </button>

                    <a
                      href={u.portalUrl || u.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-slate-600 hover:text-[#0B1026] inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                    >
                      <span>Official site</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleMarkApplied(u.id)}
                      disabled={isApplied}
                      className={`inline-flex items-center gap-1.5 text-xs transition-colors py-0.5 whitespace-nowrap ${
                        isApplied
                          ? 'text-emerald-700 font-semibold cursor-default'
                          : 'text-slate-500 hover:text-slate-800 cursor-pointer'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center transition-colors ${
                          isApplied
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isApplied && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                      <span>{isApplied ? 'Applied ✓' : 'I have applied'}</span>
                    </button>
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
