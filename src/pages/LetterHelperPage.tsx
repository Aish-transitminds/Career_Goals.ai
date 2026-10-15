/**
 * AbroadPath AI - Letter Helper (Structure, Prompts & Quality Checklist Only)
 * File: src/pages/LetterHelperPage.tsx
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, Screens #8, Rules for Build) & PROJECT.md
 * STRICT CONSTRAINT: NO AI-GENERATED LETTER TEXT. Pedagogy & structure only.
 */

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';

interface LetterSection {
  id: string;
  title: string;
  objective: string;
  prompts: string[];
  whatToInclude: string[];
  whatToAvoid: string[];
  reviewTip: string;
}

const LETTER_SECTIONS: LetterSection[] = [
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
    title: '2. Academic Background & Undergraduate Foundations',
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

const STORAGE_KEY = 'abroadpath_sop_draft_notes';

export const LetterHelperPage: React.FC = () => {
  // Local student notes scratchpad (Zero AI, 500-char cap per section)
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [expandedSection, setExpandedSection] = useState<string>('intro');
  const [copiedDraftId, setCopiedDraftId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Pre-submission quality checklist state
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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    } catch {
      // Ignore storage errors
    }
  }, [drafts]);

  const handleDraftChange = (sectionId: string, val: string) => {
    // Strict 500-character input capping (R4)
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
    const combined = LETTER_SECTIONS.map((sec) => {
      const notes = drafts[sec.id] || '[No draft notes yet]';
      return `=== ${sec.title.toUpperCase()} ===\n${notes}\n`;
    }).join('\n');

    navigator.clipboard.writeText(combined);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const toggleChecklistItem = (key: string) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalCount = Object.keys(checklist).length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. Page Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-100 text-indigo-900 text-xs font-bold uppercase tracking-wider">
          <FileText className="w-4 h-4 text-indigo-700" />
          Structural Framework &bull; Authentic Student Voice Only
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Statement of Purpose & Motivation Letter Guide
        </h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-3xl leading-relaxed">
          European admissions committees in Germany, Ireland, and the UK look for authentic personal voice, rigorous undergraduate preparation, and specific syllabus alignment.
          Use this pedagogical workbench to draft and verify your own submission.
        </p>
      </div>

      {/* 2. STRICT NON-AI COMPLIANCE PLEDGE (Prominent Banner) */}
      <div className="p-5 bg-amber-50 rounded-3xl border-2 border-amber-300 text-xs text-amber-950 flex flex-col sm:flex-row items-start gap-4 shadow-sm">
        <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-sm uppercase tracking-wide text-amber-900">
              Strict Policy: Zero AI-Generated Letter Text
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-[10px] font-bold text-amber-900">
              Mandatory Rule
            </span>
          </div>
          <p className="leading-relaxed text-amber-900/90 text-xs">
            In compliance with our core ethics mandate, <strong>AbroadPath AI does not generate or rewrite letter text</strong>.
            Foreign admissions committees actively screen for automated boilerplate using pattern detectors.
            This tool provides structure, reflection prompts, and quality checklists so <strong>you write your own authentic story</strong>.
          </p>
        </div>
      </div>

      {/* 3. 6-Section Structural Outline with Scratchpads */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              SOP Structural Framework (6 Core Sections)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft your outline notes in the local scratchpad (max 500 chars per block). Notes are stored locally in your browser.
            </p>
          </div>

          <button
            onClick={copyAllDrafts}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors self-start sm:self-center"
          >
            {copiedAll ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiedAll ? 'All Notes Copied' : 'Export All Notes'}</span>
          </button>
        </div>

        <div className="space-y-4">
          {LETTER_SECTIONS.map((sec) => {
            const isExpanded = expandedSection === sec.id;
            const draftText = drafts[sec.id] || '';
            const charCount = draftText.length;

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
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
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

                {/* Expanded Details & Scratchpad */}
                {isExpanded && (
                  <div className="px-5 pb-6 sm:px-6 sm:pb-8 pt-2 border-t border-slate-100 space-y-6">
                    {/* Guiding Prompts */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                        <HelpCircle className="w-4 h-4" />
                        Guiding Reflection Questions
                      </span>
                      <ul className="space-y-2 text-xs text-slate-700 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                        {sec.prompts.map((p, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="text-indigo-600 font-extrabold mt-0.5">&bull;</span>
                            <span className="leading-relaxed font-medium">{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* What to Include vs What to Avoid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-2">
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

                      <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200 space-y-2">
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
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
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
                        placeholder={`Draft your key points for ${sec.title.toLowerCase()} here...`}
                        maxLength={500}
                        rows={4}
                        className="w-full p-4 rounded-2xl border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-sans"
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

      {/* 4. Pre-Submission Quality Checklist (8-Point) */}
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
                {completedCount} of {totalCount}
              </span>
              <span className="text-xs text-slate-500"> checks passed</span>
            </div>
            <div className="w-20 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
          {[
            {
              key: 'wordLimit',
              title: 'Word Count Verification',
              desc: 'Draft is within prescribed range (typically 500 – 1,000 words, or maximum 2 pages).',
            },
            {
              key: 'correctUnivName',
              title: 'Institutional Accuracy',
              desc: 'Target university, department, and degree title verified (zero accidental copy-paste mixups).',
            },
            {
              key: 'specificModules',
              title: 'Curriculum Grounding',
              desc: 'Cites at least 2 specific advanced coursework modules or seminar topics by name.',
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
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
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

      {/* 5. Sending & Formatting Guidelines */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-indigo-600" />
          Submission & Portal Formatting Guidelines
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-600 pt-2">
          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="font-bold text-slate-900 block">PDF Export Hygiene</span>
            <p className="leading-relaxed">
              Always export directly to PDF from Microsoft Word or Google Docs. Ensure PDF text remains selectable (never submit scanned images of text). File size must stay under 5 MB for uni-assist and direct portals.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="font-bold text-slate-900 block">Referee Timeline Coordination</span>
            <p className="leading-relaxed">
              Share your completed SOP outline with your academic and professional referees at least 3 weeks before application deadlines so their recommendation letters corroborate your stated trajectory.
            </p>
          </div>

          <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="font-bold text-slate-900 block">Submission Timing</span>
            <p className="leading-relaxed">
              Submit at least 7–10 days before the official deadline. European portals (e.g. uni-assist, PAC) experience heavy traffic surges in the final 48 hours, which can delay payment processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LetterHelperPage;
