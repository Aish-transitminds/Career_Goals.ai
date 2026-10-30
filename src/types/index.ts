/**
 * AbroadPath AI - Core Domain Types and Data Contracts
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1, R2, R4) & PROJECT.md
 */

// ==========================================
// 1. Catalog Domain Types (Public Firestore)
// ==========================================

export interface UniversityRequirements {
  /** GMAT required flag: true if required, false if explicitly waived/not required, null if unconfirmed */
  gmat_required: boolean | null;
  /** GRE required flag: true if required, false if explicitly waived/not required, null if unconfirmed */
  gre_required: boolean | null;
  /** Minimum IELTS academic overall score (e.g. 6.5, 7.0), or null if unstated */
  min_ielts: number | null;
  /** Minimum TOEFL iBT score (e.g. 88, 100), or null if unstated */
  min_toefl: number | null;
  /** Minimum GRE quantitative/total score threshold if specified, or null */
  min_gre?: number | null;
  /** Minimum GMAT total score threshold if specified, or null */
  min_gmat?: number | null;
  /** Text description of language requirements or CEFR level (e.g. "CEFR C1", "B2") */
  language_requirement: string | null;
  /** Detailed text description of tuition fee schedule */
  tuition_fee: string | null;
  /** Official application submission deadline (e.g. "May 31 (Winter)") */
  application_deadline: string | null;
  /** Detailed admission guidelines, prerequisites, or ECTS distribution */
  notes: string | null;
}

export interface University {
  /** Unique slug identifier, e.g. "tum_informatics", "rwth_cs" */
  id: string;
  /** Foreign key pointing to countries/{id}, e.g. "germany", "ireland", "uk" */
  countryId: string;
  /** Full institutional name, e.g. "Technical University of Munich (TUM)" */
  name: string;
  /** Degree and discipline name, e.g. "M.Sc. Informatics" */
  program: string;
  /** Standardized requirements map */
  requirements: UniversityRequirements;
  /** Formatted concise tuition string for summary cards, e.g. "€6,000 / semester (Non-EU)" */
  tuition: string;
  /** Direct link to the institution's official online application portal */
  portalUrl: string;
  photoUrl?: string;
  /** Source webpage link used to verify requirements */
  sourceUrl: string;
  /** ISO 8601 date string when requirements were last verified (YYYY-MM-DD) */
  lastChecked: string;
  /** ISO 8601 date string when admission rules last changed */
  lastChanged?: string | null;
  /** Boolean flag indicating if requirements have shifted */
  ruleChanged: boolean;
  /** List of field names that were updated during the last change detection */
  changedFields?: string[];
  /** Snapshot of previous values before the detected change */
  previousValues?: Partial<UniversityRequirements>;
  /** Pipeline flag indicating if the last scraping/extraction run failed */
  extractionFailed?: boolean;
  /** Flag identifying demonstration seeded records showing rule changes */
  demoSeeded?: boolean;
  /** Verification disclaimer */
  verificationNote?: string;
  /** Programme-specific Statement of Purpose / Motivation Letter requirements */
  statementRequirements?: StatementRequirements | null;
}

export type StatementVerificationStatus =
  | 'Verified'
  | 'Needs review'
  | 'Stale'
  | 'Unknown'
  | 'Conflicting';

export type StatementDocumentType =
  | 'Statement of Purpose'
  | 'Motivation Letter'
  | 'Personal Statement'
  | 'Research Proposal'
  | 'Academic Essay'
  | 'Not required'
  | 'Not confirmed';

export interface ProgrammeQuestion {
  id: string;
  question: string;
  required?: boolean;
  wordLimit?: string | null;
  guidance?: string | null;
}

export interface StatementRequirements {
  /** Document type requested by the programme */
  documentType: StatementDocumentType | string | null;
  /** Whether this document is mandatory, optional, or unconfirmed */
  required: boolean | null;
  /** Summary of official statement requirements */
  summary?: string | null;
  /** Word, character, or page limits and any conditions */
  lengthLimit?: string | null;
  /** Submission method (e.g. portal upload, uni-assist) */
  submissionMethod?: string | null;
  /** Formatting and file specifications (e.g. PDF, margins, font) */
  formattingRequirements?: string | null;
  /** Programme-specific questions or prompts (if prescribed instead of generic) */
  specificQuestions?: ProgrammeQuestion[] | null;
  /** Department assessment criteria */
  assessmentCriteria?: string[] | null;
  /** Institutional / department AI-use or disclosure policy */
  aiPolicy?: string | null;
  /** General university guidance / writing advice (distinct from programme rules) */
  generalGuidance?: string | null;
  /** Verification status of these requirements */
  status: StatementVerificationStatus;
  /** Authoritative source link for statement requirements */
  sourceUrl?: string | null;
  /** Date when statement requirements were last checked (YYYY-MM-DD) */
  lastChecked?: string | null;
  /** Date when requirements were verified by an advisor/source */
  verifiedDate?: string | null;
  /** Status notes or disclaimer (e.g. conflicting requirements detected, stale notes) */
  statusNotes?: string | null;
}

export interface Country {
  /** Unique country identifier: "germany" | "ireland" | "uk" */
  id: string;
  /** Formal country name */
  name: string;
  /** Overview of language requirements and medium of instruction */
  languageNote: string;
  /** Standard checklist of required visa and admission documents */
  documents: string[];
  /** Summary of visa regulations, blocked accounts, and work rights */
  visaNote: string;
  /** Summary cost range for tuition and living expenses */
  costRange: string;
  /** Authoritative national education portal URL (e.g. DAAD, Education in Ireland) */
  portalUrl: string;
  /** Source URL from which country information was verified */
  sourceUrl: string;
  /** ISO 8601 verification date (YYYY-MM-DD) */
  lastChecked: string;
  /** Flag if national immigration/admission rules have changed */
  ruleChanged?: boolean;
  /** Verification disclaimer */
  verificationNote?: string;
}

// ==========================================
// 2. User & Application Domain Types
// ==========================================

export interface UserExams {
  /** GRE score between 260 and 340, or null if not taken */
  gre: number | null;
  /** GMAT score between 200 and 800, or null if not taken */
  gmat: number | null;
  /** TOEFL iBT score between 0 and 120, or null if not taken */
  toefl: number | null;
  /** IELTS academic score between 0.0 and 9.0 (step 0.5), or null if not taken */
  ielts: number | null;
  /** PTE Academic score between 10 and 90, or null if not taken */
  pte?: number | null;
}

export type GradingScale = '10.0' | '4.0' | '100%' | 'other';
export type DegreeLevel = "Bachelor's" | "Master's" | 'PhD / Doctorate' | 'Diploma / Certificate' | 'Other';
export type BudgetPeriod = 'annual' | 'total';
export type BudgetCoverage = 'tuition_only' | 'total_cost';
export type EnglishTestType = 'IELTS' | 'TOEFL' | 'PTE' | 'None';

export interface UserProfile {
  /** Firebase Auth UID */
  uid: string;
  /** Student display name (max 100 characters) */
  name: string;
  /** Optional contact email */
  email?: string;
  /** Flag indicating whether the student has completed any standardized exams */
  examsTaken: boolean;
  /** Test score profile */
  exams: UserExams;
  /** Array of target country IDs (e.g. ["germany", "ireland", "uk"]) */
  targetCountries: string[];
  /** Maximum annual budget in EUR/USD, or null if unstated/no preference */
  budget: number | null;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 last update timestamp */
  updatedAt?: string;

  // --- A. Academic Background (Optional for backward compatibility) ---
  /** Highest completed or current qualification (e.g. "Bachelor's Degree", "Master's Degree") */
  qualification?: string | null;
  /** Degree title (e.g. "B.Tech", "B.A.", "B.Sc.") */
  degreeTitle?: string | null;
  /** Major or field of study for prior qualification (e.g. "Computer Science", "Fashion Design") */
  fieldOfStudy?: string | null;
  /** Previous academic institution attended */
  institution?: string | null;
  /** Academic grade or GPA score without scaling */
  gpa?: number | null;
  /** Explicit grading scale applied to the gpa score */
  gpaScale?: GradingScale | string | null;
  /** Graduation year or expected graduation year */
  graduationYear?: number | null;

  // --- B. Intended Studies (Optional for backward compatibility) ---
  /** Intended degree level (e.g. "Master's", "Bachelor's", "PhD / Doctorate") */
  intendedDegreeLevel?: DegreeLevel | string | null;
  /** Intended subject or broad field of study (e.g. "Computer Science & Informatics", "Fashion Design & Textile Arts") */
  intendedSubject?: string | null;
  /** Specific sub-specialisation */
  specialisation?: string | null;
  /** Target intake year (e.g. "2025", "2026", "2027") */
  targetIntakeYear?: string | null;
  /** Target intake semester (e.g. "Fall / Winter", "Spring / Summer") */
  targetIntakeSemester?: string | null;
  /** Optional preselected target programme ID from catalogue */
  targetProgramId?: string | null;

  // --- C. English Proficiency Details ---
  /** Whether the student has taken a standardized English proficiency test */
  englishTestTaken?: boolean | null;
  /** Test type taken: 'IELTS' | 'TOEFL' | 'PTE' | 'None' */
  englishTestType?: EnglishTestType | string | null;
  /** Numerical score obtained on the English test */
  englishTestScore?: number | null;
  /** Date the English test was taken (YYYY-MM or YYYY-MM-DD) */
  englishTestDate?: string | null;

  // --- D. Other Admission Tests Details ---
  /** Whether the student has taken any other standardized admission test (GRE / GMAT) */
  otherTestsTaken?: boolean | null;

  // --- E. Preferences and Budget Details ---
  /** Budget timeframe: annual vs total programme duration */
  budgetPeriod?: BudgetPeriod | null;
  /** Budget coverage: tuition only vs total study and living costs */
  budgetCovers?: BudgetCoverage | null;
  /** Whether student prefers programmes with scholarship/funding opportunities */
  scholarshipPreference?: boolean | null;
}

export type ApplicationStatus = 'planned' | 'applied' | 'accepted' | 'rejected';

export interface Application {
  /** Document ID: auto-generated or composite */
  id: string;
  /** Foreign key pointing to universities/{id} */
  universityId: string;
  /** Current admission pipeline status */
  status: ApplicationStatus;
  /** ISO 8601 timestamp when status transitioned to 'applied', or null */
  appliedAt: string | null;
  /** ISO 8601 timestamp of last status modification */
  updatedAt: string;
  /** Optional student notes (max 500 characters) */
  notes?: string | null;
}

export interface InAppNotification {
  /** Document ID: auto-generated or deterministic, e.g. "notif_{appId}_day1" */
  id: string;
  /** In-app notification text (max 500 characters) */
  message: string;
  /** ISO 8601 timestamp when the notification record was generated */
  createdAt: string;
  /** Read acknowledgement flag */
  read: boolean;
  /** Foreign key pointing to users/{uid}/applications/{id} */
  applicationId: string;
  /** Scheduled trigger timestamp (appliedAt + 1, 3, or 7 days) */
  dueAt: string;
  /** Milestone interval in days */
  dayInterval?: 1 | 3 | 7;
}

/** Convenience alias for InAppNotification */
export type Notification = InAppNotification;

// ==========================================
// 3. Match Engine Domain Types
// ==========================================

export type FitCategory = 'Strong fit' | 'Possible' | 'Reach' | 'Prep needed';

export type RequirementEvaluation = 'MET' | 'NEAR' | 'BELOW' | 'NOT_REQUIRED' | 'UNCONFIRMED';

export interface MatchResult {
  /** Matched university entity */
  university: University;
  /** Fit category determined by match score or exam status */
  fitCategory: FitCategory;
  /** Calculated composite score between 0.0 and 1.0 (or -1 for 'Prep needed') */
  fitScore: number;
  /** List of standardized tests required by this university but missing in user profile */
  missingExams: string[];
  /** Requirements fully satisfied by the applicant */
  metRequirements: string[];
  /** Requirements within near-miss threshold */
  nearRequirements: string[];
  /** Requirements where applicant score is below the cutoff */
  belowRequirements: string[];
  /** Requirements where university data is null ("not confirmed") */
  unconfirmedRequirements: string[];
  /** True if university has ruleChanged == true */
  ruleChanged: boolean;
}

export interface MatchConfig {
  THRESHOLDS: {
    STRONG_FIT: number; // default 0.90
    POSSIBLE: number;   // default 0.60
    REACH: number;      // default 0.00
  };
  NEAR_MARGINS: {
    IELTS: number;      // default 0.5
    TOEFL: number;      // default 5.0
    GRE: number;        // default 5.0
    GMAT: number;       // default 20.0
  };
  BONUSES: {
    TARGET_COUNTRY: number; // default 0.10
    BUDGET_FIT: number;     // default 0.05
  };
}
