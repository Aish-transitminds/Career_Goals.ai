/**
 * AbroadPath AI - Rejection Roadmap & Strategic Alternatives Page
 * File: src/pages/RejectionRoadmapPage.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (Screens #7, Acceptance Criteria §Core Flow #6) & PROJECT.md
 */

import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../hooks/useCatalog';
import { matchUniversity, parseAnnualTuition } from '../utils/matchEngine';
import { FitTierBadge } from '../components/common/FitTierBadge';
import {
  TrendingUp,
  AlertCircle,
  ArrowRight,
  HelpCircle,
  Copy,
  Check,
  Building2,
  Calendar,
  BookOpen,
  DollarSign,
  Award,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface RootCauseOption {
  id: string;
  title: string;
  shortDesc: string;
  icon: React.ReactNode;
  diagnosticSymptoms: string[];
  immediateSteps: string[];
  strategicPivot: string;
  recommendedActionLink?: { label: string; url: string };
}

const ROOT_CAUSES: RootCauseOption[] = [
  {
    id: 'ects_deficiency',
    title: 'ECTS / Subject Prerequisite Deficiency',
    shortDesc: 'Undergraduate syllabus did not match the university\'s strict mathematical or theoretical subject credit requirements.',
    icon: <BookOpen className="w-5 h-5 text-[#FF5E00]" />,
    diagnosticSymptoms: [
      'Rejection letter mentions "curricular prerequisites not met" or "insufficient credits in theoretical CS / higher math".',
      'Common at German research universities (e.g. TUM, RWTH Aachen) requiring 20+ ECTS in pure math.',
    ],
    immediateSteps: [
      'Request the official credit matrix evaluation breakdown from the admissions office.',
      'Enroll in accredited online university courses (e.g. FernUni Hagen, Coursera University verified modules) that award transferable ECTS credits.',
      'Pivot toward Universities of Applied Sciences (Fachhochschulen) or Irish universities which evaluate practical competencies rather than rigid credit breakdowns.',
    ],
    strategicPivot: 'Look for institutions with practical or holistic syllabus evaluation policies.',
    recommendedActionLink: { label: 'Explore Practical Universities', url: '/matches' },
  },
  {
    id: 'test_score_gap',
    title: 'Standardized Test Score Gap',
    shortDesc: 'Language (IELTS/TOEFL) or aptitude (GRE/GMAT) score was slightly below departmental cutoffs.',
    icon: <Award className="w-5 h-5 text-amber-600" />,
    diagnosticSymptoms: [
      'IELTS overall score was met but a single sub-band fell below 6.0, or GRE Quant was below departmental expectation.',
      'Application rejected during initial screening without comprehensive faculty review.',
    ],
    immediateSteps: [
      'Take advantage of "IELTS One Skill Retake" if accepted by your target country.',
      'Book a 3-week intensive preparation cycle focusing solely on the deficient section.',
      'Pivot to programs where GRE is either explicitly waived or not required (e.g. Heidelberg University, Trinity College Dublin).',
    ],
    strategicPivot: 'Filter universities by test-optional or lower language cutoffs.',
    recommendedActionLink: { label: 'Check Test-Optional Matches', url: '/matches' },
  },
  {
    id: 'quota_exhaustion',
    title: 'Capacity & Quota (Numerus Clausus) Exhaustion',
    shortDesc: 'Strong profile, but rejected solely due to hyper-competitive non-EU seat quotas.',
    icon: <Calendar className="w-5 h-5 text-blue-600" />,
    diagnosticSymptoms: [
      'Applied within 7 days of deadline when majority of international seats were already allocated.',
      'Rejection letter notes "due to unprecedented applicant volume, qualified candidates could not be accommodated".',
    ],
    immediateSteps: [
      'Target the Summer / Spring semester intake where international applicant volume is 40–50% lower.',
      'Submit your application within the first 14 days of the portal opening.',
      'Apply to universities with rolling admissions where offers are granted continuously.',
    ],
    strategicPivot: 'Reapply in the upcoming intake cycle on opening day.',
  },
  {
    id: 'sop_alignment',
    title: 'Statement of Purpose (SOP) Alignment Deficit',
    shortDesc: 'Motivation letter lacked specific curricular research links or felt generic.',
    icon: <HelpCircle className="w-5 h-5 text-rose-600" />,
    diagnosticSymptoms: [
      'Letter discussed general childhood passions rather than specific university labs or professors.',
      'Failed to cite exact coursework modules, elective specializations, or thesis alignment.',
    ],
    immediateSteps: [
      'Use AbroadPath AI’s Statement Requirements & Planner to check official criteria and structure your statement without any AI clichés.',
      'Cite at least 2 specific faculty research groups and 2 curriculum modules from the course catalog.',
      'Highlight concrete undergraduate project metrics and specific career trajectory.',
    ],
    strategicPivot: 'Completely rewrite your SOP using our structural checklist.',
    recommendedActionLink: { label: 'Open Statement Requirements & Planner', url: '/letter-helper' },
  },
];

export const RejectionRoadmapPage: React.FC = () => {
  const { appId } = useParams<{ appId?: string }>();
  const { profile, user } = useAuth();
  const { universities } = useCatalog();

  const [selectedCauseId, setSelectedCauseId] = useState<string>('ects_deficiency');
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);

  // Identify rejected university if appId provided
  const rejectedUniv = useMemo(() => {
    if (!appId) return null;
    return universities.find((u) => u.id === appId) || null;
  }, [appId, universities]);

  const activeCause = useMemo(() => {
    return ROOT_CAUSES.find((c) => c.id === selectedCauseId) || ROOT_CAUSES[0];
  }, [selectedCauseId]);

  // Dynamic Alternative University Matches filtered by profile & budget
  const alternativeMatches = useMemo(() => {
    const userBudget = profile?.budget ?? null;

    // 1. Exclude rejected institution
    const candidates = universities.filter((u) => u.id !== appId);

    // 2. Score with matchEngine
    const scored = candidates.map((u) => {
      const match = profile
        ? matchUniversity(profile, u)
        : {
            university: u,
            fitCategory: 'Possible' as const,
            fitScore: 0.75,
            missingExams: [],
            metRequirements: [],
            unconfirmedRequirements: [],
            ruleChanged: u.ruleChanged,
          };
      return match;
    });

    // 3. Filter by budget if provided
    let filtered = scored;
    if (userBudget !== null && userBudget > 0) {
      filtered = scored.filter((m) => {
        const annualCost = parseAnnualTuition(m.university.tuition);
        return annualCost === null || annualCost <= userBudget || annualCost === 0;
      });
      // Fallback if filter is too aggressive
      if (filtered.length === 0) filtered = scored;
    }

    // 4. Sort: Strong fit and Possible first, then by fitScore descending
    return filtered
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, 3);
  }, [universities, appId, profile]);

  const sampleEmailTemplate = `Subject: Inquiry regarding Admission Decision – Application ${appId || 'Ref: 2026/MSc'} – ${profile?.name || 'Applicant'}

Dear Admissions Committee / Program Coordinator,

Thank you for reviewing my application for the graduate program at your esteemed institution.

While I am naturally disappointed by the outcome, I have immense respect for your standards and wish to inquire constructively regarding my profile evaluation. Could you kindly provide brief feedback on whether the decision was primarily due to:
1. Specific ECTS prerequisite course requirements in the undergraduate curriculum,
2. Standardized test score cutoffs (language or aptitude percentiles), or
3. Departmental numerus clausus capacity and quota limits?

I plan to fortify my academic foundation and reapply for the upcoming intake. Any guidance on specific coursework or profile areas to strengthen would be invaluable.

Thank you very much for your time and guidance.

Sincerely,
${profile?.name || 'Applicant Name'}
${user?.email || 'email@example.com'}`;

  const copyEmailToClipboard = () => {
    navigator.clipboard.writeText(sampleEmailTemplate);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12 font-poppins">
      {/* 1. Contextual Empathetic Header */}
      <div className="bg-[#1B4D3E] border border-[#2E6B57] rounded-[8px] p-6 sm:p-10 text-[#FAF7F0] shadow-soft space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-[4px] bg-[#FAF7F0]/15 text-[#F3C97E] border border-[#FAF7F0]/25 text-xs font-bold uppercase tracking-wider">
          <TrendingUp className="w-4 h-4 text-[#F3C97E]" />
          Strategic Recovery & Pivot Roadmap
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[#FAF7F0]">
            {rejectedUniv ? (
              <>
                Post-Rejection Pivot for <span className="text-[#F3C97E]">{rejectedUniv.name}</span>
              </>
            ) : (
              'Post-Rejection Strategic Pivot & Recovery'
            )}
          </h1>
          <p className="text-[#FAF7F0]/90 text-sm sm:text-base max-w-2xl leading-relaxed">
            A rejection is never a final verdict on your potential — it is a diagnostic data point.
            Identify root causes, retool your application, and pivot to verified programs matching your profile.
          </p>
        </div>

        {rejectedUniv && (
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-[#FAF7F0]/80">
            <span className="px-2.5 py-1 rounded-[4px] bg-white/15 font-medium">
              Program: {rejectedUniv.program}
            </span>
            <span className="px-2.5 py-1 rounded-[4px] bg-white/15 font-medium">
              Country: {rejectedUniv.countryId.toUpperCase()}
            </span>
            <span className="px-2.5 py-1 rounded-[4px] bg-white/15 font-medium">
              Tuition: {rejectedUniv.tuition}
            </span>
          </div>
        )}
      </div>

      {/* 2. Interactive Root-Cause Diagnostic Tool */}
      <div className="bg-white rounded-[8px] border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#0B1026] flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-[#FF5E00]" />
              Step 1: Identify Your Rejection Root Cause
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select the factor that best matches your situation to unlock tailored recovery steps.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-[4px] bg-slate-100 text-[#0B1026] border border-slate-200">
            Interactive Diagnostic
          </span>
        </div>

        {/* Cause Selection Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ROOT_CAUSES.map((cause) => {
            const isSelected = cause.id === selectedCauseId;
            return (
              <button
                key={cause.id}
                onClick={() => setSelectedCauseId(cause.id)}
                className={`p-4 rounded-[6px] text-left border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#FF5E00] bg-orange-50/30 shadow-sm ring-2 ring-[#FF5E00]/20'
                    : 'border-slate-200 hover:border-[#FF5E00]/50 bg-white'
                }`}
              >
                <div className="space-y-2">
                  <div className="p-2 rounded-[6px] bg-slate-50 w-fit">{cause.icon}</div>
                  <h3 className={`font-bold text-sm ${isSelected ? 'text-[#0B1026]' : 'text-slate-800'}`}>
                    {cause.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {cause.shortDesc}
                  </p>
                </div>
                <div className="pt-3 flex items-center gap-1 text-[11px] font-semibold text-[#FF5E00]">
                  <span>{isSelected ? 'Active Analysis' : 'Analyze'}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#FF5E00]" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Cause Tailored Action Plan */}
        <div className="bg-slate-50 rounded-[6px] border border-slate-200 p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-[6px] bg-white border border-slate-200 shadow-xs">
              {activeCause.icon}
            </div>
            <div>
              <h3 className="font-extrabold text-[#0B1026] text-base">
                Recovery Playbook: {activeCause.title}
              </h3>
              <p className="text-xs text-slate-600">{activeCause.strategicPivot}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 bg-white p-4 rounded-[6px] border border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Common Symptoms
              </span>
              <ul className="space-y-2 text-xs text-slate-600">
                {activeCause.diagnosticSymptoms.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-rose-500 font-bold">&bull;</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 bg-white p-4 rounded-[6px] border border-slate-200">
              <span className="text-xs font-bold text-[#0B1026] uppercase tracking-wider">
                Targeted Action Steps
              </span>
              <ul className="space-y-2 text-xs text-slate-700">
                {activeCause.immediateSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {activeCause.recommendedActionLink && (
            <div className="pt-2">
              <Link
                to={activeCause.recommendedActionLink.url}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[6px] bg-[#FF5E00] hover:bg-[#E65400] text-[#0B1026] text-xs font-semibold transition-colors shadow-sm"
              >
                <span>{activeCause.recommendedActionLink.label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#0B1026]" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 3. Reapplication Strategy: Feedback Email & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Inquiry Generator */}
        <div className="bg-white rounded-[8px] border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4 flex flex-col justify-between hover:border-[#FF5E00] transition-colors">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0B1026] flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#FF5E00]" />
                Step 2: Request Official Feedback
              </h2>
              <button
                onClick={copyEmailToClipboard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-[#FF5E00] transition-colors"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#FF5E00]" />}
                <span>{copiedEmail ? 'Copied' : 'Copy Template'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-500">
              European admission committees are willing to clarify if deficiencies were credit-based or quota-based when approached with professional etiquette.
            </p>
          </div>

          <div className="p-4 bg-white rounded-[6px] text-[#2B3A33] font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed border border-[#E6DFCF]">
            {sampleEmailTemplate}
          </div>
        </div>

        {/* Reapplication Intake Mapping */}
        <div className="bg-white rounded-[8px] border border-[#E6DFCF] p-6 sm:p-8 shadow-xs space-y-4 hover:border-[#1B4D3E] transition-colors">
          <h2 className="text-lg font-bold text-[#1B4D3E] flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#B45309]" />
            Step 3: Target the Next Intake Cycle
          </h2>
          <p className="text-xs text-slate-500">
            Reapplying to the same program or sister faculties requires timing your milestones accurately.
          </p>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-[6px] border border-[#FF5E00]/30 bg-orange-50/40 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-[#0B1026]">
                <span>Summer / Spring Intake (Recommended)</span>
                <span className="text-[11px] text-[#FF5E00] font-bold">Nov – Jan Deadlines</span>
              </div>
              <p className="text-xs text-slate-600">
                40–50% fewer international applicants compared to Winter. Higher acceptance rates for qualified candidates.
              </p>
            </div>

            <div className="p-3.5 rounded-[6px] border border-slate-200 bg-white space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-[#0B1026]">
                <span>Next Winter Intake</span>
                <span className="text-[11px] text-slate-500">Mar – May Deadlines</span>
              </div>
              <p className="text-xs text-slate-600">
                Provides a full 6–9 months window to complete credit bridge courses or boost GRE scores by 10+ points.
              </p>
            </div>

            <div className="p-3.5 rounded-[6px] border border-slate-200 bg-white space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-[#0B1026]">
                <span>Rolling Admissions (Ireland / UK)</span>
                <span className="text-[11px] text-slate-500">Continuous Assessment</span>
              </div>
              <p className="text-xs text-slate-600">
                Applications reviewed as received until capacity is reached. Apply within the first 14 days of opening.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Alternative University Matches Filtered by Profile & Budget */}
      <div className="bg-white rounded-[8px] border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#0B1026] flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#FF5E00]" />
              Recommended Alternative Programs
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Filtered by your exam scores, country preferences, and budget ({profile?.budget ? `≤ €${profile.budget.toLocaleString()}/yr` : 'Flexible budget'}).
            </p>
          </div>

          <Link
            to="/matches"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF5E00] hover:text-[#E65400] transition-colors self-start sm:self-center"
          >
            <span>Explore All Matches</span>
            <ArrowRight className="w-4 h-4 text-[#FF5E00]" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {alternativeMatches.map((match) => {
            const u = match.university;
            return (
              <div
                key={u.id}
                className="bg-white rounded-[8px] border border-slate-200 p-5 space-y-4 hover:border-[#FF5E00] hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                      {u.countryId.toUpperCase()}
                    </span>
                    <FitTierBadge category={match.fitCategory} score={match.fitScore} />
                  </div>

                  <div>
                    <h3 className="font-bold text-[#0B1026] text-base leading-snug">{u.name}</h3>
                    <p className="text-xs text-slate-600 mt-0.5 font-medium">{u.program}</p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-[6px] border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tuition:</span>
                      <span className="font-bold text-[#0B1026]">{u.tuition}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Deadline:</span>
                      <span className="font-semibold text-slate-700">{u.requirements.application_deadline || 'Check portal'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <Link
                    to="/matches"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[6px] bg-[#FF5E00] hover:bg-[#E65400] text-[#0B1026] text-xs font-semibold transition-colors"
                  >
                    <span>Evaluate Fit Profile</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#0B1026]" />
                  </Link>
                  <a
                    href={u.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-[6px] text-slate-600 hover:text-[#FF5E00] text-[11px] font-medium transition-colors"
                  >
                    <span>Official Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Static Cost & Loan Estimate Table (R1, Acceptance Criteria) */}
      <div className="bg-white rounded-[8px] border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#0B1026] flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#FF5E00]" />
              Comparative Financial Planning & Educational Loan Estimates
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Benchmark tuition, living expenses, and education loan frameworks across target study destinations.
            </p>
          </div>

          {/* Mandatory Label */}
          <span className="px-3.5 py-1.5 rounded-[4px] text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider self-start sm:self-center shadow-xs">
            estimate, not financial advice
          </span>
        </div>

        <div className="overflow-x-auto rounded-[6px] border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-[#0B1026] uppercase font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Destination</th>
                <th className="py-3.5 px-4">Avg Annual Tuition</th>
                <th className="py-3.5 px-4">Living Cost / Blocked Account</th>
                <th className="py-3.5 px-4">Typical Loan Coverage</th>
                <th className="py-3.5 px-4">Repayment Grace Period</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-4 px-4 font-bold text-[#0B1026]">Germany (Public Universities)</td>
                <td className="py-4 px-4">
                  <span className="text-emerald-700 font-bold block">€0 – €3,000 / yr</span>
                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-[4px] inline-block mt-0.5">
                    🇮🇳 ~₹0 – ₹2.7 Lakhs
                  </span>
                </td>
                <td className="py-4 px-4 font-medium">
                  <span className="block">€11,208 / yr (€934/mo blocked)</span>
                  <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded-[4px] inline-block mt-0.5">
                    🇮🇳 ~₹10.2 Lakhs blocked
                  </span>
                </td>
                <td className="py-4 px-4">Living & travel expenses (~€12,000–€15,000)</td>
                <td className="py-4 px-4">Course duration + 6–12 months</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-4 px-4 font-bold text-[#0B1026]">Ireland (Universities)</td>
                <td className="py-4 px-4">
                  <span className="font-bold text-slate-800 block">€12,000 – €27,000 / yr</span>
                  <span className="text-[10px] text-slate-800 font-semibold bg-slate-100 px-1.5 py-0.5 rounded-[4px] inline-block mt-0.5">
                    🇮🇳 ~₹10.9L – ₹24.6 Lakhs
                  </span>
                </td>
                <td className="py-4 px-4 font-medium">
                  <span className="block">€10,000 / yr (INIS proof of funds)</span>
                  <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded-[4px] inline-block mt-0.5">
                    🇮🇳 ~₹9.1 Lakhs required
                  </span>
                </td>
                <td className="py-4 px-4">Up to 100% of I-20 / invoice tuition + living</td>
                <td className="py-4 px-4">Course duration + 6 months</td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-4 px-4 font-bold text-[#0B1026]">United Kingdom (Master's)</td>
                <td className="py-4 px-4">
                  <span className="font-bold text-slate-800 block">£18,000 – £35,000 / yr</span>
                  <span className="text-[10px] text-slate-800 font-semibold bg-slate-100 px-1.5 py-0.5 rounded-[4px] inline-block mt-0.5">
                    🇮🇳 ~₹19.7L – ₹38.3 Lakhs
                  </span>
                </td>
                <td className="py-4 px-4 font-medium">
                  <span className="block">£12,000 – £15,000 / yr (maintenance)</span>
                  <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded-[4px] inline-block mt-0.5">
                    🇮🇳 ~₹13.1L – ₹16.4 Lakhs
                  </span>
                </td>
                <td className="py-4 px-4">Secured & unsecured education loans (SBI, HDFC Credila)</td>
                <td className="py-4 px-4">Course duration + 6 months</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mandatory Prominent Disclaimer Banner */}
        <div className="p-4 bg-amber-50/80 rounded-[8px] border border-amber-200 text-xs text-amber-950 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold uppercase tracking-wide text-amber-900">
              Mandatory Legal Disclaimer: estimate, not financial advice
            </p>
            <p className="leading-relaxed">
              All tuition, living cost benchmarks, and educational loan figures presented above are static estimations compiled for comparative orientation only. Currency exchange rates, bank interest margins, university fees, and national immigration requirements fluctuate. Always consult official university financial offices and accredited banking institutions prior to signing loan agreements or committing funds. (estimate, not financial advice)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectionRoadmapPage;
