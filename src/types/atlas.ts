/**
 * Atlas AI Architecture v2 - Core Types and Schemas
 * Retrieve-first, fact-keyed admissions guide with tool calling and validation.
 */

/** Valid fact keys that Gemini can cite in structured blocks */
export type AtlasFactKey =
  | `requirements.${string}`
  | `program.${string}`
  | `country.${string}`
  | `tuition`
  | `portalUrl`
  | `sourceUrl`
  | `evaluation.${string}`
  | `calc.emi.${string}`
  | `calc.timeline.${string}`
  | `profile.${string}`
  | `general.scope`
  | `general.unverified`;

export interface AtlasBlock {
  /** The natural language claim or statement */
  text: string;
  /**
   * The explicit fact key grounding this claim.
   * Examples: "requirements.min_ielts", "requirements.application_deadline",
   * "tuition", "evaluation.ielts", "calc.emi.monthly"
   */
  factKey: AtlasFactKey | string;
  /** Attached by validator: verified source URL */
  sourceUrl?: string;
  /** Attached by validator: authoritative source name */
  sourceName?: string;
  /** Attached by validator: verification date */
  lastChecked?: string;
  /** Attached by validator: whether the fact was verified */
  verified?: boolean;
}

export interface AtlasAction {
  id: 'add_to_tracker' | 'compare' | 'build_timeline' | 'recheck_flag';
  label: string;
  payload?: Record<string, any>;
}

export interface AtlasStructuredResponse {
  /** Short direct 1-2 sentence answer */
  directAnswer?: string;
  /** Grounded claims referencing factKeys */
  blocks: AtlasBlock[];
  /** Labeled detail rows (Entry, Deadline, Fees, etc.) */
  details?: Array<{ label: string; value: string; factKey?: string }>;
  /** 2-3 suggested follow-up questions */
  followUps: string[];
  /** Interactive action buttons inside the answer */
  actions?: AtlasAction[];
  /** Overall primary source info */
  primarySource?: {
    name: string;
    url: string;
    lastChecked?: string;
  };
  /** Whether the answer utilized the student's profile */
  usedProfile?: boolean;
  /** If the topic was out of scope or unverified */
  status?: 'verified' | 'unverified' | 'out_of_scope' | 'refused_dishonest';
}

/** Function tool definitions for Gemini function calling */
export interface SearchProgramsParams {
  country?: 'germany' | 'ireland' | 'uk';
  degree?: string;
  budgetMaxEur?: number;
}

export interface CompareProgramsParams {
  programIds: string[];
}

export interface CalcEMIParams {
  loanAmountInr: number;
  annualInterestRatePercent?: number; // default ~10.5%
  tenureYears?: number; // default 7
}

export interface BuildTimelineParams {
  targetDeadline: string; // ISO date or description
  intakeStartDate?: string;
}

export interface RequirementEvaluationResult {
  programId: string;
  ielts: { required: number | null; user: number | null; met: boolean | null; note: string };
  toefl: { required: number | null; user: number | null; met: boolean | null; note: string };
  gre: { required: boolean | null; user: number | null; met: boolean | null; note: string };
  gmat: { required: boolean | null; user: number | null; met: boolean | null; note: string };
  gpa: { user: number | null; scale: string | null; note: string };
  overallSummary: string;
}
