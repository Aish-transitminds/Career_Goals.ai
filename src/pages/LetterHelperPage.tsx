/**
 * AbroadPath AI - Letter Helper & Statement of Purpose Writing Coach
 * File: src/pages/LetterHelperPage.tsx
 *
 * CORE PRINCIPLE:
 * The tool teaches and critiques. It never writes. It must NEVER generate,
 * rewrite, paraphrase, or suggest replacement wording for the student's text.
 * Allowed outputs: questions, observations pointing at the student's own words,
 * counts/metrics, and general writing principles with fictional illustrative examples.
 *
 * PRIVACY MODEL:
 * - Default features run 100% locally in the browser. No network requests with student text.
 * - ONE optional feature (Task 6) sends the student's pasted draft to the LLM,
 *   only after an explicit consent checkbox and only when the student clicks the button.
 *   No name, email, profile, scores, or other data is sent. Nothing is stored server-side.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  FileCheck,
  Database,
  Search,
  BookOpen,
  History,
  RotateCcw,
  Eye,
  Trash2,
  Volume2,
  Users,
  Send,
  Info,
  Layers,
} from 'lucide-react';

import {
  SECTION_COACHING_DATA,
  SectionCoachingContent,
} from '../config/clicheConstants';
import {
  analyzeDraft,
  WritingAnalysisResult,
} from '../utils/writingQualityChecker';
import {
  getCoachingFeedback,
  CoachingFeedbackResult,
} from '../services/aiCoachingService';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../hooks/useCatalog';
import { getUserApplications } from '../services/firestoreService';
import { Application, University } from '../types';

// Storage keys
const NOTES_STORAGE_KEY = 'abroadpath_sop_draft_notes';
const EVIDENCE_STORAGE_KEY = 'abroadpath_sop_evidence_bank';
const VERSIONS_STORAGE_KEY = 'abroadpath_sop_versions';
const CHECKLIST_STORAGE_KEY = 'abroadpath_sop_checklist';
const APP_STORAGE_KEY = 'abroadpath_sop_app_id';

// Character cap per section (Priority 1: raised from 500 to 1,500)
const SECTION_CHAR_LIMIT = 1500;

interface EvidenceBank {
  projects: string;
  coursework: string;
  experience: string;
  metrics: string;
  sparkMoment: string;
}

interface DraftVersion {
  id: string;
  label: string;
  timestamp: string;
  text: string;
  wordCount: number;
  flagCount: number;
  anchorCount: number;
}

interface SectionDefinition {
  id: string;
  title: string;
  objective: string;
  prompts: string[];
  whatToInclude: string[];
  whatToAvoid: string[];
  reviewTip: string;
}

const SECTION_DEFS: SectionDefinition[] = [
  {
    id: 'intro',
    title: '1. Introduction & Academic Catalyst',
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
      'Keep this section under 120 words. Hook the reader immediately with mature academic intent.',
  },
  {
    id: 'academic',
    title: '2. Academic Background & Technical Foundations',
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
    title: '4. Why This University & Faculty Alignment',
    objective:
      'Demonstrate that you selected this institution for distinct institutional advantages rather than broad ranking lists.',
    prompts: [
      'Which specific professor, research chair, or lab group is conducting work aligned with your thesis aspirations?',
      'How does the regional ecosystem (e.g. Munich tech cluster, Silicon Docks Dublin, Cambridge biotech) enhance your educational journey?',
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
    title: '5. Short-Term & Long-Term Career Objectives',
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

export const LetterHelperPage: React.FC = () => {
  const { user } = useAuth();

  // 1. Applications integration (Task 7)
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>(() => {
    return localStorage.getItem(APP_STORAGE_KEY) || 'general';
  });

  useEffect(() => {
    localStorage.setItem(APP_STORAGE_KEY, selectedAppId);
  }, [selectedAppId]);

  useEffect(() => {
    if (user?.uid) {
      getUserApplications(user.uid)
        .then((apps) => setApplications(apps))
        .catch(() => setApplications([]));
    }
  }, [user]);

  const { universities } = useCatalog();

  const activeApp = useMemo(() => {
    if (selectedAppId === 'general') return null;
    const app = applications.find((a) => a.id === selectedAppId);
    if (!app) return null;
    const matchedUniv = universities.find((u: University) => u.id === app.universityId);
    return {
      ...app,
      universityName: matchedUniv?.name || app.universityId,
      program: matchedUniv?.program || 'Graduate Program',
    };
  }, [applications, selectedAppId, universities]);

  // 2. Evidence Bank State (Priority 1, Item 1)
  const [evidenceBank, setEvidenceBank] = useState<EvidenceBank>(() => {
    try {
      const saved = localStorage.getItem(EVIDENCE_STORAGE_KEY);
      return saved
        ? JSON.parse(saved)
        : {
            projects: '',
            coursework: '',
            experience: '',
            metrics: '',
            sparkMoment: '',
          };
    } catch {
      return {
        projects: '',
        coursework: '',
        experience: '',
        metrics: '',
        sparkMoment: '',
      };
    }
  });

  const [isEvidenceOpen, setIsEvidenceOpen] = useState<boolean>(true);
  const [showEvidenceDrawer, setShowEvidenceDrawer] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify(evidenceBank));
    } catch {
      // Ignore
    }
  }, [evidenceBank]);

  const handleEvidenceChange = (field: keyof EvidenceBank, val: string) => {
    setEvidenceBank((prev) => ({ ...prev, [field]: val }));
  };

  // 3. Section Scratchpads State (1,500 Char limit, saved locally)
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(NOTES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [expandedSection, setExpandedSection] = useState<string>('intro');
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(drafts));
    } catch {
      // Ignore
    }
  }, [drafts]);

  const handleDraftChange = (sectionId: string, val: string) => {
    const capped = val.slice(0, SECTION_CHAR_LIMIT);
    setDrafts((prev) => ({ ...prev, [sectionId]: capped }));
  };

  // Section progress ("x of 6 sections" drafted)
  const draftedSectionCount = useMemo(() => {
    return SECTION_DEFS.filter((s) => (drafts[s.id] || '').trim().length > 0).length;
  }, [drafts]);

  // Combined text of all 6 sections
  const combinedDraftText = useMemo(() => {
    return SECTION_DEFS.map((s) => drafts[s.id] || '').filter(Boolean).join('\n\n');
  }, [drafts]);

  // 4. Quality Checker State (Priority 1, Item 3)
  const [qualityDraftText, setQualityDraftText] = useState<string>('');
  const [qualityAnalysis, setQualityAnalysis] = useState<WritingAnalysisResult | null>(null);
  const [activeFilterCategory, setActiveFilterCategory] = useState<string>('all');

  const runQualityCheck = (textToAnalyze?: string) => {
    const text = textToAnalyze !== undefined ? textToAnalyze : qualityDraftText;
    const targetUniv = activeApp?.universityName;
    const targetProg = activeApp?.program;
    const result = analyzeDraft(text, targetUniv, targetProg);
    setQualityAnalysis(result);
  };

  const handleLoadCombinedNotes = () => {
    setQualityDraftText(combinedDraftText);
    runQualityCheck(combinedDraftText);
  };

  // Filtered issues
  const filteredIssues = useMemo(() => {
    if (!qualityAnalysis) return [];
    if (activeFilterCategory === 'all') return qualityAnalysis.issues;
    return qualityAnalysis.issues.filter((i) => i.category === activeFilterCategory);
  }, [qualityAnalysis, activeFilterCategory]);

  // 5. Revision Workflow & Versions State (Priority 1, Item 4)
  const [versions, setVersions] = useState<DraftVersion[]>(() => {
    try {
      const saved = localStorage.getItem(VERSIONS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(versions));
    } catch {
      // Ignore
    }
  }, [versions]);

  const saveCurrentVersion = () => {
    const text = qualityDraftText || combinedDraftText;
    if (!text.trim()) return;

    const analysis = analyzeDraft(text, activeApp?.universityName, activeApp?.program);
    const newVersion: DraftVersion = {
      id: `v_${Date.now()}`,
      label: `Draft ${versions.length + 1}`,
      timestamp: new Date().toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      text,
      wordCount: analysis.wordCount,
      flagCount: analysis.issues.length,
      anchorCount: analysis.concreteAnchorsCount,
    };

    setVersions((prev) => [newVersion, ...prev]);
  };

  const restoreVersion = (v: DraftVersion) => {
    setQualityDraftText(v.text);
    runQualityCheck(v.text);
  };

  // Mentor Review Modal / Checklist state
  const [showMentorChecklist, setShowMentorChecklist] = useState<boolean>(false);
  const [copiedMentorQuestions, setCopiedMentorQuestions] = useState<boolean>(false);

  const MENTOR_REVIEW_QUESTIONS = [
    '1. Academic Catalyst: Does the opening paragraph articulate an authentic intellectual catalyst rather than childhood nostalgia or generic enthusiasm?',
    '2. Personal Ownership: Can you tell precisely what technical contributions I made versus my teammates or advisors in the project section?',
    '3. Evidence & Metrics: Are my assertions backed by quantitative benchmarks, named tools, or verifiable outcomes rather than vague adjectives?',
    '4. Curricular Fit: Did I make a compelling, specific case for why this exact university and syllabus fill my current knowledge gaps?',
    '5. Tone & Voice: Does the draft sound like an authentic emerging scholar rather than formulaic AI-generated boilerplate?',
    '6. Clarity & Brevity: Which sentences felt dense, convoluted, or unnecessary during your read-through?',
  ];

  const copyMentorQuestions = () => {
    navigator.clipboard.writeText(MENTOR_REVIEW_QUESTIONS.join('\n\n'));
    setCopiedMentorQuestions(true);
    setTimeout(() => setCopiedMentorQuestions(false), 2500);
  };

  // 6. Pre-Submission Checklist (8-Point)
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      return saved
        ? JSON.parse(saved)
        : {
            wordLimit: false,
            correctUnivName: false,
            specificModules: false,
            facultyCited: false,
            noAiBoilerplate: false,
            proofreadActiveVoice: false,
            cleanTypography: false,
            pdfFormat: false,
          };
    } catch {
      return {
        wordLimit: false,
        correctUnivName: false,
        specificModules: false,
        facultyCited: false,
        noAiBoilerplate: false,
        proofreadActiveVoice: false,
        cleanTypography: false,
        pdfFormat: false,
      };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checklist));
    } catch {
      // Ignore
    }
  }, [checklist]);

  const toggleChecklistItem = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const completedChecks = Object.values(checklist).filter(Boolean).length;
  const totalChecks = Object.keys(checklist).length;
  const checklistProgress = Math.round((completedChecks / totalChecks) * 100);

  // 7. Optional LLM Coaching State (Priority 2, Item 6)
  const [aiConsent, setAiConsent] = useState<boolean>(false);
  const [aiDraftInput, setAiDraftInput] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<CoachingFeedbackResult | null>(null);

  const handleRequestAiCoaching = async () => {
    if (!aiConsent || !aiDraftInput.trim()) return;
    setAiLoading(true);
    setAiResult(null);

    try {
      const res = await getCoachingFeedback(aiDraftInput, aiConsent);
      setAiResult(res);
    } catch (err: any) {
      setAiResult({
        success: false,
        content: '',
        disclaimer: '',
        error: 'An unexpected error occurred while communicating with the coaching service.',
      });
    } finally {
      setAiLoading(false);
    }
  };

  // 8. Data Clearing ("Delete My Data" for Letter Helper)
  const [clearDataConfirm, setClearDataConfirm] = useState<boolean>(false);

  const handleClearAllLetterHelperData = () => {
    localStorage.removeItem(NOTES_STORAGE_KEY);
    localStorage.removeItem(EVIDENCE_STORAGE_KEY);
    localStorage.removeItem(VERSIONS_STORAGE_KEY);
    localStorage.removeItem(CHECKLIST_STORAGE_KEY);
    localStorage.removeItem(APP_STORAGE_KEY);

    setDrafts({});
    setEvidenceBank({
      projects: '',
      coursework: '',
      experience: '',
      metrics: '',
      sparkMoment: '',
    });
    setVersions([]);
    setQualityDraftText('');
    setQualityAnalysis(null);
    setAiDraftInput('');
    setAiResult(null);
    setAiConsent(false);
    setChecklist({
      wordLimit: false,
      correctUnivName: false,
      specificModules: false,
      facultyCited: false,
      noAiBoilerplate: false,
      proofreadActiveVoice: false,
      cleanTypography: false,
      pdfFormat: false,
    });
    setClearDataConfirm(false);
  };

  // Copy helpers
  const copySectionDraft = (sectionId: string) => {
    const text = drafts[sectionId] || '';
    navigator.clipboard.writeText(text);
    setCopiedDraftId(sectionId);
    setTimeout(() => setCopiedDraftId(null), 2000);
  };

  const copyAllExport = () => {
    let output = '==================================================\n';
    output += 'STATEMENT OF PURPOSE EVIDENCE BANK & DRAFT OUTLINE\n';
    output += 'AbroadPath AI - Academic Coaching Export\n';
    output += `Target Application: ${activeApp ? `${activeApp.universityName} (${activeApp.program})` : 'General'}\n`;
    output += `Date: ${new Date().toLocaleDateString()}\n`;
    output += '==================================================\n\n';

    output += '--- EVIDENCE BANK (RAW FACTS) ---\n';
    output += `[Projects & Tools]:\n${evidenceBank.projects || 'None listed'}\n\n`;
    output += `[Coursework & Modules]:\n${evidenceBank.coursework || 'None listed'}\n\n`;
    output += `[Research & Internship]:\n${evidenceBank.experience || 'None listed'}\n\n`;
    output += `[Metrics & Outcomes]:\n${evidenceBank.metrics || 'None listed'}\n\n`;
    output += `[Spark Moment]:\n${evidenceBank.sparkMoment || 'None listed'}\n\n`;

    output += '--- 6-SECTION OUTLINE NOTES ---\n';
    SECTION_DEFS.forEach((sec) => {
      output += `\n[${sec.title.toUpperCase()}]\n`;
      output += `${drafts[sec.id] || '[No draft notes yet]'}\n`;
    });

    navigator.clipboard.writeText(output);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 px-3 sm:px-6 overflow-x-hidden">
      {/* 1. VISUAL HERO BANNER (UK University Architecture Aesthetics) */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200/80 shadow-lg bg-slate-900">
        <img
          src="/assets/images/uk_university_campus.jpg"
          alt="Historic European university campus quadrangle"
          className="w-full h-56 sm:h-72 object-cover object-center opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent" />
        
        <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-end text-white">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              100% Client-Side Private By Default
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Writing Coach &bull; Zero Ghostwriting
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-2">
            Statement of Purpose & Motivation Letter Coach
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-3xl leading-relaxed">
            Faculty admissions committees at leading institutions evaluate authenticity, rigorous technical foundations, and curricular fit. This coach teaches and critiques your writing through reflection prompts and deterministic checks—it never generates or replaces your words.
          </p>

          {/* Application Selector Bar */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Target Application:</span>
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="bg-slate-800/90 text-white font-semibold px-3 py-1.5 rounded-xl border border-white/20 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value="general">General / Master's SOP (Multi-Program)</option>
                {applications.map((app) => {
                  const matched = universities.find((u: University) => u.id === app.universityId);
                  return (
                    <option key={app.id} value={app.id}>
                      {matched ? `${matched.name} — ${matched.program}` : `Application (${app.universityId})`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400">Outline Progress:</span>
              <span className="font-bold text-emerald-400">
                {draftedSectionCount} of 6 sections drafted
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TRANSPARENT PRIVACY MODEL NOTICE */}
      <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row items-start gap-3.5">
        <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <span className="font-bold text-slate-900 block">
            Privacy Model & Academic Ethics Guarantee
          </span>
          <p className="text-slate-600 leading-relaxed text-[11px] sm:text-xs">
            <strong>Default features run 100% locally in your browser.</strong> Your Evidence Bank, section notes, quality checks, and version history stay strictly on your device and make zero network requests. One optional feature (Task 6 AI Coaching) sends ONLY the draft text you explicitly paste into its box, and only after you tick an affirmative consent checkbox. No name, profile, or account data is ever sent, and nothing is retained server-side.
          </p>
        </div>
      </div>

      {/* 3. PRIORITY 1, ITEM 1: EVIDENCE BANK ("YOUR FACTS") */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden transition-all">
        <button
          onClick={() => setIsEvidenceOpen(!isEvidenceOpen)}
          aria-expanded={isEvidenceOpen}
          className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 bg-gradient-to-r from-indigo-50/40 via-white to-slate-50 border-b border-slate-100"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-slate-900 text-base sm:text-lg">
                  Evidence Bank ("Your Facts")
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold uppercase">
                  Start Here
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Strong statements of purpose are built on verifiable facts, not adjectives. Record your raw material first.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-indigo-600 hidden sm:inline">
              {isEvidenceOpen ? 'Collapse' : 'Expand Form'}
            </span>
            <div className="p-1.5 rounded-full bg-slate-100 text-slate-600">
              {isEvidenceOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </button>

        {isEvidenceOpen && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Field 1: Projects & Tools */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  1. Core Projects & Technical Experiments
                </label>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  What did YOU personally do? What tools/frameworks did you use, and what changed or improved because of it?
                </p>
                <textarea
                  value={evidenceBank.projects}
                  onChange={(e) => handleEvidenceChange('projects', e.target.value)}
                  placeholder="e.g. Built a multi-threaded telemetry pipeline using PyTorch and Kafka; tuned memory buffering to cut drop rates by 18%."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Field 2: Coursework & Modules */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  2. Advanced Coursework & Conceptual Foundations
                </label>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Which undergraduate modules, math topics, or lab courses provided your foundation? What advanced seminar topic intrigued you?
                </p>
                <textarea
                  value={evidenceBank.coursework}
                  onChange={(e) => handleEvidenceChange('coursework', e.target.value)}
                  placeholder="e.g. Distributed Algorithms (CS302 - 92%), Linear Algebra for Machine Learning, Convex Optimization."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Field 3: Research / Internship */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  3. Research, Lab, or Internship Experience
                </label>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  What was your specific role, who did you collaborate with, and what technical challenges did you debug?
                </p>
                <textarea
                  value={evidenceBank.experience}
                  onChange={(e) => handleEvidenceChange('experience', e.target.value)}
                  placeholder="e.g. Research Assistant at Vision Systems Lab under Prof. K. Mehta; investigated quantization errors on edge TPUs."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Field 4: Metrics & Measurable Outcomes */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  4. Specific Numbers & Measurable Outcomes
                </label>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  List benchmarks, percentages, dataset sizes, latency reductions, paper preprints, or GitHub stars.
                </p>
                <textarea
                  value={evidenceBank.metrics}
                  onChange={(e) => handleEvidenceChange('metrics', e.target.value)}
                  placeholder="e.g. F1-score improved from 0.71 to 0.89; processed 25,000 readings/sec; open-source library received 140 GitHub stars."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Field 5: Spark Moment */}
            <div className="space-y-1.5 pt-1 text-xs">
              <label className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                5. One Real Academic Moment That Sparked Your Focus
              </label>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                What concrete observation, experiment, or technical failure first compelled you to investigate this specific field beyond normal coursework?
              </p>
              <textarea
                value={evidenceBank.sparkMoment}
                onChange={(e) => handleEvidenceChange('sparkMoment', e.target.value)}
                placeholder="e.g. Observed 40% accuracy degradation when testing our camera segmentation model under low-light rain conditions, sparking my thesis focus on robust domain adaptation."
                rows={2}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span className="flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Facts saved locally in your browser
              </span>
              <button
                type="button"
                onClick={() => setShowEvidenceDrawer(!showEvidenceDrawer)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-colors"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{showEvidenceDrawer ? 'Hide Facts Side Drawer' : 'View Facts in Side Drawer'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* OPTIONAL FLOATING EVIDENCE DRAWER (FOR REFERENCING FACTS WHILE DRAFTING) */}
      {showEvidenceDrawer && (
        <div className="p-5 bg-indigo-950 text-white rounded-3xl border border-indigo-800 shadow-xl space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-indigo-800 pb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              <span className="font-extrabold text-sm uppercase tracking-wider text-indigo-200">
                Evidence Bank Reference Drawer
              </span>
            </div>
            <button
              onClick={() => setShowEvidenceDrawer(false)}
              className="text-xs text-indigo-300 hover:text-white"
            >
              Close Drawer &times;
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-indigo-100">
            <div className="bg-indigo-900/60 p-3 rounded-xl border border-indigo-800">
              <span className="font-bold text-indigo-300 block mb-1">Projects & Tools:</span>
              <p className="line-clamp-4 text-[11px] leading-relaxed">
                {evidenceBank.projects || 'No projects listed yet in Evidence Bank.'}
              </p>
            </div>
            <div className="bg-indigo-900/60 p-3 rounded-xl border border-indigo-800">
              <span className="font-bold text-indigo-300 block mb-1">Metrics & Outcomes:</span>
              <p className="line-clamp-4 text-[11px] leading-relaxed">
                {evidenceBank.metrics || 'No metrics listed yet.'}
              </p>
            </div>
            <div className="bg-indigo-900/60 p-3 rounded-xl border border-indigo-800">
              <span className="font-bold text-indigo-300 block mb-1">Spark Catalyst:</span>
              <p className="line-clamp-4 text-[11px] leading-relaxed">
                {evidenceBank.sparkMoment || 'No spark moment recorded yet.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. PRIORITY 1, ITEM 2: 6-SECTION STRUCTURAL OUTLINE WITH UPGRADED COACHING */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              SOP Structural Framework & Section Scratchpads
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft your outline notes section by section (1,500 characters per block). Reference the committee coaching and illustrative patterns below.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={copyAllExport}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors"
            >
              {copiedAll ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedAll ? 'Export Copied' : 'Export Notes & Evidence'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {SECTION_DEFS.map((sec) => {
            const isExpanded = expandedSection === sec.id;
            const draftText = drafts[sec.id] || '';
            const charCount = draftText.length;
            const coaching: SectionCoachingContent = SECTION_COACHING_DATA[sec.id];

            return (
              <div
                key={sec.id}
                className={`bg-white rounded-3xl border transition-all ${
                  isExpanded
                    ? 'border-indigo-300 shadow-md ring-1 ring-indigo-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Accordion Header */}
                <button
                  onClick={() => setExpandedSection(isExpanded ? '' : sec.id)}
                  aria-expanded={isExpanded}
                  aria-controls={`section-body-${sec.id}`}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                        {sec.title}
                      </h3>
                      {coaching && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          Budget: ~{coaching.wordBudgetGuide.words} words
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {sec.objective}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {charCount > 0 && (
                      <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {charCount} chars drafted
                      </span>
                    )}
                    <div className="p-1.5 rounded-full bg-slate-100 text-slate-600">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </button>

                {/* Expanded Details & Scratchpad */}
                {isExpanded && (
                  <div
                    id={`section-body-${sec.id}`}
                    className="px-5 pb-6 sm:px-6 sm:pb-8 pt-2 border-t border-slate-100 space-y-6"
                  >
                    {/* What Committees Look For */}
                    {coaching && (
                      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 text-xs text-slate-800 space-y-1.5">
                        <span className="font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                          <Eye className="w-4 h-4 text-indigo-600" />
                          What Committees Look For Here
                        </span>
                        <p className="leading-relaxed text-slate-600">
                          {coaching.whatCommitteesLookFor}
                        </p>
                        <p className="text-[11px] text-indigo-700 font-medium pt-1">
                          Word budget guide: {coaching.wordBudgetGuide.note}
                        </p>
                      </div>
                    )}

                    {/* Guiding Deeper Reflection Questions */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4" />
                        Deeper Reflection Questions (Pushing Toward Specifics)
                      </span>
                      <ul className="space-y-2 text-xs text-slate-700 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                        {(coaching ? coaching.reflectionQuestions : sec.prompts).map((p, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="text-indigo-600 font-extrabold mt-0.5">&bull;</span>
                            <span className="leading-relaxed font-medium">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Weak vs Stronger Pattern Pair (Strictly Fictional Illustrative Examples) */}
                    {coaching && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          Pattern Comparison (Illustrative Example, Not for Copying)
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Weak */}
                          <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 space-y-2">
                            <span className="font-bold text-rose-900 block">
                              {coaching.weakPattern.label}
                            </span>
                            <blockquote className="italic text-rose-950/90 bg-white/60 p-2.5 rounded-xl border border-rose-100 text-[11px] leading-relaxed">
                              "{coaching.weakPattern.text}"
                            </blockquote>
                            <p className="text-[11px] text-rose-800 leading-relaxed">
                              <strong>Why it weakens: </strong>
                              {coaching.weakPattern.whyItWeakens}
                            </p>
                          </div>

                          {/* Stronger */}
                          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-2">
                            <span className="font-bold text-emerald-900 block">
                              {coaching.strongerPattern.label}
                            </span>
                            <blockquote className="italic text-emerald-950/90 bg-white/60 p-2.5 rounded-xl border border-emerald-100 text-[11px] leading-relaxed">
                              "{coaching.strongerPattern.text}"
                            </blockquote>
                            <p className="text-[11px] text-emerald-800 leading-relaxed">
                              <strong>Why it works: </strong>
                              {coaching.strongerPattern.whyItWorks}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Student Scratchpad (1,500 Char limit, live counter, saved locally) */}
                    <div className="space-y-2 pt-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <span>Your Section Notes & Draft Bullets</span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                            Saved locally
                          </span>
                        </label>
                        <div className="flex items-center gap-3">
                          <span
                            className={`text-[11px] font-semibold font-mono ${
                              charCount >= 1400 ? 'text-rose-600' : 'text-slate-500'
                            }`}
                          >
                            {charCount} / {SECTION_CHAR_LIMIT} characters
                          </span>
                          <button
                            type="button"
                            onClick={() => copySectionDraft(sec.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                          >
                            {copiedDraftId === sec.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                            <span>{copiedDraftId === sec.id ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      <textarea
                        value={draftText}
                        onChange={(e) => handleDraftChange(sec.id, e.target.value)}
                        placeholder={`Draft your key points and evidenced facts for ${sec.title.toLowerCase()} here...`}
                        maxLength={SECTION_CHAR_LIMIT}
                        rows={5}
                        className="w-full p-4 rounded-2xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-sans leading-relaxed"
                      />
                      <p className="text-[11px] text-slate-500">
                        Saved in browser localStorage. Local notes stay local; AI coaching is optional, consent-based, and sends only what you explicitly paste.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. PRIORITY 1, ITEM 3: LOCAL DETERMINISTIC WRITING QUALITY CHECKER */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-600" />
                Local Deterministic Writing Quality Check
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                100% Local / Zero AI
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluates specificity, vague claims, clichés, sentence length, repetition, and structure. Flags only; never rewrites your sentences.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLoadCombinedNotes}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors self-start sm:self-center"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Load Combined Section Notes</span>
          </button>
        </div>

        {/* Textarea for Draft to Analyze */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span>Paste Full SOP Draft to Check</span>
            <span className="text-[11px] text-slate-500 font-normal">
              Runs client-side in your browser via regex & token heuristics
            </span>
          </label>
          <textarea
            value={qualityDraftText}
            onChange={(e) => setQualityDraftText(e.target.value)}
            placeholder="Paste your full draft (or click 'Load Combined Section Notes' above) to inspect concrete anchors, sentence lengths, and vague claims..."
            rows={6}
            className="w-full p-4 rounded-2xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-sans leading-relaxed"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => runQualityCheck()}
              disabled={!qualityDraftText.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Search className="w-4 h-4" />
              <span>Run Quality Analysis</span>
            </button>
            <button
              type="button"
              onClick={saveCurrentVersion}
              disabled={!qualityDraftText.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-bold transition-colors"
            >
              <History className="w-4 h-4 text-indigo-600" />
              <span>Save Version for Progress Tracking</span>
            </button>
          </div>
        </div>

        {/* Analysis Results Display */}
        {qualityAnalysis && (
          <div className="space-y-5 pt-3 border-t border-slate-100">
            {/* Metric Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] text-slate-500 block">Total Words</span>
                <span className="text-lg font-extrabold text-slate-900">{qualityAnalysis.wordCount}</span>
                <span className="text-[10px] text-slate-400 block">~800 target guide</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] text-slate-500 block">Avg Sentence Length</span>
                <span className={`text-lg font-extrabold ${qualityAnalysis.avgSentenceLength > 28 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {qualityAnalysis.avgSentenceLength} w/s
                </span>
                <span className="text-[10px] text-slate-400 block">&lt; 30 recommended</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] text-slate-500 block">Concrete Anchors</span>
                <span className="text-lg font-extrabold text-emerald-700">{qualityAnalysis.concreteAnchorsCount}</span>
                <span className="text-[10px] text-slate-400 block">metrics, tools, codes</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                <span className="text-[11px] text-slate-500 block">Quality Flags</span>
                <span className={`text-lg font-extrabold ${qualityAnalysis.issues.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {qualityAnalysis.issues.length}
                </span>
                <span className="text-[10px] text-slate-400 block">questions for review</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-500 block">Paragraphs</span>
                <span className="text-lg font-extrabold text-slate-900">{qualityAnalysis.paragraphCount}</span>
                <span className="text-[10px] text-slate-400 block">{qualityAnalysis.sentenceCount} sentences</span>
              </div>
            </div>

            {/* Structure Coverage Badges */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
              <span className="font-bold text-slate-900">Structure Coverage Check:</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 ${qualityAnalysis.structureChecklist.targetUniversityDetected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  {qualityAnalysis.structureChecklist.targetUniversityDetected ? '✓ Target University' : '• Target Univ Unconfirmed'}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 ${qualityAnalysis.structureChecklist.courseModulesDetected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  {qualityAnalysis.structureChecklist.courseModulesDetected ? '✓ Coursework / Modules' : '• Modules Unconfirmed'}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 ${qualityAnalysis.structureChecklist.careerTrajectoryDetected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                  {qualityAnalysis.structureChecklist.careerTrajectoryDetected ? '✓ Career Trajectory' : '• Career Trajectory Unconfirmed'}
                </span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {[
                { id: 'all', label: `All Flags (${qualityAnalysis.issues.length})` },
                { id: 'specificity', label: 'Specificity' },
                { id: 'vague_claim', label: 'Vague Claims' },
                { id: 'cliche', label: 'AI Boilerplate & Clichés' },
                { id: 'readability', label: 'Readability & Length' },
                { id: 'repetition', label: 'Repetition' },
                { id: 'structure', label: 'Structure' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilterCategory(tab.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    activeFilterCategory === tab.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Issues List with Strict Question-Based Feedback */}
            {filteredIssues.length === 0 ? (
              <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center text-xs text-emerald-900 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <span className="font-bold text-sm block">No issues detected in this category</span>
                <p className="text-emerald-800 text-[11px]">
                  Your draft demonstrates solid ground here. Always double-check facts against your official university application guidelines.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-4 rounded-2xl border border-amber-200/90 bg-amber-50/50 text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-200 text-amber-900">
                          {issue.category.replace('_', ' ')}
                        </span>
                        <span className="font-bold text-slate-900">{issue.observation}</span>
                      </div>
                    </div>

                    {issue.quote && (
                      <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60 text-slate-800 italic font-serif text-[11px]">
                        "{issue.quote}"
                      </div>
                    )}

                    <div className="text-indigo-950 font-medium flex items-start gap-2 pt-1 text-[11px] sm:text-xs">
                      <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <span>{issue.question}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. PRIORITY 1, ITEM 4: REVISION WORKFLOW & LOCAL VERSION TRACKING */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-indigo-600" />
              3-Pass Revision Workflow & Local Versions
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Refining a statement of purpose requires focused passes. Save local versions to monitor flag reductions and evidence growth.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMentorChecklist(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Mentor Review Checklist</span>
            </button>
          </div>
        </div>

        {/* Scholarly Research Library Visual Context */}
        <div className="relative rounded-2xl overflow-hidden h-32 sm:h-36 border border-slate-200 shadow-xs">
          <img
            src="/assets/images/university_library_interior.jpg"
            alt="Historic European university research library"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/60 to-transparent flex items-center p-5 sm:p-6">
            <div className="max-w-md text-white space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-300">
                Scholarly Rigor & Self-Review
              </span>
              <p className="text-xs text-slate-200 leading-relaxed font-medium">
                Treat your statement like a seminar submission. Multiple focused revision passes transform early unstructured notes into a cohesive, compelling academic argument.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Pass Guide Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                1
              </span>
              <span className="font-bold text-indigo-950">Pass 1: Content & Evidence</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Is every major claim backed by concrete evidence from your Evidence Bank? Cut self-praising adjectives ("hardworking", "passionate") and replace them with technical metrics.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                2
              </span>
              <span className="font-bold text-indigo-950">Pass 2: Structure & Flow</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Does each paragraph have one distinct job? Check logical transitions between your undergraduate catalyst and your future career milestone.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
                3
              </span>
              <span className="font-bold text-indigo-950">Pass 3: Read-Aloud & Polish</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Read your draft aloud at normal speaking speed. Stumbling over a phrase indicates a run-on sentence or artificial phrasing that should be split.
            </p>
          </div>
        </div>

        {/* Read-Aloud Guidance Prompt */}
        <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start gap-3">
          <Volume2 className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">The 10-Minute Read-Aloud Test</span>
            <p className="leading-relaxed text-[11px] text-amber-900">
              Read your entire draft aloud to yourself or a friend. Whenever your breath catches, you've found a sentence over 35 words. Whenever you cringe at an artificial word ("tapestry", "plethora"), highlight it and replace it with direct, honest technical language.
            </p>
          </div>
        </div>

        {/* Saved Draft Versions History */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <History className="w-4 h-4 text-indigo-600" />
            Saved Local Versions ({versions.length})
          </span>

          {versions.length === 0 ? (
            <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
              No saved versions yet. Click "Save Version for Progress Tracking" in the Quality Checker to snapshot your draft and measure progress over time.
            </p>
          ) : (
            <div className="space-y-2">
              {versions.map((ver) => (
                <div
                  key={ver.id}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-900">{ver.label}</span>
                    <span className="text-[11px] text-slate-500">{ver.timestamp}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-slate-600">
                      <strong>{ver.wordCount}</strong> words
                    </span>
                    <span className="text-emerald-700">
                      <strong>{ver.anchorCount}</strong> anchors
                    </span>
                    <span className={`font-semibold ${ver.flagCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      <strong>{ver.flagCount}</strong> flags
                    </span>
                    <button
                      type="button"
                      onClick={() => restoreVersion(ver)}
                      className="px-3 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-colors"
                    >
                      Restore Draft
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 7. PRIORITY 2, ITEM 6: OPTIONAL "GET COACHING FEEDBACK" (LLM, OPT-IN) */}
      <div className="relative rounded-3xl overflow-hidden border border-indigo-200 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white shadow-xl">
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-600 text-white">
                  <Sparkles className="w-5 h-5" />
                </span>
                <h2 className="text-xl font-extrabold tracking-tight text-white">
                  Optional AI Writing Coach (Consent-Based Opt-In)
                </h2>
              </div>
              <p className="text-xs text-indigo-200">
                Receive targeted Socratic feedback (strengths, improvement questions, and structure observation).
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[10px] font-bold uppercase self-start sm:self-center">
              Never Rewrites &bull; Questions Only
            </span>
          </div>

          {/* Explicit Privacy & Consent Checkbox */}
          <div className="p-4 bg-indigo-900/60 rounded-2xl border border-indigo-700/60 space-y-2">
            <label className="flex items-start gap-3 cursor-pointer text-xs text-indigo-100">
              <input
                type="checkbox"
                checked={aiConsent}
                onChange={(e) => setAiConsent(e.target.checked)}
                className="mt-0.5 rounded text-indigo-500 focus:ring-indigo-400 h-4 w-4 shrink-0"
              />
              <span className="leading-relaxed">
                <strong>I understand my pasted draft will be sent to an AI service for feedback. It is not stored.</strong> No name, email, profile data, or test scores are attached.
              </span>
            </label>
            <p className="text-[11px] text-indigo-300 pl-7 leading-relaxed">
              In accordance with our strict ethics policy, the AI coach will point at your own phrases and ask questions to help you improve—it is strictly prohibited from writing or rewriting text.
            </p>
          </div>

          {/* Draft Input for LLM */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-indigo-200">
              <span>Paste Draft for AI Feedback:</span>
              <button
                type="button"
                onClick={() => setAiDraftInput(qualityDraftText || combinedDraftText)}
                className="text-[11px] font-bold text-indigo-300 hover:text-white underline"
              >
                Copy from Quality Checker
              </button>
            </div>
            <textarea
              value={aiDraftInput}
              onChange={(e) => setAiDraftInput(e.target.value)}
              placeholder="Paste your draft text here to request coach questions..."
              rows={5}
              className="w-full p-4 rounded-2xl bg-indigo-950/70 border border-indigo-700 text-xs text-white placeholder-indigo-300/60 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all font-sans leading-relaxed"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleRequestAiCoaching}
              disabled={!aiConsent || !aiDraftInput.trim() || aiLoading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold transition-all shadow-md"
            >
              <Send className="w-4 h-4" />
              <span>{aiLoading ? 'Reviewing Your Draft...' : 'Get Coaching Feedback'}</span>
            </button>
            <span className="text-[11px] text-indigo-300 italic">
              AI feedback can be wrong. You decide what to change.
            </span>
          </div>

          {/* AI Result Display */}
          {aiResult && (
            <div className="pt-4 border-t border-indigo-800 space-y-3">
              {aiResult.success ? (
                <div className="p-5 bg-indigo-900/90 rounded-2xl border border-indigo-600 text-xs text-indigo-100 space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-700 pb-2">
                    <span className="font-bold text-white text-sm">Coach Review Output</span>
                    <span className="text-[11px] text-indigo-300">{aiResult.disclaimer}</span>
                  </div>
                  <div className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-indigo-50">
                    {aiResult.content}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-rose-950/80 rounded-2xl border border-rose-700 text-xs text-rose-200">
                  <span className="font-bold block mb-1">Feedback Unavailable:</span>
                  <p>{aiResult.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 8. PRE-SUBMISSION QUALITY CHECKLIST (8-POINT) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Pre-Submission Quality Checklist
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Verify your final draft against official admission expectations prior to uploading to portals.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <div className="text-right">
              <span className="text-xs font-bold text-slate-900">
                {completedChecks} of {totalChecks}
              </span>
              <span className="text-xs text-slate-500"> checks passed</span>
            </div>
            <div className="w-20 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
          {[
            {
              key: 'wordLimit',
              title: 'Word Count Verification',
              desc: 'Draft is within prescribed range (typically 500 – 1,000 words, or maximum 2 pages; always confirm your program’s exact limit).',
            },
            {
              key: 'correctUnivName',
              title: 'Institutional Accuracy',
              desc: 'Target university, department, and degree title verified (zero accidental copy-paste mixups).',
            },
            {
              key: 'specificModules',
              title: 'Curriculum Grounding',
              desc: 'Cites at least 2 specific advanced coursework modules or seminar topics by name from the handbook.',
            },
            {
              key: 'facultyCited',
              title: 'Faculty / Lab Alignment',
              desc: 'Mentions at least 1 active faculty chair, research institute, or laboratory facility with aligned research themes.',
            },
            {
              key: 'noAiBoilerplate',
              title: 'Zero AI Boilerplate Guarantee',
              desc: 'Free from automated buzzwords ("testament to", "delve into", "beacon of", "tapestry").',
            },
            {
              key: 'proofreadActiveVoice',
              title: 'Active First-Person Voice',
              desc: 'Uses confident active sentences ("I engineered", "I benchmarked") rather than passive phrasing.',
            },
            {
              key: 'cleanTypography',
              title: 'Formatting & Typography',
              desc: 'Standard 1-inch margins, readable font (Calibri / Arial / Times 11-12pt), 1.15 line spacing.',
            },
            {
              key: 'pdfFormat',
              title: 'Standardized PDF Filename',
              desc: 'Saved as clean PDF titled "LastName_FirstName_SOP_Program.pdf".',
            },
          ].map((item) => (
            <label
              key={item.key}
              className={`flex items-start gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all ${
                checklist[item.key]
                  ? 'border-emerald-300 bg-emerald-50/50 text-emerald-950 font-medium shadow-xs'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <input
                type="checkbox"
                checked={checklist[item.key]}
                onChange={() => toggleChecklistItem(item.key)}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0"
              />
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 block">{item.title}</span>
                <span className="text-slate-500 text-[11px] leading-relaxed block">
                  {item.desc}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 9. SUBMISSION GUIDELINES (SOURCED & SOFTENED) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-indigo-600" />
          Submission & Portal Formatting Guidelines
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 pt-2">
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="font-bold text-slate-900 block">PDF Export Hygiene</span>
            <p className="leading-relaxed text-[11px]">
              Always export directly to PDF from Microsoft Word or Google Docs. Ensure PDF text remains selectable (never submit scanned images of text). File size is limited to 5 MB on the uni-assist portal (source: uni-assist.de technical guidelines, verified Oct 2026); some direct portals permit up to 10 MB.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="font-bold text-slate-900 block">Referee Timeline Coordination</span>
            <p className="leading-relaxed text-[11px]">
              Sharing your completed SOP outline with your academic and professional referees 3 weeks before deadlines is recommended as standard etiquette, giving referees adequate time to corroborate your stated research direction.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="font-bold text-slate-900 block">Submission Timing</span>
            <p className="leading-relaxed text-[11px]">
              Submitting 7–10 days before the deadline is recommended to avoid server bottlenecks during peak submission windows, especially on centralized portals where traffic surges can delay document verification.
            </p>
          </div>
        </div>
      </div>

      {/* 10. LOCAL DATA MANAGEMENT (DELETE MY DATA) */}
      <div className="p-5 bg-slate-100 rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
        <div>
          <span className="font-bold text-slate-900 block">Manage Local Letter Helper Data</span>
          <span className="text-[11px] text-slate-500">
            Purge your locally saved notes, Evidence Bank facts, draft versions, and quality checklist from this browser.
          </span>
        </div>

        {clearDataConfirm ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearAllLetterHelperData}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
            >
              Yes, Delete All SOP Data
            </button>
            <button
              onClick={() => setClearDataConfirm(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setClearDataConfirm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 hover:border-rose-300 font-bold text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Letter Helper Data</span>
          </button>
        )}
      </div>

      {/* MENTOR REVIEW CHECKLIST MODAL */}
      {showMentorChecklist && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 space-y-5 border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-lg">
                  Mentor Review Checklist (Questions for Reviewers)
                </h3>
              </div>
              <button
                onClick={() => setShowMentorChecklist(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              When sharing your draft with a professor, advisor, or trusted peer, ask them to evaluate these specific questions rather than asking for general copyedits:
            </p>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-800">
              {MENTOR_REVIEW_QUESTIONS.map((q, idx) => (
                <div key={idx} className="leading-relaxed">
                  {q}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={copyMentorQuestions}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
              >
                {copiedMentorQuestions ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedMentorQuestions ? 'Questions Copied' : 'Copy All Questions'}</span>
              </button>
              <button
                onClick={() => setShowMentorChecklist(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LetterHelperPage;
