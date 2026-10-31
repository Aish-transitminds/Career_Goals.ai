/**
 * AbroadPath AI - Eligibility Comparison Engine Unit Tests
 * File: tests/unit/eligibilityEngine.test.ts
 */

import {
  buildEligibilityComparison,
  buildMatchExplanation,
  mapFitCategoryToEnhanced,
  buildFullMatchAnalysis,
} from '../../src/utils/eligibilityEngine';
import { University, UserProfile, MatchResult } from '../../src/types';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    passedCount++;
    console.log(`  ✓ ${desc}`);
  } else {
    failedCount++;
    console.error(`  ✗ FAIL: ${desc}`);
  }
}

function createProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: 'test_user',
    name: 'Test Student',
    examsTaken: true,
    exams: {
      ielts: 7.0,
      toefl: 100,
      gre: 320,
      gmat: null,
    },
    targetCountries: ['germany'],
    budget: 15000,
    createdAt: new Date().toISOString(),
    gpa: 8.2,
    gpaScale: '10.0',
    ...overrides,
  };
}

function createUniversity(overrides: Partial<University> = {}): University {
  return {
    id: 'test_uni',
    countryId: 'germany',
    name: 'Test University',
    program: 'M.Sc. Computer Science',
    requirements: {
      min_ielts: 6.5,
      min_toefl: 88,
      gre_required: true,
      min_gre: 315,
      gmat_required: null,
      min_gmat: null,
      language_requirement: 'IELTS 6.5 or TOEFL 88',
      application_deadline: 'May 31',
      tuition_fee: '€6,000 per semester',
      notes: null,
    },
    tuition: '€6,000 / semester (Non-EU)',
    portalUrl: 'https://example.com/portal',
    sourceUrl: 'https://example.com/source',
    lastChecked: '2026-10-15',
    ruleChanged: false,
    ...overrides,
  };
}

console.log('\n=== RUNNING ELIGIBILITY ENGINE UNIT TESTS ===\n');

// ==========================================
// Category 1: buildEligibilityComparison
// ==========================================
console.log('--- Category 1: Eligibility Comparison Building ---');
{
  const profile = createProfile();
  const uni = createUniversity();
  const comparison = buildEligibilityComparison(profile, uni);

  assert(comparison.universityId === 'test_uni', 'E1.1: Comparison has correct universityId');
  assert(comparison.rows.length >= 5, 'E1.2: Comparison includes at least 5 rows (CGPA, IELTS, TOEFL, GRE, GMAT)');
  assert(comparison.hasVerifiedData === true, 'E1.3: hasVerifiedData true when lastChecked is set');
  assert(comparison.sourceUrl === 'https://example.com/source', 'E1.4: Source URL preserved');
  assert(comparison.lastChecked === '2026-10-15', 'E1.5: Last checked date preserved');

  // Check IELTS row
  const ieltsRow = comparison.rows.find((r) => r.parameter === 'IELTS (Overall)');
  assert(ieltsRow !== undefined, 'E1.6: IELTS Overall row exists');
  assert(ieltsRow!.studentScore === '7.0', 'E1.7: IELTS student score formatted correctly');
  assert(ieltsRow!.universityRequirement === '6.5', 'E1.8: IELTS requirement shown');
  assert(ieltsRow!.status === 'Exceeds Requirement', 'E1.9: IELTS 7.0 > 6.5 is Exceeds Requirement');
  assert(ieltsRow!.gap === 0.5, 'E1.10: IELTS gap is 0.5');
  assert(ieltsRow!.gapDescription !== null, 'E1.11: IELTS gap description provided');

  // Check GRE row
  const greRow = comparison.rows.find((r) => r.parameter === 'GRE');
  assert(greRow !== undefined, 'E1.12: GRE row exists');
  assert(greRow!.status === 'Exceeds Requirement', 'E1.13: GRE 320 > 315 is Exceeds Requirement');

  // Check CGPA row
  const cgpaRow = comparison.rows.find((r) => r.parameter === 'CGPA / Academic Score');
  assert(cgpaRow !== undefined, 'E1.14: CGPA row exists');
  assert(cgpaRow!.studentScore !== null, 'E1.15: CGPA student score provided');
}

// ==========================================
// Category 2: Status Labels
// ==========================================
console.log('\n--- Category 2: Status Label Computation ---');
{
  // Meets exactly
  const profileMeets = createProfile({ exams: { ielts: 6.5, toefl: null, gre: null, gmat: null } });
  const uniMeets = createUniversity({ requirements: { min_ielts: 6.5, min_toefl: null, gre_required: null, gmat_required: null, min_gre: null, min_gmat: null, language_requirement: null, application_deadline: null, tuition_fee: null, notes: null } });
  const compMeets = buildEligibilityComparison(profileMeets, uniMeets);
  const ieltsMeets = compMeets.rows.find((r) => r.parameter === 'IELTS (Overall)')!;
  assert(ieltsMeets.status === 'Meets Requirement', 'E2.1: IELTS exact match is Meets Requirement');
  assert(ieltsMeets.gap === 0, 'E2.2: IELTS exact match gap is 0');

  // Below
  const profileBelow = createProfile({ exams: { ielts: 5.5, toefl: null, gre: null, gmat: null } });
  const compBelow = buildEligibilityComparison(profileBelow, uniMeets);
  const ieltsBelow = compBelow.rows.find((r) => r.parameter === 'IELTS (Overall)')!;
  assert(ieltsBelow.status === 'Below Requirement', 'E2.3: IELTS 5.5 vs 6.5 is Below Requirement');
  assert(ieltsBelow.gap === -1, 'E2.4: IELTS gap is -1');
  assert(ieltsBelow.note !== null && ieltsBelow.note.includes('Does Not Meet'), 'E2.5: Below status note includes gap explanation');

  // Not Required
  const uniNotRequired = createUniversity({ requirements: { min_ielts: null, min_toefl: null, gre_required: false, gmat_required: false, min_gre: null, min_gmat: null, language_requirement: null, application_deadline: null, tuition_fee: null, notes: null } });
  const compNotReq = buildEligibilityComparison(profileMeets, uniNotRequired);
  const greNotReq = compNotReq.rows.find((r) => r.parameter === 'GRE')!;
  assert(greNotReq.status === 'Not Required', 'E2.6: GRE explicitly false is Not Required');

  // Not Verified
  const uniUnconfirmed = createUniversity({ requirements: { min_ielts: null, min_toefl: null, gre_required: null, gmat_required: null, min_gre: null, min_gmat: null, language_requirement: null, application_deadline: null, tuition_fee: null, notes: null } });
  const compUnconf = buildEligibilityComparison(profileMeets, uniUnconfirmed);
  const ieltsUnconf = compUnconf.rows.find((r) => r.parameter === 'IELTS (Overall)');
  // IELTS not required since min_ielts is null
  assert(ieltsUnconf === undefined, 'E2.7: IELTS row omitted when min_ielts is null (no row added)');
  const greUnconf = compUnconf.rows.find((r) => r.parameter === 'GRE')!;
  assert(greUnconf.status === 'Not Verified', 'E2.8: GRE null requirement is Not Verified');
}

// ==========================================
// Category 3: Overall Eligibility
// ==========================================
console.log('\n--- Category 3: Overall Eligibility Assessment ---');
{
  // Eligible (all met, but GMAT is unconfirmed → potentially_eligible)
  const profileEligible = createProfile({ exams: { ielts: 7.5, toefl: 105, gre: 325, gmat: null } });
  const uniEligible = createUniversity();
  const compEligible = buildEligibilityComparison(profileEligible, uniEligible);
  assert(compEligible.overallEligibility === 'potentially_eligible', 'E3.1: All requirements met but GMAT unconfirmed → potentially_eligible');

  // Fully eligible (all requirements confirmed and met)
  const uniAllConfirmed = createUniversity({
    requirements: { min_ielts: 6.5, min_toefl: 88, gre_required: true, min_gre: 315, gmat_required: false, min_gmat: null, language_requirement: 'IELTS 6.5', application_deadline: 'May 31', tuition_fee: '€6,000', notes: null },
  });
  const compAllEligible = buildEligibilityComparison(profileEligible, uniAllConfirmed);
  assert(compAllEligible.overallEligibility === 'eligible', 'E3.1b: All requirements confirmed and met → eligible');

  // Not eligible (below GRE)
  const profileNotEligible = createProfile({ exams: { ielts: 7.0, toefl: 100, gre: 300, gmat: null } });
  const compNotEligible = buildEligibilityComparison(profileNotEligible, uniEligible);
  assert(compNotEligible.overallEligibility === 'not_eligible', 'E3.2: GRE below threshold → not_eligible');

  // Insufficient info (student has no scores)
  const profileNoScores = createProfile({ exams: { ielts: null, toefl: null, gre: null, gmat: null }, gpa: null });
  const compNoScores = buildEligibilityComparison(profileNoScores, uniEligible);
  assert(
    compNoScores.overallEligibility === 'not_eligible' || compNoScores.overallEligibility === 'insufficient_info',
    'E3.3: Missing scores → not_eligible or insufficient_info'
  );
}

// ==========================================
// Category 4: Enhanced Fit Category Mapping
// ==========================================
console.log('\n--- Category 4: Enhanced Fit Category Mapping ---');
{
  const matchStrong: MatchResult = {
    university: createUniversity(),
    fitCategory: 'Strong fit',
    fitScore: 1.0,
    missingExams: [],
    metRequirements: ['IELTS (Met: 7.0 >= 6.5)'],
    nearRequirements: [],
    belowRequirements: [],
    unconfirmedRequirements: [],
    ruleChanged: false,
  };
  assert(mapFitCategoryToEnhanced('Strong fit', matchStrong) === 'Strong Match', 'E4.1: Strong fit → Strong Match');

  const matchPossible: MatchResult = {
    university: createUniversity(),
    fitCategory: 'Possible',
    fitScore: 0.7,
    missingExams: [],
    metRequirements: ['IELTS (Met)'],
    nearRequirements: ['GRE (Near)'],
    belowRequirements: [],
    unconfirmedRequirements: [],
    ruleChanged: false,
  };
  assert(mapFitCategoryToEnhanced('Possible', matchPossible) === 'Moderate Match', 'E4.2: Possible → Moderate Match');

  const matchReach: MatchResult = {
    university: createUniversity(),
    fitCategory: 'Reach',
    fitScore: 0.3,
    missingExams: [],
    metRequirements: [],
    nearRequirements: [],
    belowRequirements: ['IELTS (Below)'],
    unconfirmedRequirements: [],
    ruleChanged: false,
  };
  assert(mapFitCategoryToEnhanced('Reach', matchReach) === 'Not Eligible', 'E4.3: Reach with hard below → Not Eligible');

  const matchPrep: MatchResult = {
    university: createUniversity(),
    fitCategory: 'Prep needed',
    fitScore: -1,
    missingExams: ['IELTS', 'GRE'],
    metRequirements: [],
    nearRequirements: [],
    belowRequirements: [],
    unconfirmedRequirements: [],
    ruleChanged: false,
  };
  assert(mapFitCategoryToEnhanced('Prep needed', matchPrep) === 'Not Eligible', 'E4.4: Prep needed → Not Eligible');
}

// ==========================================
// Category 5: Match Explanation
// ==========================================
console.log('\n--- Category 5: Match Explanation ---');
{
  const matchResult: MatchResult = {
    university: createUniversity(),
    fitCategory: 'Strong fit',
    fitScore: 1.0,
    missingExams: [],
    metRequirements: ['IELTS (Met: 7.0 >= 6.5)', 'GRE (Met: 320 >= 315)'],
    nearRequirements: [],
    belowRequirements: [],
    unconfirmedRequirements: ['GMAT'],
    ruleChanged: false,
  };
  const profile = createProfile();
  const explanation = buildMatchExplanation(matchResult, profile);

  assert(explanation.primaryReason.length > 0, 'E5.1: Primary reason is non-empty');
  assert(explanation.strengths.length >= 2, 'E5.2: Strengths includes met requirements');
  assert(explanation.unverified.length >= 1, 'E5.3: Unverified includes GMAT');
  assert(explanation.canEstimateProbability === false, 'E5.4: Cannot estimate probability');
  assert(explanation.disclaimer.includes('does not guarantee'), 'E5.5: Disclaimer mentions no guarantee');
}

// ==========================================
// Category 6: Full Match Analysis
// ==========================================
console.log('\n--- Category 6: Full Match Analysis ---');
{
  const matchResult: MatchResult = {
    university: createUniversity(),
    fitCategory: 'Possible',
    fitScore: 0.7,
    missingExams: [],
    metRequirements: ['IELTS (Met)'],
    nearRequirements: ['GRE (Near: 310 / req 315)'],
    belowRequirements: [],
    unconfirmedRequirements: ['GMAT'],
    ruleChanged: false,
  };
  const profile = createProfile({ exams: { ielts: 6.5, toefl: null, gre: 310, gmat: null } });
  const analysis = buildFullMatchAnalysis(matchResult, profile);

  assert(analysis.comparison.universityId === 'test_uni', 'E6.1: Comparison has correct university ID');
  assert(analysis.enhancedCategory === 'Moderate Match', 'E6.2: Enhanced category is Moderate Match');
  assert(analysis.explanation.strengths.length > 0, 'E6.3: Explanation has strengths');
}

// ==========================================
// Category 7: Individual IELTS Band Scores
// ==========================================
console.log('\n--- Category 7: Individual IELTS Band Scores ---');
{
  const profileBands = createProfile({
    exams: { ielts: 7.0, toefl: null, gre: null, gmat: null, ieltsReading: 7.5, ieltsWriting: 6.0, ieltsSpeaking: 7.0, ieltsListening: 7.5 },
  });
  const uniBands = createUniversity({
    requirements: {
      min_ielts: 6.5,
      min_toefl: 88,
      ielts_min_writing: 6.5,
      gre_required: null,
      gmat_required: null,
      min_gre: null,
      min_gmat: null,
      language_requirement: 'IELTS 6.5 (no band < 6.0)',
      application_deadline: null,
      tuition_fee: null,
      notes: null,
    },
  });
  const comp = buildEligibilityComparison(profileBands, uniBands);
  const writingRow = comp.rows.find((r) => r.parameter === 'IELTS Writing');
  assert(writingRow !== undefined, 'E7.1: IELTS Writing band row exists');
  assert(writingRow!.status === 'Below Requirement', 'E7.2: Writing 6.0 vs 6.5 is Below Requirement');
  assert(writingRow!.gap === -0.5, 'E7.3: Writing gap is -0.5');
}

// ==========================================
// Category 8: Portfolio & Audition
// ==========================================
console.log('\n--- Category 8: Portfolio & Audition ---');
{
  const uniWithPortfolio = createUniversity({
    requirements: {
      min_ielts: null,
      min_toefl: null,
      gre_required: null,
      gmat_required: null,
      min_gre: null,
      min_gmat: null,
      language_requirement: null,
      application_deadline: null,
      tuition_fee: null,
      notes: null,
      portfolio_required: true,
    },
  });
  const profileWithPortfolio = createProfile({ hasPortfolio: true });
  const comp = buildEligibilityComparison(profileWithPortfolio, uniWithPortfolio);
  const portfolioRow = comp.rows.find((r) => r.parameter === 'Portfolio');
  assert(portfolioRow !== undefined, 'E8.1: Portfolio row exists when required');
  assert(portfolioRow!.status === 'Meets Requirement', 'E8.2: Portfolio available → Meets Requirement');

  const profileWithout = createProfile({ hasPortfolio: false });
  const compWithout = buildEligibilityComparison(profileWithout, uniWithPortfolio);
  const portfolioWithout = compWithout.rows.find((r) => r.parameter === 'Portfolio')!;
  assert(portfolioWithout.status === 'Below Requirement', 'E8.3: No portfolio → Below Requirement');
}

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
console.log(`TOTAL PASSED: ${passedCount}`);
console.log(`TOTAL FAILED: ${failedCount}`);
console.log(`========================================\n`);

if (failedCount > 0) {
  process.exit(1);
}
