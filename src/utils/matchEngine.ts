/**
 * AbroadPath AI - Deterministic University Match Engine
 * File: src/utils/matchEngine.ts
 * Authoritative Reference: ORIGINAL_REQUEST.md (§Matching Logic) & PROJECT.md
 */

import {
  UserProfile,
  University,
  MatchResult,
  FitCategory,
  MatchConfig,
} from '../types';

/** Default match thresholds, margins, and bonuses */
export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  THRESHOLDS: {
    STRONG_FIT: 0.90,
    POSSIBLE: 0.60,
    REACH: 0.00,
  },
  NEAR_MARGINS: {
    IELTS: 0.5,
    TOEFL: 5.0,
    GRE: 5.0,
    GMAT: 20.0,
  },
  BONUSES: {
    TARGET_COUNTRY: 0.10,
    BUDGET_FIT: 0.05,
  },
};

export function isDemonstrationRuleChange(university: University): boolean {
  if (university.demoSeeded) return true;

  return (
    university.id === 'tum_informatics' &&
    university.ruleChanged &&
    university.changedFields?.includes('gmat_required') === true &&
    university.previousValues?.gmat_required === null
  );
}

/**
 * Parses university tuition string to annual cost in EUR/USD/GBP.
 * Handles formats:
 * - "€0 (Tuition-free)" -> 0
 * - "€1,500 / semester (Non-EU)" -> 3000
 * - "€6,000 / semester (Non-EU)" -> 12000
 * - "€27,500 / year (Non-EU)" -> 27500
 * - "£46,000 / year (Overseas)" -> 46000
 */
export function parseAnnualTuition(tuitionStr: string | null | undefined): number | null {
  if (!tuitionStr) return null;
  const lower = tuitionStr.toLowerCase();

  // 1. Tuition-free detection
  if (
    lower.includes('free') ||
    lower.includes('€0') ||
    lower.includes('$0') ||
    lower.includes('£0')
  ) {
    return 0;
  }

  // 2. Extract first numeric sequence with commas/periods
  const match = tuitionStr.match(/[€$£]?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+)/);
  if (!match) return null;

  const rawNumber = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(rawNumber)) return null;

  // 3. Multiplier for semester vs year
  if (lower.includes('/ semester') || lower.includes('per semester')) {
    return rawNumber * 2;
  }

  return rawNumber;
}

/**
 * Evaluates whether student has taken any exams
 */
export function hasTakenAnyExam(profile: UserProfile): boolean {
  if (profile.examsTaken === false) return false;
  const { gre, gmat, toefl, ielts } = profile.exams || {};
  return gre !== null || gmat !== null || toefl !== null || ielts !== null;
}

/**
 * Builds list of required exams for a university (for Prep needed state)
 */
export function buildMissingExamsList(univ: University): string[] {
  const missing: string[] = [];
  const req = univ.requirements;

  // English requirement
  if (req.min_ielts !== null && req.min_toefl !== null) {
    missing.push(`IELTS (min ${req.min_ielts}) or TOEFL (min ${req.min_toefl})`);
  } else if (req.min_ielts !== null) {
    missing.push(`IELTS (min ${req.min_ielts})`);
  } else if (req.min_toefl !== null) {
    missing.push(`TOEFL (min ${req.min_toefl})`);
  }

  // GRE requirement
  if (req.gre_required === true) {
    missing.push(req.min_gre ? `GRE (min ${req.min_gre})` : 'GRE');
  }

  // GMAT requirement
  if (req.gmat_required === true) {
    missing.push(req.min_gmat ? `GMAT (min ${req.min_gmat})` : 'GMAT');
  }

  return missing;
}

/**
 * Evaluates match for a single university against a user profile
 */
export function matchUniversity(
  profile: UserProfile,
  university: University,
  customConfig?: Partial<MatchConfig>
): MatchResult {
  const config: MatchConfig = {
    THRESHOLDS: { ...DEFAULT_MATCH_CONFIG.THRESHOLDS, ...customConfig?.THRESHOLDS },
    NEAR_MARGINS: { ...DEFAULT_MATCH_CONFIG.NEAR_MARGINS, ...customConfig?.NEAR_MARGINS },
    BONUSES: { ...DEFAULT_MATCH_CONFIG.BONUSES, ...customConfig?.BONUSES },
  };

  const req = university.requirements;
  const ruleChanged = Boolean(university.ruleChanged);

  // 1. Unconfirmed requirements (where university value is null)
  const unconfirmedRequirements: string[] = [];
  if (req.min_ielts === null && req.min_toefl === null) {
    unconfirmedRequirements.push('English (IELTS/TOEFL)');
  } else {
    if (req.min_ielts === null) unconfirmedRequirements.push('IELTS');
    if (req.min_toefl === null) unconfirmedRequirements.push('TOEFL');
  }
  if (req.gre_required === null) unconfirmedRequirements.push('GRE');
  if (req.gmat_required === null) unconfirmedRequirements.push('GMAT');

  // 2. Check "Prep needed" state
  if (!hasTakenAnyExam(profile)) {
    return {
      university,
      fitCategory: 'Prep needed',
      fitScore: -1,
      missingExams: buildMissingExamsList(university),
      metRequirements: [],
      nearRequirements: [],
      belowRequirements: [],
      unconfirmedRequirements,
      ruleChanged,
    };
  }

  // 3. Evaluate criteria
  let pointsEarned = 0;
  let knownRequirementsCount = 0;

  const metRequirements: string[] = [];
  const nearRequirements: string[] = [];
  const belowRequirements: string[] = [];
  const missingExams: string[] = [];

  const exams = profile.exams || { gre: null, gmat: null, toefl: null, ielts: null };

  // --- A. English Language Proficiency (IELTS & TOEFL Equivalence) ---
  const hasIeltsReq = req.min_ielts !== null;
  const hasToeflReq = req.min_toefl !== null;

  if (hasIeltsReq || hasToeflReq) {
    knownRequirementsCount += 1;

    let ieltsPoints = -1;
    let toeflPoints = -1;

    if (hasIeltsReq && exams.ielts !== null) {
      const diff = exams.ielts - req.min_ielts!;
      if (diff >= 0) ieltsPoints = 1.0;
      else if (diff >= -config.NEAR_MARGINS.IELTS) ieltsPoints = 0.5;
      else ieltsPoints = 0.0;
    }

    if (hasToeflReq && exams.toefl !== null) {
      const diff = exams.toefl - req.min_toefl!;
      if (diff >= 0) toeflPoints = 1.0;
      else if (diff >= -config.NEAR_MARGINS.TOEFL) toeflPoints = 0.5;
      else toeflPoints = 0.0;
    }

    const bestEnglishPoints = Math.max(ieltsPoints, toeflPoints);

    if (bestEnglishPoints === 1.0) {
      pointsEarned += 1.0;
      if (ieltsPoints === 1.0) {
        metRequirements.push(`IELTS (Met: ${exams.ielts} >= ${req.min_ielts})`);
      } else {
        metRequirements.push(`TOEFL (Met: ${exams.toefl} >= ${req.min_toefl})`);
      }
    } else if (bestEnglishPoints === 0.5) {
      pointsEarned += 0.5;
      if (ieltsPoints === 0.5) {
        nearRequirements.push(`IELTS (Near: ${exams.ielts} / req ${req.min_ielts})`);
      } else {
        nearRequirements.push(`TOEFL (Near: ${exams.toefl} / req ${req.min_toefl})`);
      }
    } else {
      pointsEarned += 0.0;
      if (exams.ielts === null && exams.toefl === null) {
        belowRequirements.push('English Proficiency (Not taken)');
        missingExams.push(
          hasIeltsReq && hasToeflReq ? 'IELTS or TOEFL' : hasIeltsReq ? 'IELTS' : 'TOEFL'
        );
      } else {
        belowRequirements.push('English Proficiency (Below requirement)');
      }
    }
  }

  // --- B. GRE Requirement ---
  if (req.gre_required === true) {
    knownRequirementsCount += 1;
    if (exams.gre !== null) {
      if (req.min_gre !== null && req.min_gre !== undefined) {
        const diff = exams.gre - req.min_gre;
        if (diff >= 0) {
          pointsEarned += 1.0;
          metRequirements.push(`GRE (Met: ${exams.gre} >= ${req.min_gre})`);
        } else if (diff >= -config.NEAR_MARGINS.GRE) {
          pointsEarned += 0.5;
          nearRequirements.push(`GRE (Near: ${exams.gre} / req ${req.min_gre})`);
        } else {
          pointsEarned += 0.0;
          belowRequirements.push(`GRE (Below: ${exams.gre} < ${req.min_gre})`);
        }
      } else {
        pointsEarned += 1.0;
        metRequirements.push(`GRE (Taken: ${exams.gre})`);
      }
    } else {
      pointsEarned += 0.0;
      belowRequirements.push('GRE (Required but not taken)');
      missingExams.push(req.min_gre ? `GRE (min ${req.min_gre})` : 'GRE');
    }
  }

  // --- C. GMAT Requirement ---
  if (req.gmat_required === true) {
    knownRequirementsCount += 1;
    if (exams.gmat !== null) {
      if (req.min_gmat !== null && req.min_gmat !== undefined) {
        const diff = exams.gmat - req.min_gmat;
        if (diff >= 0) {
          pointsEarned += 1.0;
          metRequirements.push(`GMAT (Met: ${exams.gmat} >= ${req.min_gmat})`);
        } else if (diff >= -config.NEAR_MARGINS.GMAT) {
          pointsEarned += 0.5;
          nearRequirements.push(`GMAT (Near: ${exams.gmat} / req ${req.min_gmat})`);
        } else {
          pointsEarned += 0.0;
          belowRequirements.push(`GMAT (Below: ${exams.gmat} < ${req.min_gmat})`);
        }
      } else {
        pointsEarned += 1.0;
        metRequirements.push(`GMAT (Taken: ${exams.gmat})`);
      }
    } else {
      pointsEarned += 0.0;
      belowRequirements.push('GMAT (Required but not taken)');
      missingExams.push(req.min_gmat ? `GMAT (min ${req.min_gmat})` : 'GMAT');
    }
  }

  // 4. Calculate Base Score
  let baseScore = 0.70; // Fallback neutral baseline score if knownRequirementsCount === 0
  if (knownRequirementsCount > 0) {
    baseScore = pointsEarned / knownRequirementsCount;
  }

  // 5. Calculate Country Preference Bonus (+0.10)
  let countryBonus = 0.0;
  if (profile.targetCountries && profile.targetCountries.length > 0) {
    const isTarget = profile.targetCountries.some(
      (c) => c.trim().toLowerCase() === university.countryId.trim().toLowerCase()
    );
    if (isTarget) {
      countryBonus = config.BONUSES.TARGET_COUNTRY;
    }
  }

  // 6. Calculate Budget Fit Bonus (+0.05)
  let budgetBonus = 0.0;
  const annualTuition = parseAnnualTuition(university.tuition);
  if (profile.budget !== null && profile.budget !== undefined && annualTuition !== null) {
    if (annualTuition <= profile.budget) {
      budgetBonus = config.BONUSES.BUDGET_FIT;
    }
  }

  // 7. Composite Score Calculation with Ceiling Cap
  const rawScore = baseScore + countryBonus + budgetBonus;
  const fitScore = Math.round(Math.min(1.00, Math.max(0.00, rawScore)) * 100) / 100;

  // 8. Categorize Fit Tier
  let fitCategory: FitCategory = 'Reach';
  if (fitScore >= config.THRESHOLDS.STRONG_FIT) {
    fitCategory = 'Strong fit';
  } else if (fitScore >= config.THRESHOLDS.POSSIBLE) {
    fitCategory = 'Possible';
  } else {
    fitCategory = 'Reach';
  }

  return {
    university,
    fitCategory,
    fitScore,
    missingExams,
    metRequirements,
    nearRequirements,
    belowRequirements,
    unconfirmedRequirements,
    ruleChanged,
  };
}

/**
 * Calculates and ranks matches for all universities against a student profile
 */
export function calculateMatches(
  profile: UserProfile,
  universities: University[],
  config?: Partial<MatchConfig>
): MatchResult[] {
  const results = universities.map((u) => matchUniversity(profile, u, config));

  // Deterministic Sorting:
  // 1. fitScore descending (1.00 to 0.00, with -1 'Prep needed' at the bottom)
  // 2. Alphabetical by university name ascending
  return results.sort((a, b) => {
    if (b.fitScore !== a.fitScore) {
      return b.fitScore - a.fitScore;
    }
    return a.university.name.localeCompare(b.university.name);
  });
}
