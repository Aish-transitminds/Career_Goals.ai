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

  // --- Extended requirement fields (backward-compatible, all optional) ---

  /** Minimum CGPA/GPA required for admission, or null if unstated */
  min_gpa?: number | null;
  /** Grading scale the min_gpa is expressed on (e.g. "4.0", "10.0", "100%"), or null */
  gpa_scale?: string | null;
  /** Minimum percentage required (used when grading scale is percentage-based), or null */
  min_percentage?: number | null;
  /** SAT required flag: true if required, false if explicitly waived, null if unconfirmed */
  sat_required?: boolean | null;
  /** Minimum SAT total score threshold if specified, or null */
  min_sat?: number | null;
  /** Minimum IELTS individual band score (e.g. 6.0), or null if no per-band requirement */
  ielts_min_band?: number | null;
  /** Minimum IELTS writing band score if specified separately, or null */
  ielts_min_writing?: number | null;
  /** Minimum IELTS reading band score if specified separately, or null */
  ielts_min_reading?: number | null;
  /** Minimum IELTS speaking band score if specified separately, or null */
  ielts_min_speaking?: number | null;
  /** Minimum IELTS listening band score if specified separately, or null */
  ielts_min_listening?: number | null;
  /** Whether a portfolio is required (true/false/null unconfirmed) — relevant for arts/design */
  portfolio_required?: boolean | null;
  /** Whether an audition is required (true/false/null unconfirmed) — relevant for performing arts */
  audition_required?: boolean | null;
  /** Minimum months/years of work experience required, or null if not required */
  work_experience_required?: string | null;
  /** Prerequisite subjects or coursework (free text), or null */
  prerequisite_subjects?: string | null;
  /** Conditional requirements text (e.g. "Conditional offer if IELTS 6.5 + foundation course"), or null */
  conditional_requirements?: string | null;

  // --- Fee breakdown fields (backward-compatible, all optional) ---

  /** Annual tuition fee as a numeric value in source currency, or null if unstated */
  annual_tuition_amount?: number | null;
  /** Total program tuition as a numeric value in source currency, or null if unstated */
  total_program_tuition_amount?: number | null;
  /** ISO 4217 currency code for fee amounts (e.g. "EUR", "GBP", "USD"), or null */
  fee_currency?: string | null;
  /** Academic year the fees apply to (e.g. "2025-2026"), or null */
  fee_academic_year?: string | null;
  /** Estimated annual accommodation cost in source currency, or null */
  accommodation_cost?: number | null;
  /** Estimated annual food/living cost in source currency, or null */
  food_cost?: number | null;
  /** Estimated annual transportation cost in source currency, or null */
  transportation_cost?: number | null;
  /** Estimated annual insurance cost in source currency, or null */
  insurance_cost?: number | null;
  /** Estimated visa/residence permit cost in source currency, or null */
  visa_cost?: number | null;
  /** Application fee in source currency, or null */
  application_fee?: number | null;
  /** Other mandatory expenses description and amount, or null */
  other_mandatory_expenses?: string | null;
  /** Whether fee information has been verified against official sources */
  fees_verified?: boolean | null;
  /** Scholarship or funding information text, or null */
  scholarship_info?: string | null;
  /** URL to the official scholarship/funding page, or null */
  scholarship_url?: string | null;
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
  /** Primary subject label retained for backward compatibility */
  field?: string;
  /** Subject labels used for multi-field matching */
  fields?: string[];
  /** Standardized requirements map */
  requirements: UniversityRequirements;
  /** Formatted concise tuition string for summary cards, e.g. "€6,000 / semester (Non-EU)" */
  tuition: string;
  /** Direct link to the institution's official online application portal */
  portalUrl: string;
  photoUrl?: string;
  photoCredit?: string;
  photoLicense?: string;
  photoSourceUrl?: string;
  photoLicenseUrl?: string;
  /** Source webpage link used to verify requirements */
  sourceUrl: string;
  /** ISO 8601 date string when requirements were last verified (YYYY-MM-DD) */
  lastChecked?: string;
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

  // --- Verification metadata (backward-compatible, all optional) ---

  /** Institution verification status: whether the institution genuinely exists and is recognized */
  institutionVerificationStatus?: VerificationStatus;
  /** Accreditation status of the institution */
  accreditationStatus?: VerificationStatus;
  /** Name of the accrediting body or authority, or null */
  accreditationBody?: string | null;
  /** Program verification status: whether the specific program exists and is offered */
  programVerificationStatus?: VerificationStatus;
  /** Admission requirement verification status */
  admissionRequirementVerificationStatus?: VerificationStatus;
  /** Image verification status: whether the campus image is confirmed authentic */
  imageVerificationStatus?: ImageVerificationStatus;
  /** Official website verification status */
  websiteVerificationStatus?: LinkVerificationStatus;
  /** Status of the homepage URL */
  homepageStatus?: LinkVerificationStatus;
  /** Status of the official program page URL */
  programPageStatus?: LinkVerificationStatus;
  /** Status of the admission requirements page URL */
  admissionPageStatus?: LinkVerificationStatus;
  /** Status of the tuition fee page URL */
  tuitionPageStatus?: LinkVerificationStatus;
  /** Status of the scholarship page URL */
  scholarshipPageStatus?: LinkVerificationStatus;
  /** Status of the application page URL */
  applicationPageStatus?: LinkVerificationStatus;
  /** Additional source URLs consulted during verification */
  additionalSourceUrls?: string[];
  /** Data freshness status derived from lastChecked date */
  dataFreshnessStatus?: DataFreshnessStatus;
  /** Whether this record has been flagged for manual review */
  flaggedForReview?: boolean;
  /** Reason for flagging (if flaggedForReview is true) */
  reviewReason?: string | null;
}

/** Institution/program/accreditation verification status */
export type VerificationStatus = 'verified' | 'unverified' | 'flagged' | 'partially_verified';

/** Image verification status */
export type ImageVerificationStatus =
  | 'verified_authentic'
  | 'unverified'
  | 'broken'
  | 'duplicate'
  | 'misleading'
  | 'placeholder';

/** Official link verification status */
export type LinkVerificationStatus =
  | 'verified_official'
  | 'redirected_verified'
  | 'broken'
  | 'unverified'
  | 'outdated';

/** Data freshness status derived from lastChecked date */
export type DataFreshnessStatus = 'fresh' | 'stale' | 'outdated' | 'never_verified';

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

  // --- Extended exam fields (backward-compatible, all optional) ---

  /** SAT total score between 400 and 1600, or null if not taken */
  sat?: number | null;
  /** IELTS individual reading band score (0.0–9.0), or null if not reported */
  ieltsReading?: number | null;
  /** IELTS individual writing band score (0.0–9.0), or null if not reported */
  ieltsWriting?: number | null;
  /** IELTS individual speaking band score (0.0–9.0), or null if not reported */
  ieltsSpeaking?: number | null;
  /** IELTS individual listening band score (0.0–9.0), or null if not reported */
  ieltsListening?: number | null;
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

  // --- F. Additional Profile Fields (backward-compatible, all optional) ---

  /** Months of relevant work experience, or null if not provided */
  workExperienceMonths?: number | null;
  /** Description of relevant work experience, or null */
  workExperienceDescription?: string | null;
  /** Summary of academic projects, or null */
  academicProjects?: string | null;
  /** URL to the student's online portfolio, or null */
  portfolioUrl?: string | null;
  /** Whether the student has a portfolio prepared, or null */
  hasPortfolio?: boolean | null;
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

// ==========================================
// 4. Eligibility Comparison Domain Types
// ==========================================

/** Eligibility status for a single requirement comparison */
export type EligibilityStatus =
  | 'Meets Requirement'
  | 'Exceeds Requirement'
  | 'Below Requirement'
  | 'Not Required'
  | 'Not Verified'
  | 'Conditional Requirement';

/** Fit category with the enhanced naming convention */
export type EnhancedFitCategory =
  | 'Strong Match'
  | 'Moderate Match'
  | 'Ambitious Match'
  | 'Not Eligible';

/** A single row in the structured eligibility comparison table */
export interface RequirementComparisonRow {
  /** Parameter name (e.g. "CGPA", "IELTS", "TOEFL", "GRE", "GMAT", "SAT") */
  parameter: string;
  /** The student's actual score/value, or null if not provided */
  studentScore: string | null;
  /** The university's required score/value, or null if not confirmed */
  universityRequirement: string | null;
  /** Eligibility status for this requirement */
  status: EligibilityStatus;
  /** Numeric gap if calculable (student - required), or null */
  gap: number | null;
  /** Human-readable gap description (e.g. "0.5 bands below"), or null */
  gapDescription: string | null;
  /** Additional note or explanation */
  note: string | null;
  /** Whether this is a hard requirement or a competitive/preferred threshold */
  requirementType: 'minimum' | 'competitive' | 'informational';
}

/** Full structured comparison for a university against a student profile */
export interface EligibilityComparison {
  /** The university being compared */
  universityId: string;
  /** Comparison rows for each requirement parameter */
  rows: RequirementComparisonRow[];
  /** Overall eligibility assessment */
  overallEligibility: 'eligible' | 'potentially_eligible' | 'insufficient_info' | 'not_eligible';
  /** Human-readable summary of the comparison */
  summary: string;
  /** Whether the comparison contains any verified data */
  hasVerifiedData: boolean;
  /** Source URL where requirements were verified */
  sourceUrl: string | null;
  /** Date when requirements were last verified */
  lastChecked: string | null;
}

/** Match explanation providing the "why recommended" reasoning */
export interface MatchExplanation {
  /** Primary reason for the match category */
  primaryReason: string;
  /** Specific factors that contributed positively */
  strengths: string[];
  /** Specific gaps or areas of concern */
  concerns: string[];
  /** Requirements that are not verified */
  unverified: string[];
  /** Whether admission probability can be reliably estimated */
  canEstimateProbability: boolean;
  /** Disclaimer about admission guarantees */
  disclaimer: string;
}
