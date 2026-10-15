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
}

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
  nearRequirements?: string[];
  /** Requirements where applicant score is below the cutoff */
  belowRequirements?: string[];
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
