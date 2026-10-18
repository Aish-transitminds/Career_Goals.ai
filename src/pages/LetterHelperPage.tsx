/**
 * AbroadPath AI - Programme-Specific Letter Helper Workspace
 * File: src/pages/LetterHelperPage.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, Screens #8, Rules for Build)
 * STRICT CONSTRAINT: Zero AI-generated letter text. Transparent verified requirements & authentic student voice only.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../hooks/useCatalog';
import {
  University,
  StatementVerificationStatus,
  ProgrammeQuestion,
} from '../types';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Lightbulb,
  FileCheck,
  ExternalLink,
  Calendar,
  ArrowLeft,
  AlertOctagon,
  Clock,
  Building2,
  Globe,
  Info,
  Lock,
} from 'lucide-react';

interface StandardSection {
  id: string;
  title: string;
  objective: string;
  prompts: string[];
  whatToInclude: string[];
  whatToAvoid: string[];
  reviewTip: string;
}

const STANDARD_SECTIONS: StandardSection[] = [
  {
    id: 'intro',
    title: '1. Introduction & Academic Hook',
    objective:
      'Introduce your research focus and articulate the precise motivation for applying without generic opening clichés.',
    prompts: [
      'What specific technical problem, academic coursework, or industry observation sparked your passion for this specialized field?',
      'What core question do you intend to investigate or master during your graduate studies?',
    ],
    whatToInclude: [
      'A concise statement of the exact degree and university you are applying to.',
      'A mature intellectual catalyst from your undergraduate studies or work experience.',
    ],
    whatToAvoid: [
      'Childhood nostalgia: "Ever since I was 5 years old, I have been fascinated by computers."',
      'Famous historical quotes from Albert Einstein or Alan Turing used as filler.',
    ],
    reviewTip:
      'Keep this section under 150 words. Hook the reader immediately with mature academic intent.',
  },
  {
    id: 'academic',
    title: '2. Academic Background & Foundations',
    objective:
      'Demonstrate rigorous preparation through relevant coursework, laboratory research, thesis projects, and GPA context.',
    prompts: [
      'What were your core undergraduate technical/theoretical projects, and what tools or mathematical concepts did you apply?',
      'Did you complete a bachelor thesis, research paper, or industry internship directly connected to this master program?',
    ],
    whatToInclude: [
      'Specific quantitative metrics: "Improved pipeline throughput by 22%", "Engineered a dataset of 15,000 samples".',
      'Discussion of any academic challenges overcome, with demonstrable growth.',
    ],
    whatToAvoid: [
      'Re-listing every single course from your transcript (the committee already has your transcript).',
      'Vague buzzwords like "hard worker" without concrete project evidence.',
    ],
    reviewTip:
      'Focus on depth rather than breadth. Analyze 1 or 2 core projects in detail.',
  },
  {
    id: 'why_course',
    title: '3. Why This Specific Course & Curriculum',
    objective:
      'Prove you have analyzed the university syllabus and articulate how the elective modules bridge your knowledge gaps.',
    prompts: [
      'Which exact core or elective modules from the university course catalog match your specialization goals?',
      'How does the pedagogical structure (e.g. seminar style, practical labs, industry internships) suit your learning model?',
    ],
    whatToInclude: [
      'Exact course titles and module codes from the latest curriculum handbook.',
      'Clear reasoning for why these courses are unavailable or insufficient in your undergraduate curriculum.',
    ],
    whatToAvoid: [
      'Generic statements that apply to any university: "I love your prestigious computer science program."',
      'Copy-pasting module names from a different university application.',
    ],
    reviewTip:
      'Mention at least 2 distinct curriculum modules and explain what technical skill you seek to gain from them.',
  },
  {
    id: 'why_university',
    title: '4. Why This University & Country',
    objective:
      'Demonstrate that you selected this institution for distinct institutional advantages rather than broad ranking lists.',
    prompts: [
      'Which specific professor, research chair, or lab group is conducting work aligned with your thesis aspirations?',
      'How does the regional ecosystem (e.g. Munich tech cluster, Silicon Docks Dublin) enhance your educational journey?',
    ],
    whatToInclude: [
      'Names of 1 or 2 active faculty researchers whose recent papers you have read.',
      'Specific lab facilities, supercomputing clusters, or university industrial partnerships.',
    ],
    whatToAvoid: [
      'Flattery: "Your world-renowned university ranks #1 in Europe and has breathtaking architecture."',
      'Focusing primarily on tourism, lifestyle, or permanent residency aspirations.',
    ],
    reviewTip:
      'Admissions committees look for mutual alignment. Show how your background enables you to contribute to their labs.',
  },
  {
    id: 'career_goals',
    title: '5. Career Objectives (Short & Long-Term)',
    objective:
      'Connect completion of this degree directly to realistic professional milestones and industry or research contributions.',
    prompts: [
      'What specific job role (e.g. Machine Learning Engineer, Research Associate) will you seek immediately post-graduation?',
      'Where do you envision yourself 5–10 years later, and how does this degree facilitate that leadership trajectory?',
    ],
    whatToInclude: [
      'Specific target industry sectors, research institutes, or engineering challenges you aim to address.',
      'How the degree equips you to solve concrete problems in your home country or global industry.',
    ],
    whatToAvoid: [
      'Vague wanderlust: "I want to gain international exposure and travel the world."',
      'Unrealistic or disjointed aspirations having zero relation to the program curriculum.',
    ],
    reviewTip:
      'Committees favor students with clear, attainable career milestones.',
  },
  {
    id: 'conclusion',
    title: '6. Conclusion & Value Proposition',
    objective:
      'Deliver a concise summary of your readiness, reiterate mutual fit, and conclude with formal professional etiquette.',
    prompts: [
      'What unique perspective, technical skill, or diverse experience will you bring to the graduate cohort?',
      'How will you summarize your readiness for the demanding workload of this graduate curriculum?',
    ],
    whatToInclude: [
      'Reaffirmation of enthusiasm and readiness to handle intensive coursework.',
      'Formal closing salutation to the admissions committee.',
    ],
    whatToAvoid: [
      'Begging for admission or emotional appeals.',
      'Introducing brand new biographical information that belongs in earlier sections.',
    ],
    reviewTip:
      'Keep the conclusion under 100 words. Leave a lasting impression of confidence and gratitude.',
  },
];

const LEGACY_STORAGE_KEY = 'abroadpath_sop_draft_notes';

function getDraftStorageKey(uid: string | null, programId: string | null, intake: string): string {
  const userScope = uid || 'guest';
  const progScope = programId || 'general';
  const intakeScope = intake || '2026';
  return `abroadpath_sop_draft_${userScope}_${progScope}_${intakeScope}`;
}

export const LetterHelperPage: React.FC = () => {
  const { user } = useAuth();
  const { universities, countries } = useCatalog();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read URL query params
  const programIdParam = searchParams.get('programId') || searchParams.get('id') || '';
  const intakeParam = searchParams.get('intake') || '2026';

  // Selected program state (default to first or null)
  const selectedProgramId = programIdParam;
  const selectedIntake = intakeParam;

  // Resolve matching university from catalog
  const selectedUniversity: University | null = useMemo(() => {
    if (!selectedProgramId) return null;
    return universities.find((u) => u.id === selectedProgramId) || null;
  }, [selectedProgramId, universities]);

  // Resolve country name
  const countryName = useMemo(() => {
    if (!selectedUniversity) return null;
    const c = countries.find((item) => item.id === selectedUniversity.countryId);
    return c ? c.name : selectedUniversity.countryId.toUpperCase();
  }, [selectedUniversity, countries]);

  // Active storage key scoped by user/programme/intake
  const storageKey = useMemo(() => {
    return getDraftStorageKey(user?.uid ?? null, selectedProgramId || null, selectedIntake);
  }, [user?.uid, selectedProgramId, selectedIntake]);

  // Drafts state loaded from localStorage with backward-compatibility fallback
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    try {
      const initialKey = getDraftStorageKey(user?.uid ?? null, selectedProgramId || null, selectedIntake);
      const saved = localStorage.getItem(initialKey);
      if (saved) return JSON.parse(saved);

      // Legacy fallback if program is general or not specified
      if (!selectedProgramId || selectedProgramId === 'general') {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacy) return JSON.parse(legacy);
      }
      return {};
    } catch {
      return {};
    }
  });

  // Re-load drafts when program, user, or intake changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setDrafts(JSON.parse(saved));
      } else if (!selectedProgramId || selectedProgramId === 'general') {
        const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
        setDrafts(legacy ? JSON.parse(legacy) : {});
      } else {
        setDrafts({});
      }
    } catch {
      setDrafts({});
    }
  }, [storageKey, selectedProgramId]);

  // Save drafts locally
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(drafts));
      // Keep legacy key synced when in general mode for 100% backward compatibility
      if (!selectedProgramId || selectedProgramId === 'general') {
        localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(drafts));
      }
    } catch {
      // Ignore quota errors
    }
  }, [drafts, storageKey, selectedProgramId]);

  // Section expansion states
  const [expandedSection, setExpandedSection] = useState<string>('q_0');
  const [showFrameworkWhenQuestionsExist, setShowFrameworkWhenQuestionsExist] = useState<boolean>(false);
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // 8-Point Pre-submission quality checklist state
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    wordLimit: false,
    correctUnivName: false,
    specificModules: false,
    facultyCited: false,
    noAiBoilerplate: false,
    proofreadActiveVoice: false,
    cleanTypography: false,
    pdfFormat: false,
  });

  // Handle program change from dropdown
  const handleProgramChange = (newProgramId: string) => {
    if (newProgramId === 'general') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('programId');
      newParams.delete('id');
      newParams.set('intake', selectedIntake);
      setSearchParams(newParams);
      try {
        localStorage.removeItem('abroadpath_last_selected_program');
      } catch {}
    } else {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('programId', newProgramId);
      newParams.set('intake', selectedIntake);
      setSearchParams(newParams);
      try {
        localStorage.setItem('abroadpath_last_selected_program', newProgramId);
        localStorage.setItem('abroadpath_last_selected_intake', selectedIntake);
      } catch {}
    }
  };

  // Handle intake change
  const handleIntakeChange = (newIntake: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (selectedProgramId) {
      newParams.set('programId', selectedProgramId);
    }
    newParams.set('intake', newIntake);
    setSearchParams(newParams);
    try {
      localStorage.setItem('abroadpath_last_selected_intake', newIntake);
    } catch {}
  };

  // Draft change with 500-character cap
  const handleDraftChange = (sectionId: string, val: string) => {
    const capped = val.slice(0, 500);
    setDrafts((prev) => ({ ...prev, [sectionId]: capped }));
  };

  const copySectionDraft = (sectionId: string) => {
    const text = drafts[sectionId] || '';
    navigator.clipboard.writeText(text);
    setCopiedDraftId(sectionId);
    setTimeout(() => setCopiedDraftId(null), 2000);
  };

  const copyAllDrafts = () => {
    let combined = '';
    const stReq = selectedUniversity?.statementRequirements;
    const questions = stReq?.specificQuestions;

    if (questions && questions.length > 0) {
      combined += `=== ${selectedUniversity?.name?.toUpperCase()} (${selectedUniversity?.program}) ===\n`;
      combined += `Target Intake: ${selectedIntake}\n`;
      combined += `Official Document Type: ${stReq.documentType || 'SOP / Motivation Letter'}\n\n`;

      questions.forEach((q, idx) => {
        const notes = drafts[`prog_q_${q.id}`] || '[No draft notes yet]';
        combined += `--- Question ${idx + 1}: ${q.question} ---\n${notes}\n\n`;
      });
    }

    if (!questions || questions.length === 0 || showFrameworkWhenQuestionsExist) {
      combined += `=== 6-SECTION STRUCTURAL FRAMEWORK ===\n\n`;
      STANDARD_SECTIONS.forEach((sec) => {
        const notes = drafts[sec.id] || '[No draft notes yet]';
        combined += `--- ${sec.title.toUpperCase()} ---\n${notes}\n\n`;
      });
    }

    navigator.clipboard.writeText(combined.trim());
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const toggleChecklistItem = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  // Requirements shortcut
  const statementReq = selectedUniversity?.statementRequirements || null;
  const status: StatementVerificationStatus = statementReq?.status || 'Unknown';
  const hasSpecificQuestions = Boolean(statementReq?.specificQuestions && statementReq.specificQuestions.length > 0);

  // Status Badge Rendering
  const renderStatusBadge = (st: StatementVerificationStatus) => {
    switch (st) {
      case 'Verified':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified from Official Source</span>
          </span>
        );
      case 'Needs review':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Needs Review</span>
          </span>
        );
      case 'Stale':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            <span>Stale (Previous Cycle)</span>
          </span>
        );
      case 'Conflicting':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900 border border-rose-300 shadow-2xs">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            <span>Conflicting Sources</span>
          </span>
        );
      case 'Unknown':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Unknown / Unconfirmed</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* 0. Top Navigation & Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 font-poppins">
        <Link
          to="/matches"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#FF5E00] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-[#FF5E00]" />
          <span>Back to Verified Matches</span>
        </Link>

        {/* Programme & Intake Selector Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            <select
              value={selectedProgramId || 'general'}
              onChange={(e) => handleProgramChange(e.target.value)}
              className="px-3 py-1.5 rounded-[6px] border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5E00] shadow-2xs max-w-xs"
            >
              <option value="general">Standard Framework (No specific programme)</option>
              <optgroup label="Verified Catalogue Programmes">
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {u.program}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-[6px] border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            <span className="text-[11px] font-bold text-slate-500 uppercase px-1">Intake:</span>
            {['2026', '2027', '2028'].map((year) => (
              <button
                key={year}
                onClick={() => handleIntakeChange(year)}
                className={`px-2.5 py-1 rounded-[4px] text-xs font-bold transition-all ${
                  selectedIntake === year
                    ? 'bg-[#0B1026] text-[#FF5E00] shadow-xs border border-[#151B3A]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 1. Programme-Specific Header Banner */}
      {selectedUniversity ? (
        <div className="bg-white rounded-[8px] border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 hover:border-[#FF5E00] transition-colors font-poppins">
          {/* Top metadata tags */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[4px] bg-[#0B1026] text-white text-xs font-bold uppercase tracking-wider">
                <Globe className="w-3.5 h-3.5 text-[#FF5E00]" />
                <span>{countryName || selectedUniversity.countryId.toUpperCase()}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[4px] bg-orange-50 text-[#0B1026] text-xs font-bold uppercase tracking-wider border border-orange-200">
                <Calendar className="w-3.5 h-3.5 text-[#FF5E00]" />
                <span>Intake: {selectedIntake}</span>
              </span>
              {selectedUniversity.demoSeeded && (
                <span className="px-2.5 py-1 rounded-[4px] text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300">
                  Demonstration Record &bull; Change-Detection Simulation
                </span>
              )}
            </div>

            {/* Verification Status Badge */}
            <div>{renderStatusBadge(status)}</div>
          </div>

          {/* Institution & Programme Title */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-[4px] bg-orange-50 text-[#0B1026] text-[11px] font-bold uppercase tracking-wider mb-1 border border-orange-200">
              <FileText className="w-3.5 h-3.5 text-[#FF5E00]" />
              Statement Requirements & Planner
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1026] tracking-tight">
              {selectedUniversity.name}
            </h1>
            <p className="text-base sm:text-lg font-semibold text-[#FF5E00]">
              {selectedUniversity.program}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Check official statement requirements for your selected university programme and plan your own application statement.
            </p>
          </div>

          {/* Demonstration disclaimer if demoSeeded */}
          {selectedUniversity.demoSeeded && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-[6px] text-xs text-amber-950 flex items-start gap-3">
              <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-900 uppercase tracking-wide">
                  Demonstration Record Notice
                </span>
                <p className="leading-relaxed">
                  This university record is seeded to demonstrate AbroadPath AI's change-detection pipeline. Admission requirements are based on historical aptitude criteria and should be confirmed directly on the official {selectedUniversity.name} application portal.
                </p>
              </div>
            </div>
          )}

          {/* Official Requirements Summary */}
          <div className="p-4 rounded-[6px] bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#0B1026] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#FF5E00]" />
                Official Statement-Requirements Summary
              </span>
              {statementReq?.lastChecked && (
                <span className="text-slate-500 text-[11px]">
                  Checked: <strong>{statementReq.lastChecked}</strong>
                  {statementReq.verifiedDate && ` • Verified: ${statementReq.verifiedDate}`}
                </span>
              )}
            </div>
            <p className="leading-relaxed text-slate-800 font-medium">
              {statementReq?.summary ||
                'Programme-specific statement instructions are not confirmed in the catalogue. Please consult the official programme page below.'}
            </p>
          </div>

          {/* Conflicting / Stale Disclaimers if applicable */}
          {status === 'Conflicting' && statementReq?.statusNotes && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-[6px] text-xs text-rose-950 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-rose-900 uppercase tracking-wide">
                  Conflicting Statement Instructions Detected
                </span>
                <p className="leading-relaxed">{statementReq.statusNotes}</p>
              </div>
            </div>
          )}

          {status === 'Stale' && statementReq?.statusNotes && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-[6px] text-xs text-amber-950 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-900 uppercase tracking-wide">
                  Requirements Pending Annual Re-Verification
                </span>
                <p className="leading-relaxed">{statementReq.statusNotes}</p>
              </div>
            </div>
          )}

          {status === 'Unknown' && (
            <div className="p-4 bg-slate-100 border border-slate-300 rounded-[6px] text-xs text-slate-800 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-900 uppercase tracking-wide">
                  Status: Not Confirmed
                </span>
                <p className="leading-relaxed">
                  The central admissions catalog does not have verified statement questions for this specific course. Always confirm directly via the official programme portal before drafting.
                </p>
              </div>
            </div>
          )}

          {/* 7 Core Requirement Fields Grid */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-xs font-bold text-[#0B1026] uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#FF5E00]" />
                Programme-Specific Requirements Breakdown
              </h2>
              <span className="text-[11px] text-slate-400">Values unconfirmed by source remain 'Not confirmed'</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* Field 1: Document Type */}
              <div className="p-3.5 rounded-[6px] bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wide">
                  Document Type
                </span>
                <span className="font-bold text-[#0B1026] block text-sm">
                  {statementReq?.documentType || 'Not confirmed'}
                </span>
                {statementReq?.documentType && statementReq.documentType !== 'Statement of Purpose' && (
                  <span className="text-[11px] text-[#FF5E00] font-semibold block">
                    {statementReq.documentType === 'Not required'
                      ? 'No statement evaluated for admission'
                      : `Programme specifies a ${statementReq.documentType}`}
                  </span>
                )}
              </div>

              {/* Field 2: Mandatory / Required */}
              <div className="p-3.5 rounded-[6px] bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wide">
                  Mandatory Status
                </span>
                <span className="font-bold text-[#0B1026] block text-sm">
                  {statementReq?.required === true
                    ? 'Required Document'
                    : statementReq?.required === false
                    ? 'Not Required / Waived'
                    : 'Not confirmed'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {statementReq?.required === true
                    ? 'Required for complete submission dossier'
                    : statementReq?.required === false
                    ? 'Admissions decision strictly based on grades/exams'
                    : 'Check portal upload checklist'}
                </span>
              </div>

              {/* Field 3: Word, Character or Page Limit */}
              <div className="p-3.5 rounded-[6px] bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wide">
                  Length / Page Limit
                </span>
                <span className="font-bold text-[#0B1026] block text-sm">
                  {statementReq?.lengthLimit || 'Not confirmed'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Strictly respect length constraints to avoid disqualification.
                </span>
              </div>

              {/* Field 4: Submission Method */}
              <div className="p-3.5 rounded-[6px] bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wide">
                  Submission Method
                </span>
                <span className="font-bold text-[#0B1026] block text-sm">
                  {statementReq?.submissionMethod || 'Not confirmed'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Upload destination prescribed by university portal.
                </span>
              </div>

              {/* Field 5: Formatting & File Specs */}
              <div className="p-3.5 rounded-[6px] bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wide">
                  Formatting & File Specs
                </span>
                <span className="font-bold text-[#0B1026] block text-sm">
                  {statementReq?.formattingRequirements || 'Not confirmed'}
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Preserve clean margins and selectable text in PDF.
                </span>
              </div>

              {/* Field 6: AI-Use / Disclosure Policy */}
              <div className="p-3.5 rounded-[6px] bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 font-semibold block text-[11px] uppercase tracking-wide">
                  AI-Use & Disclosure Policy
                </span>
                <span className="font-bold text-[#0B1026] block text-sm">
                  {statementReq?.aiPolicy ? 'Policy Prescribed' : 'Not confirmed'}
                </span>
                <span className="text-[11px] text-slate-600 block leading-tight">
                  {statementReq?.aiPolicy || 'Follow standard institutional academic integrity regulations.'}
                </span>
              </div>
            </div>

            {/* Assessment Criteria (if available) */}
            {statementReq?.assessmentCriteria && statementReq.assessmentCriteria.length > 0 && (
              <div className="p-4 bg-orange-50/60 rounded-[6px] border border-orange-200 text-xs text-[#0B1026] space-y-1.5">
                <span className="font-bold text-[#0B1026] uppercase tracking-wide block">
                  Department Evaluation & Assessment Criteria
                </span>
                <ul className="space-y-1 pl-4 list-disc text-slate-700">
                  {statementReq.assessmentCriteria.map((crit, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {crit}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* General University Guidance (Distinguished from programme rules) */}
            {statementReq?.generalGuidance && (
              <div className="p-4 bg-slate-50 rounded-[6px] border border-slate-200 text-xs text-slate-700 space-y-1">
                <span className="font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  General University Advice (Non-binding recommendation, distinct from programme-specific rules)
                </span>
                <p className="leading-relaxed text-slate-600">{statementReq.generalGuidance}</p>
              </div>
            )}

            {/* Source Link & Verification Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                Official source:{' '}
                {selectedUniversity.sourceUrl ? (
                  <a
                    href={selectedUniversity.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FF5E00] hover:text-[#E65400] font-semibold underline inline-flex items-center gap-1"
                  >
                    <span>{selectedUniversity.name} Official Admission Page</span>
                    <ExternalLink className="w-3 h-3 text-[#FF5E00]" />
                  </a>
                ) : (
                  <span>Official university website</span>
                )}
              </div>

              <a
                href={selectedUniversity.portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-slate-300 text-slate-700 hover:text-[#FF5E00] hover:border-[#FF5E00] text-xs font-semibold transition-colors self-start sm:self-auto"
              >
                <span>Launch Official Application Portal</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#0B1026]" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* General Header when no specific programme is selected */
        <div className="bg-white rounded-[8px] border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4 hover:border-[#FF5E00] transition-colors font-poppins">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-[4px] bg-[#0B1026] text-white text-xs font-bold uppercase tracking-wider">
            <FileText className="w-4 h-4 text-[#FF5E00]" />
            General Academic Structural Framework &bull; Authentic Student Voice
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#0B1026] tracking-tight">
            Statement Requirements & Planner
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-3xl leading-relaxed">
            Check official statement requirements for your selected university programme and plan your own application statement.
          </p>
        </div>
      )}

      {/* 2. STRICT NON-AI COMPLIANCE PLEDGE & LOCAL STORAGE NOTICE */}
      <div className="p-5 bg-amber-50/90 rounded-[8px] border-2 border-amber-300 text-xs text-amber-950 flex flex-col sm:flex-row items-start gap-4 shadow-sm font-poppins">
        <div className="p-2.5 rounded-[6px] bg-amber-100 text-amber-800 shrink-0">
          <Lock className="w-6 h-6 text-amber-700" />
        </div>
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-extrabold text-sm uppercase tracking-wide text-amber-900">
              Strict Policy: Zero AI-Generated Letter Text &bull; Private Local Scratchpad
            </span>
            <span className="px-2 py-0.5 rounded-[4px] bg-amber-200/90 text-[10px] font-bold text-amber-900">
              Browser-Only
            </span>
          </div>
          <p className="leading-relaxed text-amber-900/90 text-xs">
            In compliance with academic integrity guidelines, <strong>AbroadPath AI does not generate, rewrite, or complete letters</strong>.
            Your notes are stored strictly in your browser's <code>localStorage</code> (scoped to {selectedUniversity ? selectedUniversity.name : 'General'} • Intake {selectedIntake}).
            Notes are strictly private and <strong>never sent to Gemini, another LLM, or any external service</strong>.
          </p>
        </div>
      </div>

      {/* 3. NOT REQUIRED NOTIFICATION (e.g. RWTH Aachen) */}
      {selectedUniversity && statementReq?.required === false && (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-[8px] text-xs text-[#0B1026] flex items-start gap-3 font-poppins">
          <Info className="w-5 h-5 text-[#FF5E00] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-[#0B1026] uppercase tracking-wide">
              Document Not Evaluated for This Programme
            </span>
            <p className="leading-relaxed text-slate-600">
              <strong>{selectedUniversity.name}</strong> ({selectedUniversity.program}) does not require or evaluate a Statement of Purpose or Motivation Letter. Admissions decisions are decided strictly on transcript ECTS distribution and GRE score.
              You may still use the general planning framework below for other applications.
            </p>
          </div>
        </div>
      )}

      {/* 4. PLANNING WORKSPACE */}
      <div className="space-y-6 font-poppins">
        {/* Workspace Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-xl font-bold text-[#0B1026] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FF5E00]" />
              <span>
                {hasSpecificQuestions
                  ? 'Programme-Prescribed Questions (Primary Focus)'
                  : 'SOP Structural Framework (6 Core Sections)'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft your outline notes in the local scratchpad (max 500 chars per block). Saved in your browser.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyAllDrafts}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#0B1026] hover:bg-[#151B3A] text-white text-xs font-semibold transition-colors"
            >
              {copiedAll ? <Check className="w-4 h-4 text-[#FF5E00]" /> : <Copy className="w-4 h-4 text-[#FF5E00]" />}
              <span>{copiedAll ? 'All Drafts Copied' : 'Export All Drafts'}</span>
            </button>
          </div>
        </div>

        {/* 4A. Programme-Specific Questions (Prioritised if prescribed) */}
        {hasSpecificQuestions && statementReq?.specificQuestions && (
          <div className="space-y-4">
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-[6px] text-xs text-[#0B1026] flex items-center justify-between">
              <span className="font-semibold">
                This programme prescribes <strong>{statementReq.specificQuestions.length} specific questions</strong>. Prioritise these prompts before general sections.
              </span>
              <span className="text-[11px] font-bold text-[#FF5E00] uppercase">Programme Priority</span>
            </div>

            <div className="space-y-4">
              {statementReq.specificQuestions.map((q: ProgrammeQuestion, idx: number) => {
                const draftKey = `prog_q_${q.id}`;
                const isExpanded = expandedSection === `q_${idx}`;
                const draftText = drafts[draftKey] || '';
                const charCount = draftText.length;

                return (
                  <div
                    key={q.id}
                    className={`bg-white rounded-[6px] border transition-all ${
                      isExpanded
                        ? 'border-[#FF5E00] shadow-md ring-1 ring-[#FF5E00]/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedSection(isExpanded ? '' : `q_${idx}`)}
                      className="w-full p-5 sm:p-6 text-left flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-[4px] bg-[#0B1026] text-[#FF5E00] text-[11px] font-bold">
                            Question {idx + 1}
                          </span>
                          {q.required !== false && (
                            <span className="text-[10px] font-bold text-rose-600 uppercase">Required</span>
                          )}
                          {q.wordLimit && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              &bull; Limit: {q.wordLimit}
                            </span>
                          )}
                        </div>
                        <h3 className="font-extrabold text-[#0B1026] text-base sm:text-lg pt-1">
                          {q.question}
                        </h3>
                        {q.guidance && (
                          <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Guidance: {q.guidance}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 mt-1">
                        {draftText.length > 0 && (
                          <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {charCount} chars
                          </span>
                        )}
                        <div className="p-1.5 rounded-full bg-slate-100 text-slate-600">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-6 sm:px-6 sm:pb-8 pt-2 border-t border-slate-100 space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                              Your Outline Notes & Points (Local Only)
                            </label>
                            <div className="flex items-center gap-3">
                              <span
                                className={`text-[11px] font-semibold font-mono ${
                                  charCount >= 480 ? 'text-rose-600' : 'text-slate-500'
                                }`}
                              >
                                {charCount} / 500 characters
                              </span>
                              <button
                                type="button"
                                onClick={() => copySectionDraft(draftKey)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF5E00] hover:text-[#E65400]"
                              >
                                {copiedDraftId === draftKey ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-[#FF5E00]" />
                                )}
                                <span>{copiedDraftId === draftKey ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          </div>

                          <textarea
                            value={draftText}
                            onChange={(e) => handleDraftChange(draftKey, e.target.value)}
                            placeholder={`Draft your key points for Question ${idx + 1} here...`}
                            maxLength={500}
                            rows={4}
                            className="w-full p-4 rounded-[6px] border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E00] focus:border-transparent transition-all font-sans"
                          />
                          <p className="text-[11px] text-slate-500">
                            Saved locally in your browser for this programme. Strictly private.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Toggle to view standard 6-section framework when questions exist */}
            <div className="pt-2">
              <button
                onClick={() => setShowFrameworkWhenQuestionsExist(!showFrameworkWhenQuestionsExist)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#0B1026] bg-[#FF5E00] hover:bg-[#E65400] px-4 py-2.5 rounded-[6px] transition-all shadow-sm"
              >
                <span>
                  {showFrameworkWhenQuestionsExist
                    ? 'Hide Standard 6-Section Framework'
                    : 'Show Standard 6-Section Framework (Optional Reference Guidance)'}
                </span>
                {showFrameworkWhenQuestionsExist ? (
                  <ChevronUp className="w-4 h-4 text-[#0B1026]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#0B1026]" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* 4B. Standard 6-Section Structural Framework */}
        {(!hasSpecificQuestions || showFrameworkWhenQuestionsExist) && (
          <div className="space-y-4 pt-2">
            {hasSpecificQuestions && (
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                Optional Reference Framework (Generic 6 Sections)
              </div>
            )}

            <div className="space-y-4">
              {STANDARD_SECTIONS.map((sec) => {
                const isExpanded = expandedSection === sec.id;
                const draftText = drafts[sec.id] || '';
                const charCount = draftText.length;

                return (
                  <div
                    key={sec.id}
                    className={`bg-white rounded-[6px] border transition-all ${
                      isExpanded
                        ? 'border-[#FF5E00] shadow-md ring-1 ring-[#FF5E00]/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedSection(isExpanded ? '' : sec.id)}
                      className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <h3 className="font-extrabold text-[#0B1026] text-base sm:text-lg">
                          {sec.title}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          {sec.objective}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {draftText.length > 0 && (
                          <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {charCount} chars drafted
                          </span>
                        )}
                        <div className="p-1.5 rounded-full bg-slate-100 text-slate-600">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-6 sm:px-6 sm:pb-8 pt-2 border-t border-slate-100 space-y-6">
                        {/* Guiding Reflection Prompts */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-[#0B1026] uppercase tracking-wider flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4 text-[#FF5E00]" />
                            Guiding Reflection Questions
                          </span>
                          <ul className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-[6px] border border-slate-200">
                            {sec.prompts.map((p, idx) => (
                              <li key={idx} className="flex items-start gap-2.5">
                                <span className="text-[#FF5E00] font-extrabold mt-0.5">&bull;</span>
                                <span className="leading-relaxed font-medium">{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* What to Include vs What to Avoid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-emerald-50/60 p-4 rounded-[6px] border border-emerald-200 space-y-2">
                            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Key Elements to Include
                            </span>
                            <ul className="space-y-1.5 text-xs text-emerald-950">
                              {sec.whatToInclude.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-emerald-600 font-bold">✓</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-rose-50/60 p-4 rounded-[6px] border border-rose-200 space-y-2">
                            <span className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-rose-600" />
                              Clichés to Strictly Avoid
                            </span>
                            <ul className="space-y-1.5 text-xs text-rose-950">
                              {sec.whatToAvoid.map((item, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-rose-500 font-bold">&times;</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Review Tip */}
                        <div className="p-3.5 bg-slate-50 rounded-[6px] border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <strong>Pro Tip: </strong>
                            <span>{sec.reviewTip}</span>
                          </div>
                        </div>

                        {/* Student Scratchpad (Zero AI, 500-Char Capped) */}
                        <div className="space-y-2 pt-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                              Your Outline Notes & Draft Bullets (Local Only)
                            </label>
                            <div className="flex items-center gap-3">
                              <span
                                className={`text-[11px] font-semibold font-mono ${
                                  charCount >= 480 ? 'text-rose-600' : 'text-slate-500'
                                }`}
                              >
                                {charCount} / 500 characters
                              </span>
                              <button
                                type="button"
                                onClick={() => copySectionDraft(sec.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FF5E00] hover:text-[#E65400]"
                              >
                                {copiedDraftId === sec.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3 text-[#FF5E00]" />
                                )}
                                <span>{copiedDraftId === sec.id ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          </div>

                          <textarea
                            value={draftText}
                            onChange={(e) => handleDraftChange(sec.id, e.target.value)}
                            placeholder={`Draft your key points for ${sec.title.toLowerCase()} here...`}
                            maxLength={500}
                            rows={4}
                            className="w-full p-4 rounded-[6px] border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E00] focus:border-transparent transition-all font-sans"
                          />
                          <p className="text-[11px] text-slate-500">
                            Saved locally in your browser. Strictly confidential; never sent to any LLM or external server.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. Pre-Submission Quality Checklist (8-Point) */}
      <div className="bg-white rounded-[8px] border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 hover:border-[#FF5E00] transition-colors font-poppins">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#0B1026] flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#FF5E00]" />
              Pre-Submission Quality Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify your final draft against official admission expectations prior to uploading to portals.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="text-right">
              <span className="text-xs font-bold text-[#0B1026]">
                {completedCount} of {totalCount}
              </span>
              <span className="text-xs text-slate-500"> checks passed</span>
            </div>
            <div className="w-20 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-[#FF5E00] h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
          {[
            {
              key: 'wordLimit',
              title: 'Word / Page Limit Compliance',
              desc: statementReq?.lengthLimit
                ? `Adheres strictly to official limit: ${statementReq.lengthLimit}.`
                : 'Draft is within prescribed range (typically 500 – 1,000 words, or maximum 2 pages).',
            },
            {
              key: 'correctUnivName',
              title: 'Institutional Accuracy',
              desc: selectedUniversity
                ? `Target university (${selectedUniversity.name}) and degree title verified.`
                : 'Target university, department, and degree title verified (zero accidental copy-paste mixups).',
            },
            {
              key: 'specificModules',
              title: 'Curriculum Grounding',
              desc: 'Cites at least 2 specific advanced coursework modules or seminar topics by exact name.',
            },
            {
              key: 'facultyCited',
              title: 'Faculty / Lab Alignment',
              desc: 'Mentions at least 1 active faculty chair, research institute, or laboratory facility.',
            },
            {
              key: 'noAiBoilerplate',
              title: 'Zero AI Boilerplate Guarantee',
              desc: 'Free from automated buzzwords ("testament to", "delve into", "beacon of", "tapestry").',
            },
            {
              key: 'proofreadActiveVoice',
              title: 'Active First-Person Voice',
              desc: 'Uses confident active sentences ("I designed", "I built") rather than passive phrasing.',
            },
            {
              key: 'cleanTypography',
              title: 'Formatting & Typography',
              desc: statementReq?.formattingRequirements
                ? `Follows prescribed formatting: ${statementReq.formattingRequirements}`
                : 'Standard 1-inch margins, readable font (Calibri / Arial / Times 11-12pt), 1.15 line spacing.',
            },
            {
              key: 'pdfFormat',
              title: 'Standardized PDF Filename',
              desc: 'Saved as clean PDF titled "LastName_FirstName_SOP_Program.pdf".',
            },
          ].map((item) => (
            <label
              key={item.key}
              className={`flex items-start gap-3.5 p-4 rounded-[6px] border cursor-pointer transition-all ${
                checklist[item.key]
                  ? 'border-emerald-300 bg-emerald-50/50 text-emerald-950 font-medium shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={checklist[item.key]}
                onChange={() => toggleChecklistItem(item.key)}
                className="mt-0.5 rounded text-[#FF5E00] focus:ring-[#FF5E00] h-4 w-4"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-[#0B1026] block">{item.title}</span>
                <span className="text-slate-500 text-[11px] leading-relaxed block">
                  {item.desc}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 6. Submission & Portal Formatting Guidelines */}
      <div className="bg-white rounded-[8px] border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4 hover:border-[#FF5E00] transition-colors font-poppins">
        <h2 className="text-lg font-bold text-[#0B1026] flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-[#FF5E00]" />
          Submission & Portal Formatting Guidelines
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 pt-2">
          <div className="space-y-2 p-4 rounded-[6px] bg-slate-50 border border-slate-100">
            <span className="font-bold text-[#0B1026] block">PDF Export Hygiene</span>
            <p className="leading-relaxed">
              Always export directly to PDF from Microsoft Word or LaTeX. Ensure PDF text remains selectable (never submit scanned images of text). File size must stay under 5 MB for uni-assist and direct portals.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-[6px] bg-slate-50 border border-slate-100">
            <span className="font-bold text-[#0B1026] block">Referee Timeline Coordination</span>
            <p className="leading-relaxed">
              Share your completed SOP outline with your academic and professional referees at least 3 weeks before application deadlines so their recommendation letters corroborate your stated trajectory.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-[6px] bg-slate-50 border border-slate-100">
            <span className="font-bold text-[#0B1026] block">Submission Timing</span>
            <p className="leading-relaxed">
              Submit at least 7–10 days before the official deadline. European portals (e.g. uni-assist, PAC, TUMonline) experience heavy traffic surges in the final 48 hours, which can delay document verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LetterHelperPage;
