/**
 * AbroadPath AI - Deterministic University Match & Tier Reranking Engine
 * File: src/utils/matchEngine.ts
 * Authoritative Reference: ORIGINAL_REQUEST.md (§Matching Logic) & Hackathon Tasks 4 & 5
 *
 * ---------------------------------------------------------------------------------
 * Deterministic Percentage Match Formula & Scoring Specification
 * ---------------------------------------------------------------------------------
 * 1. Base Score = (Points Earned across Known Requirements) / (Count of Known Requirements)
 *    - Point values per evaluated requirement:
 *      * 1.0 = Requirement Met (Applicant score >= minimum cutoff, or required exam taken)
 *      * 0.5 = Near-Miss (within near margins: IELTS -0.5, TOEFL -5, GRE -5, GMAT -20)
 *      * 0.0 = Below cutoff or required exam not taken
 *    - Strict Null Policy: Unconfirmed requirements (value === null) are completely excluded
 *      from the denominator so students are never penalized for unconfirmed data.
 *    - If known requirements count === 0: returns neutral 0.70 base score.
 *
 * 2. Bonuses:
 *    - Target Country Preference: +0.10 (if university country matches student preference)
 *    - Budget Fit Bonus: +0.05 (if annual tuition <= student annual budget or tuition-free)
 *
 * 3. Composite Score:
 *    - fitScore = Math.min(1.00, Math.max(0.00, baseScore + countryBonus + budgetBonus))
 *    - Formatted as percentage: fitScore * 100 (e.g. 0.95 -> 95%)
 *
 * 4. Tier Classification:
 *    - Strong Fit: fitScore >= 0.90 (90%+)
 *    - Possible:   fitScore >= 0.60 and < 0.90 (60% to 89%)
 *    - Reach:      fitScore < 0.60 (< 60%)
 *    - Prep Needed: fitScore = -1 (when student has completed zero standardized exams)
 *
 * 5. Deterministic Reranking Within Tiers (Task 5):
 *    - Does NOT alter primary tier classification or eligibility.
 *    - Ranks universities inside the same tier by:
 *      tierRankScore = (BUDGET_FIT * 0.35) + (REQUIREMENT_MARGIN * 0.30)
 *                    + (CONFIRMED_DATA * 0.20) + (DATA_FRESHNESS * 0.15)
 *    - Generates a transparent one-line 'rankReason' for every card.
 * ---------------------------------------------------------------------------------
 */

import {
  UserProfile,
  University,
  MatchResult,
  FitCategory,
  MatchConfig,
  CriterionEvaluation,
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

/**
 * Named constants for secondary deterministic ranking weights inside tiers (Task 5).
 * Sum of weights = 1.00. Strictly deterministic; no LLM involved.
 */
export const TIER_RANK_WEIGHTS = {
  /** Headroom between student annual budget and university tuition (or tuition-free) */
  BUDGET_FIT: 0.35,
  /** Positive margin by which student scores exceed minimum requirements */
  REQUIREMENT_MARGIN: 0.30,
  /** Proportion of confirmed (non-null) official requirements (certainty score) */
  CONFIRMED_DATA: 0.20,
  /** Recency of verified source check */
  DATA_FRESHNESS: 0.15,
};

/**
 * Parses university tuition string to annual cost in EUR/USD/GBP.
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
 * Computes secondary deterministic tier ranking score and reason (Task 5).
 */
export function calculateTierRankScore(
  profile: UserProfile,
  university: University,
  marginScore: number,
  knownRatio: number
): { score: number; reason: string } {
  const annualTuition = parseAnnualTuition(university.tuition);

  // 1. Budget Fit factor [0.0, 1.0]
  let budgetScore = 0.5; // default if no budget preference
  let budgetNote = 'Tuition not confirmed';

  if (annualTuition === 0) {
    budgetScore = 1.0;
    budgetNote = '100% tuition-free program';
  } else if (profile.budget !== null && annualTuition !== null) {
    if (annualTuition <= profile.budget) {
      const headroom = profile.budget - annualTuition;
      budgetScore = Math.min(1.0, 0.7 + (headroom / profile.budget) * 0.3);
      budgetNote = `Comfortably within annual budget (€${annualTuition.toLocaleString()})`;
    } else {
      budgetScore = 0.1;
      budgetNote = `Exceeds current budget (€${annualTuition.toLocaleString()})`;
    }
  } else if (annualTuition !== null) {
    budgetScore = annualTuition <= 5000 ? 0.9 : annualTuition <= 20000 ? 0.6 : 0.3;
    budgetNote = `Estimated annual tuition €${annualTuition.toLocaleString()}`;
  }

  // 2. Requirement Margin factor [0.0, 1.0]
  const clampedMargin = Math.min(1.0, Math.max(0.0, marginScore));

  // 3. Data Freshness factor [0.0, 1.0]
  let freshnessScore = 0.8;
  if (university.lastChecked) {
    const checkedDate = new Date(university.lastChecked).getTime();
    const now = new Date('2026-10-16').getTime();
    const daysOld = Math.max(0, (now - checkedDate) / (1000 * 60 * 60 * 24));
    freshnessScore = Math.max(0.2, 1.0 - (daysOld / 365) * 0.8);
  }

  // 4. Weighted Composite
  const totalRankScore =
    budgetScore * TIER_RANK_WEIGHTS.BUDGET_FIT +
    clampedMargin * TIER_RANK_WEIGHTS.REQUIREMENT_MARGIN +
    knownRatio * TIER_RANK_WEIGHTS.CONFIRMED_DATA +
    freshnessScore * TIER_RANK_WEIGHTS.DATA_FRESHNESS;

  const scoreRounded = Math.round(totalRankScore * 1000) / 1000;

  // 5. Build human-readable transparent reason
  let reason = '';
  if (annualTuition === 0) {
    reason = `Ranked higher because: 100% tuition-free with verified ${Math.round(knownRatio * 100)}% official data certainty.`;
  } else if (clampedMargin >= 0.8 && budgetScore >= 0.7) {
    reason = `Ranked higher because: Strong score margin over cutoffs and ${budgetNote.toLowerCase()}.`;
  } else if (knownRatio === 1.0) {
    reason = `Ranked higher because: 100% confirmed official requirements and recent verification (${university.lastChecked}).`;
  } else if (budgetScore >= 0.8) {
    reason = `Ranked higher because: ${budgetNote} and verified official requirements.`;
  } else {
    reason = `Ranked by budget fit and verified requirement match certainty (${Math.round(knownRatio * 100)}%).`;
  }

  return { score: scoreRounded, reason };
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
  const snippets = req.source_snippets || {};

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

  const criterionBreakdown: CriterionEvaluation[] = [];

  // 2. Check "Prep needed" state (student took zero exams)
  if (!hasTakenAnyExam(profile)) {
    // Populate granular breakdown for transparency even in Prep Needed state
    if (req.min_ielts !== null || req.min_toefl !== null) {
      criterionBreakdown.push({
        id: 'english',
        label: 'English Proficiency',
        status: 'BELOW',
        requiredVal: req.min_ielts ? `IELTS ${req.min_ielts}` : `TOEFL ${req.min_toefl}`,
        actualVal: 'Not taken',
        displayMessage: '❌ English: Exam not taken (Preparation needed)',
        sourceUrl: snippets.min_ielts?.source_url || university.sourceUrl,
        verifiedOn: snippets.min_ielts?.verified_on || university.lastChecked,
        sourceSnippet: snippets.min_ielts?.snippet,
      });
    }
    if (req.gre_required === true) {
      criterionBreakdown.push({
        id: 'gre',
        label: 'GRE',
        status: 'BELOW',
        requiredVal: req.min_gre ? `Min ${req.min_gre}` : 'Required',
        actualVal: 'Not taken',
        displayMessage: `❌ GRE: Required${req.min_gre ? ` (min ${req.min_gre})` : ''} - not taken`,
        sourceUrl: snippets.gre_required?.source_url || university.sourceUrl,
        verifiedOn: snippets.gre_required?.verified_on || university.lastChecked,
        sourceSnippet: snippets.gre_required?.snippet,
      });
    }

    return {
      university,
      fitCategory: 'Prep needed',
      fitScore: -1,
      tierRankScore: -1,
      rankReason: 'Action needed: Take standardized exams (IELTS/TOEFL/GRE) to unlock eligibility scoring.',
      missingExams: buildMissingExamsList(university),
      metRequirements: [],
      nearRequirements: [],
      belowRequirements: [],
      unconfirmedRequirements,
      criterionBreakdown,
      ruleChanged,
    };
  }

  // 3. Evaluate criteria
  let pointsEarned = 0;
  let knownRequirementsCount = 0;
  let totalMarginPoints = 0;

  const metRequirements: string[] = [];
  const nearRequirements: string[] = [];
  const belowRequirements: string[] = [];
  const missingExams: string[] = [];

  const exams = profile.exams || { gre: null, gmat: null, toefl: null, ielts: null };

  // --- A. Undergraduate GPA Evaluation (if university specifies min_gpa) ---
  if (req.min_gpa !== null && req.min_gpa !== undefined) {
    knownRequirementsCount += 1;
    if (profile.gpa !== null && profile.gpa !== undefined) {
      const gpaScale = req.gpa_scale || 4.0;
      const userScale = profile.gpaScale || 4.0;
      // Normalize user GPA to university scale
      const normalizedUserGpa = (profile.gpa / userScale) * gpaScale;

      // In German scale (1.0 best, 5.0 worst), lower number is better
      const isGermanScale = gpaScale === 5.0;
      const gpaMet = isGermanScale
        ? normalizedUserGpa <= req.min_gpa
        : normalizedUserGpa >= req.min_gpa;

      if (gpaMet) {
        pointsEarned += 1.0;
        totalMarginPoints += 1.0;
        metRequirements.push(`GPA (Met: ${profile.gpa}/${userScale} satisfies req ${req.min_gpa})`);
        criterionBreakdown.push({
          id: 'gpa',
          label: 'Undergraduate GPA',
          status: 'MET',
          requiredVal: `${req.min_gpa} / ${gpaScale}`,
          actualVal: `${profile.gpa} / ${userScale}`,
          displayMessage: `✅ GPA Met: ${profile.gpa}/${userScale} (cutoff: ${req.min_gpa})`,
          sourceUrl: university.sourceUrl,
          verifiedOn: university.lastChecked,
          sourceSnippet: req.notes,
        });
      } else {
        pointsEarned += 0.0;
        belowRequirements.push(`GPA (Below: ${profile.gpa}/${userScale} < ${req.min_gpa})`);
        criterionBreakdown.push({
          id: 'gpa',
          label: 'Undergraduate GPA',
          status: 'BELOW',
          requiredVal: `${req.min_gpa} / ${gpaScale}`,
          actualVal: `${profile.gpa} / ${userScale}`,
          displayMessage: `❌ GPA Below: ${profile.gpa}/${userScale} (needs: ${req.min_gpa})`,
          sourceUrl: university.sourceUrl,
          verifiedOn: university.lastChecked,
          sourceSnippet: req.notes,
        });
      }
    } else {
      pointsEarned += 0.0;
      unconfirmedRequirements.push('GPA');
      criterionBreakdown.push({
        id: 'gpa',
        label: 'Undergraduate GPA',
        status: 'UNCONFIRMED',
        requiredVal: `${req.min_gpa}`,
        actualVal: 'Not provided in profile',
        displayMessage: `⚪ GPA: Cutoff ${req.min_gpa} (unconfirmed in profile)`,
        sourceUrl: university.sourceUrl,
        verifiedOn: university.lastChecked,
      });
    }
  }

  // --- B. English Language Proficiency (IELTS & TOEFL Equivalence) ---
  const hasIeltsReq = req.min_ielts !== null;
  const hasToeflReq = req.min_toefl !== null;

  if (hasIeltsReq || hasToeflReq) {
    knownRequirementsCount += 1;

    let ieltsPoints = -1;
    let toeflPoints = -1;
    let ieltsMargin = 0;
    let toeflMargin = 0;

    if (hasIeltsReq && exams.ielts !== null) {
      const diff = exams.ielts - req.min_ielts!;
      ieltsMargin = diff;
      if (diff >= 0) ieltsPoints = 1.0;
      else if (diff >= -config.NEAR_MARGINS.IELTS) ieltsPoints = 0.5;
      else ieltsPoints = 0.0;
    }

    if (hasToeflReq && exams.toefl !== null) {
      const diff = exams.toefl - req.min_toefl!;
      toeflMargin = diff / 10; // scaled
      if (diff >= 0) toeflPoints = 1.0;
      else if (diff >= -config.NEAR_MARGINS.TOEFL) toeflPoints = 0.5;
      else toeflPoints = 0.0;
    }

    const bestEnglishPoints = Math.max(ieltsPoints, toeflPoints);
    totalMarginPoints += Math.max(0, Math.max(ieltsMargin, toeflMargin));

    if (bestEnglishPoints === 1.0) {
      pointsEarned += 1.0;
      if (ieltsPoints === 1.0) {
        metRequirements.push(`IELTS (Met: ${exams.ielts} >= ${req.min_ielts})`);
        criterionBreakdown.push({
          id: 'ielts',
          label: 'IELTS Academic',
          status: 'MET',
          requiredVal: req.min_ielts,
          actualVal: exams.ielts,
          displayMessage: `✅ IELTS Met: ${exams.ielts} (min: ${req.min_ielts})`,
          sourceUrl: snippets.min_ielts?.source_url || university.sourceUrl,
          verifiedOn: snippets.min_ielts?.verified_on || university.lastChecked,
          sourceSnippet: snippets.min_ielts?.snippet,
        });
      } else {
        metRequirements.push(`TOEFL (Met: ${exams.toefl} >= ${req.min_toefl})`);
        criterionBreakdown.push({
          id: 'toefl',
          label: 'TOEFL iBT',
          status: 'MET',
          requiredVal: req.min_toefl,
          actualVal: exams.toefl,
          displayMessage: `✅ TOEFL Met: ${exams.toefl} (min: ${req.min_toefl})`,
          sourceUrl: snippets.min_toefl?.source_url || university.sourceUrl,
          verifiedOn: snippets.min_toefl?.verified_on || university.lastChecked,
          sourceSnippet: snippets.min_toefl?.snippet,
        });
      }
    } else if (bestEnglishPoints === 0.5) {
      pointsEarned += 0.5;
      if (ieltsPoints === 0.5) {
        nearRequirements.push(`IELTS (Near: ${exams.ielts} / req ${req.min_ielts})`);
        criterionBreakdown.push({
          id: 'ielts',
          label: 'IELTS Academic',
          status: 'NEAR',
          requiredVal: req.min_ielts,
          actualVal: exams.ielts,
          displayMessage: `⚠️ IELTS Near: ${exams.ielts} (needs: ${req.min_ielts})`,
          sourceUrl: snippets.min_ielts?.source_url || university.sourceUrl,
          verifiedOn: snippets.min_ielts?.verified_on || university.lastChecked,
          sourceSnippet: snippets.min_ielts?.snippet,
        });
      } else {
        nearRequirements.push(`TOEFL (Near: ${exams.toefl} / req ${req.min_toefl})`);
        criterionBreakdown.push({
          id: 'toefl',
          label: 'TOEFL iBT',
          status: 'NEAR',
          requiredVal: req.min_toefl,
          actualVal: exams.toefl,
          displayMessage: `⚠️ TOEFL Near: ${exams.toefl} (needs: ${req.min_toefl})`,
          sourceUrl: snippets.min_toefl?.source_url || university.sourceUrl,
          verifiedOn: snippets.min_toefl?.verified_on || university.lastChecked,
          sourceSnippet: snippets.min_toefl?.snippet,
        });
      }
    } else {
      pointsEarned += 0.0;
      if (exams.ielts === null && exams.toefl === null) {
        belowRequirements.push('English Proficiency (Not taken)');
        missingExams.push(
          hasIeltsReq && hasToeflReq ? 'IELTS or TOEFL' : hasIeltsReq ? 'IELTS' : 'TOEFL'
        );
        criterionBreakdown.push({
          id: 'english',
          label: 'English Proficiency',
          status: 'BELOW',
          requiredVal: req.min_ielts ? `IELTS ${req.min_ielts}` : `TOEFL ${req.min_toefl}`,
          actualVal: 'Not taken',
          displayMessage: `❌ English: Not taken (needs ${req.min_ielts ? `IELTS ${req.min_ielts}` : `TOEFL ${req.min_toefl}`})`,
          sourceUrl: snippets.min_ielts?.source_url || university.sourceUrl,
          verifiedOn: snippets.min_ielts?.verified_on || university.lastChecked,
          sourceSnippet: snippets.min_ielts?.snippet,
        });
      } else {
        belowRequirements.push('English Proficiency (Below requirement)');
        const actualScore = exams.ielts !== null ? `IELTS ${exams.ielts}` : `TOEFL ${exams.toefl}`;
        const requiredScore = req.min_ielts ? `IELTS ${req.min_ielts}` : `TOEFL ${req.min_toefl}`;
        criterionBreakdown.push({
          id: 'english',
          label: 'English Proficiency',
          status: 'BELOW',
          requiredVal: requiredScore,
          actualVal: actualScore,
          displayMessage: `❌ English Below: You have ${actualScore} / needs ${requiredScore}`,
          sourceUrl: snippets.min_ielts?.source_url || university.sourceUrl,
          verifiedOn: snippets.min_ielts?.verified_on || university.lastChecked,
          sourceSnippet: snippets.min_ielts?.snippet,
        });
      }
    }
  } else {
    // English requirement is null / unconfirmed
    criterionBreakdown.push({
      id: 'english',
      label: 'English Proficiency',
      status: 'UNCONFIRMED',
      requiredVal: null,
      actualVal: exams.ielts ? `IELTS ${exams.ielts}` : exams.toefl ? `TOEFL ${exams.toefl}` : null,
      displayMessage: '⚪ English: Unconfirmed, verify on official portal',
      sourceUrl: university.sourceUrl,
      verifiedOn: university.lastChecked,
    });
  }

  // --- C. GRE Requirement ---
  if (req.gre_required === true) {
    knownRequirementsCount += 1;
    if (exams.gre !== null) {
      if (req.min_gre !== null && req.min_gre !== undefined) {
        const diff = exams.gre - req.min_gre;
        if (diff >= 0) {
          pointsEarned += 1.0;
          totalMarginPoints += diff / 10;
          metRequirements.push(`GRE (Met: ${exams.gre} >= ${req.min_gre})`);
          criterionBreakdown.push({
            id: 'gre',
            label: 'GRE General',
            status: 'MET',
            requiredVal: req.min_gre,
            actualVal: exams.gre,
            displayMessage: `✅ GRE Met: ${exams.gre} (min: ${req.min_gre})`,
            sourceUrl: snippets.gre_required?.source_url || university.sourceUrl,
            verifiedOn: snippets.gre_required?.verified_on || university.lastChecked,
            sourceSnippet: snippets.gre_required?.snippet,
          });
        } else if (diff >= -config.NEAR_MARGINS.GRE) {
          pointsEarned += 0.5;
          nearRequirements.push(`GRE (Near: ${exams.gre} / req ${req.min_gre})`);
          criterionBreakdown.push({
            id: 'gre',
            label: 'GRE General',
            status: 'NEAR',
            requiredVal: req.min_gre,
            actualVal: exams.gre,
            displayMessage: `⚠️ GRE Near: ${exams.gre} (needs: ${req.min_gre})`,
            sourceUrl: snippets.gre_required?.source_url || university.sourceUrl,
            verifiedOn: snippets.gre_required?.verified_on || university.lastChecked,
            sourceSnippet: snippets.gre_required?.snippet,
          });
        } else {
          pointsEarned += 0.0;
          belowRequirements.push(`GRE (Below: ${exams.gre} < ${req.min_gre})`);
          criterionBreakdown.push({
            id: 'gre',
            label: 'GRE General',
            status: 'BELOW',
            requiredVal: req.min_gre,
            actualVal: exams.gre,
            displayMessage: `❌ GRE Below: ${exams.gre} (needs: ${req.min_gre})`,
            sourceUrl: snippets.gre_required?.source_url || university.sourceUrl,
            verifiedOn: snippets.gre_required?.verified_on || university.lastChecked,
            sourceSnippet: snippets.gre_required?.snippet,
          });
        }
      } else {
        pointsEarned += 1.0;
        totalMarginPoints += 0.5;
        metRequirements.push(`GRE (Taken: ${exams.gre})`);
        criterionBreakdown.push({
          id: 'gre',
          label: 'GRE General',
          status: 'MET',
          requiredVal: 'Required',
          actualVal: exams.gre,
          displayMessage: `✅ GRE Satisfied: Score submitted (${exams.gre})`,
          sourceUrl: snippets.gre_required?.source_url || university.sourceUrl,
          verifiedOn: snippets.gre_required?.verified_on || university.lastChecked,
          sourceSnippet: snippets.gre_required?.snippet,
        });
      }
    } else {
      pointsEarned += 0.0;
      belowRequirements.push('GRE (Required but not taken)');
      missingExams.push(req.min_gre ? `GRE (min ${req.min_gre})` : 'GRE');
      criterionBreakdown.push({
        id: 'gre',
        label: 'GRE General',
        status: 'BELOW',
        requiredVal: req.min_gre ? `Min ${req.min_gre}` : 'Required',
        actualVal: 'Not taken',
        displayMessage: `❌ GRE: Required${req.min_gre ? ` (${req.min_gre})` : ''} - you have not taken it`,
        sourceUrl: snippets.gre_required?.source_url || university.sourceUrl,
        verifiedOn: snippets.gre_required?.verified_on || university.lastChecked,
        sourceSnippet: snippets.gre_required?.snippet,
      });
    }
  } else if (req.gre_required === false) {
    criterionBreakdown.push({
      id: 'gre',
      label: 'GRE General',
      status: 'NOT_REQUIRED',
      requiredVal: 'Waived',
      actualVal: exams.gre,
      displayMessage: '✅ GRE: Not required / Waived for this program',
      sourceUrl: university.sourceUrl,
      verifiedOn: university.lastChecked,
    });
  } else {
    // null -> unconfirmed
    criterionBreakdown.push({
      id: 'gre',
      label: 'GRE General',
      status: 'UNCONFIRMED',
      requiredVal: null,
      actualVal: exams.gre,
      displayMessage: '⚪ GRE: Unconfirmed, verify on official portal',
      sourceUrl: university.sourceUrl,
      verifiedOn: university.lastChecked,
    });
  }

  // --- D. GMAT Requirement ---
  if (req.gmat_required === true) {
    knownRequirementsCount += 1;
    if (exams.gmat !== null) {
      if (req.min_gmat !== null && req.min_gmat !== undefined) {
        const diff = exams.gmat - req.min_gmat;
        if (diff >= 0) {
          pointsEarned += 1.0;
          totalMarginPoints += diff / 50;
          metRequirements.push(`GMAT (Met: ${exams.gmat} >= ${req.min_gmat})`);
          criterionBreakdown.push({
            id: 'gmat',
            label: 'GMAT',
            status: 'MET',
            requiredVal: req.min_gmat,
            actualVal: exams.gmat,
            displayMessage: `✅ GMAT Met: ${exams.gmat} (min: ${req.min_gmat})`,
            sourceUrl: snippets.gmat_required?.source_url || university.sourceUrl,
            verifiedOn: snippets.gmat_required?.verified_on || university.lastChecked,
            sourceSnippet: snippets.gmat_required?.snippet,
          });
        } else if (diff >= -config.NEAR_MARGINS.GMAT) {
          pointsEarned += 0.5;
          nearRequirements.push(`GMAT (Near: ${exams.gmat} / req ${req.min_gmat})`);
          criterionBreakdown.push({
            id: 'gmat',
            label: 'GMAT',
            status: 'NEAR',
            requiredVal: req.min_gmat,
            actualVal: exams.gmat,
            displayMessage: `⚠️ GMAT Near: ${exams.gmat} (needs: ${req.min_gmat})`,
            sourceUrl: snippets.gmat_required?.source_url || university.sourceUrl,
            verifiedOn: snippets.gmat_required?.verified_on || university.lastChecked,
            sourceSnippet: snippets.gmat_required?.snippet,
          });
        } else {
          pointsEarned += 0.0;
          belowRequirements.push(`GMAT (Below: ${exams.gmat} < ${req.min_gmat})`);
          criterionBreakdown.push({
            id: 'gmat',
            label: 'GMAT',
            status: 'BELOW',
            requiredVal: req.min_gmat,
            actualVal: exams.gmat,
            displayMessage: `❌ GMAT Below: ${exams.gmat} (needs: ${req.min_gmat})`,
            sourceUrl: snippets.gmat_required?.source_url || university.sourceUrl,
            verifiedOn: snippets.gmat_required?.verified_on || university.lastChecked,
            sourceSnippet: snippets.gmat_required?.snippet,
          });
        }
      } else {
        pointsEarned += 1.0;
        totalMarginPoints += 0.5;
        metRequirements.push(`GMAT (Taken: ${exams.gmat})`);
        criterionBreakdown.push({
          id: 'gmat',
          label: 'GMAT',
          status: 'MET',
          requiredVal: 'Required',
          actualVal: exams.gmat,
          displayMessage: `✅ GMAT Satisfied: Score submitted (${exams.gmat})`,
          sourceUrl: snippets.gmat_required?.source_url || university.sourceUrl,
          verifiedOn: snippets.gmat_required?.verified_on || university.lastChecked,
          sourceSnippet: snippets.gmat_required?.snippet,
        });
      }
    } else {
      pointsEarned += 0.0;
      belowRequirements.push('GMAT (Required but not taken)');
      missingExams.push(req.min_gmat ? `GMAT (min ${req.min_gmat})` : 'GMAT');
      criterionBreakdown.push({
        id: 'gmat',
        label: 'GMAT',
        status: 'BELOW',
        requiredVal: req.min_gmat ? `Min ${req.min_gmat}` : 'Required',
        actualVal: 'Not taken',
        displayMessage: `❌ GMAT: Required${req.min_gmat ? ` (${req.min_gmat})` : ''} - you have not taken it`,
        sourceUrl: snippets.gmat_required?.source_url || university.sourceUrl,
        verifiedOn: snippets.gmat_required?.verified_on || university.lastChecked,
        sourceSnippet: snippets.gmat_required?.snippet,
      });
    }
  } else if (req.gmat_required === false) {
    criterionBreakdown.push({
      id: 'gmat',
      label: 'GMAT',
      status: 'NOT_REQUIRED',
      requiredVal: 'Waived',
      actualVal: exams.gmat,
      displayMessage: '✅ GMAT: Not required / Waived for this program',
      sourceUrl: university.sourceUrl,
      verifiedOn: university.lastChecked,
    });
  } else {
    // null -> unconfirmed
    criterionBreakdown.push({
      id: 'gmat',
      label: 'GMAT',
      status: 'UNCONFIRMED',
      requiredVal: null,
      actualVal: exams.gmat,
      displayMessage: '⚪ GMAT: Unconfirmed, verify on official portal',
      sourceUrl: university.sourceUrl,
      verifiedOn: university.lastChecked,
    });
  }

  // --- E. German ECTS Credit Check (Task 4) ---
  if (university.countryId === 'germany' && req.notes && req.notes.includes('ECTS')) {
    const ectsUser = profile.ectsCredits;
    if (ectsUser) {
      // If user provided credit profile
      const mathMet = (ectsUser.math ?? 0) >= 20;
      const csMet = (ectsUser.theoreticalCs ?? 0) >= 15;
      if (mathMet && csMet) {
        criterionBreakdown.push({
          id: 'ects',
          label: 'German ECTS Prerequisites',
          status: 'MET',
          requiredVal: 'Math 20+ / CS 15+ ECTS',
          actualVal: `Math: ${ectsUser.math || 0}, CS: ${ectsUser.theoreticalCs || 0}`,
          displayMessage: '✅ German ECTS Prerequisites Met (Curricular match confirmed)',
          sourceUrl: university.sourceUrl,
          verifiedOn: university.lastChecked,
          sourceSnippet: req.notes,
        });
      } else {
        criterionBreakdown.push({
          id: 'ects',
          label: 'German ECTS Prerequisites',
          status: 'NEAR',
          requiredVal: 'Math 20+ / CS 15+ ECTS',
          actualVal: `Math: ${ectsUser.math || 0}, CS: ${ectsUser.theoreticalCs || 0}`,
          displayMessage: '⚠️ German ECTS Credit Gap: Verify syllabus against VPD credit matrix',
          sourceUrl: university.sourceUrl,
          verifiedOn: university.lastChecked,
          sourceSnippet: req.notes,
        });
      }
    } else {
      criterionBreakdown.push({
        id: 'ects',
        label: 'German ECTS Prerequisites',
        status: 'UNCONFIRMED',
        requiredVal: 'Subject credit breakdown required',
        actualVal: 'Not provided in profile',
        displayMessage: '⚪ German ECTS: Strict subject credit distribution required. Check notes.',
        sourceUrl: university.sourceUrl,
        verifiedOn: university.lastChecked,
        sourceSnippet: req.notes,
      });
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

  // 8. Categorize Fit Tier (Preserve deterministic boundary classification)
  let fitCategory: FitCategory = 'Reach';
  if (fitScore >= config.THRESHOLDS.STRONG_FIT) {
    fitCategory = 'Strong fit';
  } else if (fitScore >= config.THRESHOLDS.POSSIBLE) {
    fitCategory = 'Possible';
  } else {
    fitCategory = 'Reach';
  }

  // 9. Secondary Deterministic Tier Reranking & Reason (Task 5)
  const knownRatio = knownRequirementsCount > 0 ? (knownRequirementsCount / 3.0) : 0.5;
  const { score: tierRankScore, reason: rankReason } = calculateTierRankScore(
    profile,
    university,
    totalMarginPoints,
    knownRatio
  );

  return {
    university,
    fitCategory,
    fitScore,
    tierRankScore,
    rankReason,
    missingExams,
    metRequirements,
    nearRequirements,
    belowRequirements,
    unconfirmedRequirements,
    criterionBreakdown,
    ruleChanged,
  };
}

/**
 * Priority rank order for fit categories
 */
const TIER_ORDER: Record<FitCategory, number> = {
  'Strong fit': 1,
  'Possible': 2,
  'Reach': 3,
  'Prep needed': 4,
};

/**
 * Calculates and ranks matches for all universities against a student profile.
 *
 * Deterministic Sorting Hierarchy (Tasks 4 & 5):
 * 1. Fit Category tier order (Strong Fit > Possible > Reach > Prep Needed)
 * 2. Primary fitScore descending (e.g. 1.00 > 0.95 > 0.85)
 * 3. Secondary tierRankScore descending (budget fit, score margin, data certainty, freshness)
 * 4. Alphabetical tie-breaker by university name ascending
 */
export function calculateMatches(
  profile: UserProfile,
  universities: University[],
  config?: Partial<MatchConfig>
): MatchResult[] {
  const results = universities.map((u) => matchUniversity(profile, u, config));

  return results.sort((a, b) => {
    // 1. Primary tier order
    const tierDiff = TIER_ORDER[a.fitCategory] - TIER_ORDER[b.fitCategory];
    if (tierDiff !== 0) {
      return tierDiff;
    }

    // 2. fitScore descending within the same tier
    if (b.fitScore !== a.fitScore) {
      return b.fitScore - a.fitScore;
    }

    // 3. Secondary tierRankScore descending (deterministic reranking within tier)
    const rankA = a.tierRankScore ?? 0;
    const rankB = b.tierRankScore ?? 0;
    if (Math.abs(rankB - rankA) > 0.001) {
      return rankB - rankA;
    }

    // 4. Deterministic alphabetical tie-breaker
    return a.university.name.localeCompare(b.university.name);
  });
}
