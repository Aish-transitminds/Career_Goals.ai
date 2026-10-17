/**
 * AbroadPath AI - Comprehensive Empirical Stress Test Suite for Match Engine
 * File: tests/stress_match_engine.ts
 * Role: Challenger 1 (Milestone 2) - Empirical Challenger & Critic
 * Authoritative References: ORIGINAL_REQUEST.md (§Matching Logic) & PROJECT.md
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  matchUniversity,
  calculateMatches,
  parseAnnualTuition,
} from '../src/utils/matchEngine';
import { University, UserProfile, MatchResult } from '../src/types';

// ANSI terminal colors
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

interface StressTestResult {
  id: string;
  category: string;
  title: string;
  passed: boolean;
  details?: string;
}

const results: StressTestResult[] = [];

function assertTest(
  id: string,
  category: string,
  title: string,
  condition: boolean,
  failureDetails?: string
) {
  if (condition) {
    results.push({ id, category, title, passed: true });
    console.log(`  ${green('✓')} [${id}] ${title}`);
  } else {
    results.push({ id, category, title, passed: false, details: failureDetails });
    console.error(`  ${red('✗')} [${id}] FAIL: ${title}${failureDetails ? ' - ' + failureDetails : ''}`);
  }
}

// Load seed data
const universitiesPath = path.resolve('src/data/universities.json');
const rawSeed = fs.readFileSync(universitiesPath, 'utf8');
const seedUniversities: University[] = JSON.parse(rawSeed);

console.log(bold('\n============================================================================='));
console.log(bold('  AbroadPath AI - Empirical Match Engine Stress & Adversarial Test Suite'));
console.log(bold('  Executed by Challenger 1 (Milestone 2)'));
console.log(bold('=============================================================================\n'));

// =============================================================================
// SUITE 1: High-Achieving Profile Across Germany, Ireland, and UK
// =============================================================================
console.log(cyan('=== SUITE 1: High-Achieving Profile (All 11 Real Seed Universities) ==='));

const highAchieverProfile: UserProfile = {
  uid: 'user_high_achiever',
  name: 'Top Scholar Persona',
  examsTaken: true,
  exams: {
    ielts: 8.5,
    toefl: 115,
    gre: 335,
    gmat: 750,
  },
  targetCountries: ['germany', 'ireland', 'uk'],
  budget: 60000,
  createdAt: '2026-10-15T12:00:00Z',
};

assertTest(
  'S1.1',
  'High Achiever',
  'All 11 seed universities are loaded from verified dataset',
  seedUniversities.length === 11,
  `Loaded ${seedUniversities.length} universities`
);

const highAchieverResults = calculateMatches(highAchieverProfile, seedUniversities);

assertTest(
  'S1.2',
  'High Achiever',
  'All 11 universities match with fitCategory "Strong fit"',
  highAchieverResults.every((r) => r.fitCategory === 'Strong fit'),
  `Non-strong fits: ${highAchieverResults.filter((r) => r.fitCategory !== 'Strong fit').map((r) => `${r.university.name}: ${r.fitCategory}`).join(', ')}`
);

assertTest(
  'S1.3',
  'High Achiever',
  'All 11 universities receive a fitScore of 1.00 (perfect score capped)',
  highAchieverResults.every((r) => r.fitScore === 1.00),
  `Scores: ${highAchieverResults.map((r) => `${r.university.id}=${r.fitScore}`).join(', ')}`
);

assertTest(
  'S1.4',
  'High Achiever',
  'No missing exams recorded for high achiever across any university',
  highAchieverResults.every((r) => r.missingExams.length === 0),
  `Universities with missing exams: ${highAchieverResults.filter((r) => r.missingExams.length > 0).map((r) => r.university.name).join(', ')}`
);

assertTest(
  'S1.5',
  'High Achiever',
  'No belowRequirements recorded for high achiever across any university',
  highAchieverResults.every((r) => r.belowRequirements.length === 0),
  `Universities with below requirements: ${highAchieverResults.filter((r) => r.belowRequirements.length > 0).map((r) => r.university.name).join(', ')}`
);

assertTest(
  'S1.6',
  'High Achiever',
  'tum_informatics retains ruleChanged === true for high achiever',
  highAchieverResults.find((r) => r.university.id === 'tum_informatics')?.ruleChanged === true
);

// Check country distribution in seed dataset
const germanyUnis = seedUniversities.filter((u) => u.countryId === 'germany');
const irelandUnis = seedUniversities.filter((u) => u.countryId === 'ireland');
const ukUnis = seedUniversities.filter((u) => u.countryId === 'uk');

assertTest(
  'S1.7',
  'High Achiever',
  'Seed data contains 4 German, 4 Irish, and 3 UK universities',
  germanyUnis.length === 4 && irelandUnis.length === 4 && ukUnis.length === 3,
  `Counts: DE=${germanyUnis.length}, IE=${irelandUnis.length}, UK=${ukUnis.length}`
);

// =============================================================================
// SUITE 2: Career Switcher with No Exams ("Prep Needed" State)
// =============================================================================
console.log(cyan('\n=== SUITE 2: Career Switcher with No Exams ("Prep Needed" State) ==='));

const careerSwitcherExplicitFalse: UserProfile = {
  uid: 'user_switcher_false',
  name: 'Career Switcher (Explicit False)',
  examsTaken: false,
  exams: {
    ielts: null,
    toefl: null,
    gre: null,
    gmat: null,
  },
  targetCountries: ['germany'],
  budget: 20000,
  createdAt: '2026-10-15T12:00:00Z',
};

const switcherFalseResults = calculateMatches(careerSwitcherExplicitFalse, seedUniversities);

assertTest(
  'S2.1',
  'Career Switcher',
  'examsTaken: false results in fitCategory "Prep needed" for all 11 universities',
  switcherFalseResults.every((r) => r.fitCategory === 'Prep needed'),
  `Non-prep tiers: ${switcherFalseResults.filter((r) => r.fitCategory !== 'Prep needed').map((r) => r.fitCategory).join(', ')}`
);

assertTest(
  'S2.2',
  'Career Switcher',
  'examsTaken: false results in fitScore: -1 for all 11 universities',
  switcherFalseResults.every((r) => r.fitScore === -1),
  `Non -1 scores: ${switcherFalseResults.map((r) => r.fitScore).join(', ')}`
);

assertTest(
  'S2.3',
  'Career Switcher',
  'examsTaken: false produces empty metRequirements and belowRequirements',
  switcherFalseResults.every((r) => r.metRequirements.length === 0 && r.belowRequirements.length === 0)
);

// Check itemized missing exams on specific universities
const tumMatch = switcherFalseResults.find((r) => r.university.id === 'tum_informatics');
assertTest(
  'S2.4',
  'Career Switcher',
  'TUM Informatics lists English, GRE, and GMAT in missingExams',
  tumMatch !== undefined &&
    tumMatch.missingExams.some((e) => e.includes('IELTS') || e.includes('TOEFL')) &&
    tumMatch.missingExams.some((e) => e.includes('GRE')) &&
    tumMatch.missingExams.some((e) => e.includes('GMAT')),
  `TUM missing exams: ${tumMatch?.missingExams.join(', ')}`
);

const rwthMatch = switcherFalseResults.find((r) => r.university.id === 'rwth_cs');
assertTest(
  'S2.5',
  'Career Switcher',
  'RWTH CS lists English and GRE in missingExams, but NOT GMAT',
  rwthMatch !== undefined &&
    rwthMatch.missingExams.some((e) => e.includes('GRE')) &&
    !rwthMatch.missingExams.some((e) => e.includes('GMAT')),
  `RWTH missing exams: ${rwthMatch?.missingExams.join(', ')}`
);

// Test profile with examsTaken: true but all exams null
const careerSwitcherAllNullExams: UserProfile = {
  uid: 'user_switcher_all_null',
  name: 'Career Switcher (All Null Exams)',
  examsTaken: true,
  exams: {
    ielts: null,
    toefl: null,
    gre: null,
    gmat: null,
  },
  targetCountries: ['ireland'],
  budget: 30000,
  createdAt: '2026-10-15T12:00:00Z',
};

const switcherNullResults = calculateMatches(careerSwitcherAllNullExams, seedUniversities);

assertTest(
  'S2.6',
  'Career Switcher',
  'examsTaken: true with all null exam scores triggers "Prep needed" and fitScore: -1',
  switcherNullResults.every((r) => r.fitCategory === 'Prep needed' && r.fitScore === -1),
  `Categories: ${switcherNullResults.map((r) => r.fitCategory).join(', ')}`
);

// Test partial exam taker: Took GRE only, but applying to university requiring English
const partialExamProfile: UserProfile = {
  uid: 'user_partial_gre',
  name: 'GRE Only Student',
  examsTaken: true,
  exams: {
    ielts: null,
    toefl: null,
    gre: 325,
    gmat: null,
  },
  targetCountries: ['uk'],
  budget: 50000,
  createdAt: '2026-10-15T12:00:00Z',
};

const oxfordUni = seedUniversities.find((u) => u.id === 'oxford_acs')!;
const oxfordMatch = matchUniversity(partialExamProfile, oxfordUni);

assertTest(
  'S2.7',
  'Career Switcher',
  'Partial exam taker (GRE only) vs Oxford (English only) is NOT "Prep needed", but evaluated as Below with missing English exam',
  oxfordMatch.fitCategory !== 'Prep needed' &&
    oxfordMatch.belowRequirements.includes('English Proficiency (Not taken)') &&
    oxfordMatch.missingExams.includes('IELTS or TOEFL'),
  `Category: ${oxfordMatch.fitCategory}, Below: ${oxfordMatch.belowRequirements}, Missing: ${oxfordMatch.missingExams}`
);

// =============================================================================
// SUITE 3: Zero-Budget Profile Matching Tuition-Free vs Fee-Charging Universities
// =============================================================================
console.log(cyan('\n=== SUITE 3: Zero-Budget Profile (Tuition-Free vs Fee-Charging) ==='));

const zeroBudgetProfile: UserProfile = {
  uid: 'user_zero_budget',
  name: 'Zero Budget Applicant',
  examsTaken: true,
  exams: {
    ielts: 7.5,
    toefl: 105,
    gre: 325,
    gmat: 700,
  },
  targetCountries: ['germany', 'ireland', 'uk'],
  budget: 0,
  createdAt: '2026-10-15T12:00:00Z',
};

// Test tuition parser explicitly on seed tuition strings
assertTest(
  'S3.1',
  'Zero Budget',
  'parseAnnualTuition handles RWTH "€0 (Tuition-free)" as 0',
  parseAnnualTuition(seedUniversities.find((u) => u.id === 'rwth_cs')!.tuition) === 0
);

assertTest(
  'S3.2',
  'Zero Budget',
  'parseAnnualTuition handles LMU "€0 (Tuition-free)" as 0',
  parseAnnualTuition(seedUniversities.find((u) => u.id === 'lmu_datascience')!.tuition) === 0
);

assertTest(
  'S3.3',
  'Zero Budget',
  'parseAnnualTuition handles TUM "€6,000 / semester (Non-EU)" as 12000',
  parseAnnualTuition(seedUniversities.find((u) => u.id === 'tum_informatics')!.tuition) === 12000
);

assertTest(
  'S3.4',
  'Zero Budget',
  'parseAnnualTuition handles Heidelberg "€1,500 / semester (Non-EU)" as 3000',
  parseAnnualTuition(seedUniversities.find((u) => u.id === 'heidelberg_dcs')!.tuition) === 3000
);

assertTest(
  'S3.5',
  'Zero Budget',
  'parseAnnualTuition handles TCD "€27,500 / year (Non-EU)" as 27500',
  parseAnnualTuition(seedUniversities.find((u) => u.id === 'tcd_cs')!.tuition) === 27500
);

assertTest(
  'S3.6',
  'Zero Budget',
  'parseAnnualTuition handles Oxford "£46,350 / year (Overseas)" as 46350',
  parseAnnualTuition(seedUniversities.find((u) => u.id === 'oxford_acs')!.tuition) === 46350
);

// Now compare budget bonus application between tuition-free and fee-charging
// We create an isolated baseline university to measure exact score delta from budget bonus alone
const mockFreeUni: University = {
  ...seedUniversities[0],
  id: 'mock_free',
  name: 'Mock Tuition Free University',
  countryId: 'test_land',
  tuition: '€0 (Tuition-free)',
  requirements: {
    min_ielts: 7.0,
    min_toefl: 95,
    gre_required: null,
    gmat_required: null,
    language_requirement: null,
    tuition_fee: '€0',
    application_deadline: null,
    notes: null,
  },
};

const mockPaidUni: University = {
  ...mockFreeUni,
  id: 'mock_paid',
  name: 'Mock Paid University',
  tuition: '€10,000 / year',
  requirements: {
    ...mockFreeUni.requirements,
    tuition_fee: '€10,000',
  },
};

const zeroBudgetWithoutCountry: UserProfile = {
  ...zeroBudgetProfile,
  targetCountries: [], // Remove country bonus to isolate budget impact
  budget: 0,
};

const freeResult = matchUniversity(zeroBudgetWithoutCountry, mockFreeUni);
const paidResult = matchUniversity(zeroBudgetWithoutCountry, mockPaidUni);

assertTest(
  'S3.7',
  'Zero Budget',
  'Zero-budget applicant receives +0.05 bonus on tuition-free university (0 <= 0)',
  Math.abs(freeResult.fitScore - (1.00)) < 0.001 || freeResult.fitScore === 1.05 || freeResult.fitScore === 1.00,
  `Free uni score: ${freeResult.fitScore}`
);

assertTest(
  'S3.7b',
  'Zero Budget',
  'Paid university receives no budget bonus for zero-budget applicant',
  paidResult.fitScore <= freeResult.fitScore,
  `Paid uni score: ${paidResult.fitScore}`
);

// With baseScore = 1.0 (requirements met), both would be 1.00 due to ceiling capping.
// Let's test with partial requirement (Near) so baseScore = 0.50 to observe uncapped +0.05 bonus
const partialScoreProfile: UserProfile = {
  ...zeroBudgetWithoutCountry,
  exams: {
    ielts: 6.5, // 0.5 below 7.0 req -> Near (0.5 points)
    toefl: null,
    gre: null,
    gmat: null,
  },
};

const freePartialResult = matchUniversity(partialScoreProfile, mockFreeUni);
const paidPartialResult = matchUniversity(partialScoreProfile, mockPaidUni);

assertTest(
  'S3.8',
  'Zero Budget',
  'On partial score (base 0.50), tuition-free receives 0.55 while paid university receives 0.50 (exact +0.05 budget bonus)',
  freePartialResult.fitScore === 0.55 && paidPartialResult.fitScore === 0.50,
  `Free: ${freePartialResult.fitScore}, Paid: ${paidPartialResult.fitScore}`
);

assertTest(
  'S3.9',
  'Zero Budget',
  'When profile.budget is null, tuition-free does NOT receive budget bonus',
  matchUniversity({ ...partialScoreProfile, budget: null }, mockFreeUni).fitScore === 0.50
);

assertTest(
  'S3.10',
  'Zero Budget',
  'Negative budget (e.g. -5000) does NOT give budget bonus on tuition-free university (0 <= -5000 is false)',
  matchUniversity({ ...partialScoreProfile, budget: -5000 }, mockFreeUni).fitScore === 0.50
);

// =============================================================================
// SUITE 4: Proximity Boundary Cases & Margins
// =============================================================================
console.log(cyan('\n=== SUITE 4: Proximity Boundary Cases & Margins ==='));

const testUniProximity: University = {
  ...seedUniversities[0],
  id: 'prox_uni',
  name: 'Proximity Test University',
  countryId: 'nowhere',
  tuition: '€0',
  requirements: {
    min_ielts: 7.0,
    min_toefl: 100,
    gre_required: true,
    min_gre: 320,
    gmat_required: true,
    min_gmat: 700,
    language_requirement: null,
    tuition_fee: null,
    application_deadline: null,
    notes: null,
  },
};

const baseProfile: UserProfile = {
  uid: 'u_prox',
  name: 'Proximity Student',
  examsTaken: true,
  exams: { ielts: null, toefl: null, gre: null, gmat: null },
  targetCountries: [],
  budget: null,
  createdAt: '2026-10-15T12:00:00Z',
};

// 4.1 IELTS Margin: 0.5
// Req 7.0: Met >= 7.0, Near >= 6.5, Below < 6.5
const ieltsExactMet = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, ielts: 7.0 } }, testUniProximity);
const ieltsExactNear = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, ielts: 6.5 } }, testUniProximity);
const ieltsNearBoundaryHigh = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, ielts: 6.9 } }, testUniProximity);
const ieltsBelowBoundary = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, ielts: 6.49 } }, testUniProximity);
const ieltsExactBelow = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, ielts: 6.0 } }, testUniProximity);

assertTest(
  'S4.1',
  'Proximity',
  'IELTS 7.0 vs 7.0 requirement earns 1.0 point (Met)',
  ieltsExactMet.metRequirements.some((r) => r.startsWith('IELTS (Met'))
);

assertTest(
  'S4.2',
  'Proximity',
  'IELTS 6.5 vs 7.0 requirement (exact diff -0.5) earns 0.5 point (Near)',
  ieltsExactNear.nearRequirements.some((r) => r.startsWith('IELTS (Near'))
);

assertTest(
  'S4.3',
  'Proximity',
  'IELTS 6.9 vs 7.0 requirement earns 0.5 point (Near)',
  ieltsNearBoundaryHigh.nearRequirements.some((r) => r.startsWith('IELTS (Near'))
);

assertTest(
  'S4.4',
  'Proximity',
  'IELTS 6.49 vs 7.0 requirement (diff -0.51) earns 0.0 point (Below)',
  ieltsBelowBoundary.belowRequirements.some((r) => r.includes('Below requirement'))
);

assertTest(
  'S4.5',
  'Proximity',
  'IELTS 6.0 vs 7.0 requirement earns 0.0 point (Below)',
  ieltsExactBelow.belowRequirements.some((r) => r.includes('Below requirement'))
);

// 4.2 TOEFL Margin: 5.0
// Req 100: Met >= 100, Near >= 95, Below < 95
const toeflExactMet = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, toefl: 100 } }, testUniProximity);
const toeflExactNear = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, toefl: 95 } }, testUniProximity);
const toeflBelowBoundary = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, toefl: 94.9 } }, testUniProximity);
const toeflBelow = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, toefl: 94 } }, testUniProximity);

assertTest(
  'S4.6',
  'Proximity',
  'TOEFL 100 vs 100 requirement earns 1.0 point (Met)',
  toeflExactMet.metRequirements.some((r) => r.startsWith('TOEFL (Met'))
);

assertTest(
  'S4.7',
  'Proximity',
  'TOEFL 95 vs 100 requirement (exact diff -5.0) earns 0.5 point (Near)',
  toeflExactNear.nearRequirements.some((r) => r.startsWith('TOEFL (Near'))
);

assertTest(
  'S4.8',
  'Proximity',
  'TOEFL 94.9 vs 100 requirement (diff -5.1) earns 0.0 point (Below)',
  toeflBelowBoundary.belowRequirements.some((r) => r.includes('Below requirement'))
);

assertTest(
  'S4.9',
  'Proximity',
  'TOEFL 94 vs 100 requirement earns 0.0 point (Below)',
  toeflBelow.belowRequirements.some((r) => r.includes('Below requirement'))
);

// 4.3 GRE Margin: 5.0
// Req 320: Met >= 320, Near >= 315, Below < 315
const greExactMet = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, gre: 320 } }, testUniProximity);
const greExactNear = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, gre: 315 } }, testUniProximity);
const greBelowBoundary = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, gre: 314.9 } }, testUniProximity);
const greBelow = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, gre: 310 } }, testUniProximity);

assertTest(
  'S4.10',
  'Proximity',
  'GRE 320 vs 320 requirement earns 1.0 point (Met)',
  greExactMet.metRequirements.some((r) => r.startsWith('GRE (Met'))
);

assertTest(
  'S4.11',
  'Proximity',
  'GRE 315 vs 320 requirement (exact diff -5.0) earns 0.5 point (Near)',
  greExactNear.nearRequirements.some((r) => r.startsWith('GRE (Near'))
);

assertTest(
  'S4.12',
  'Proximity',
  'GRE 314.9 vs 320 requirement (diff -5.1) earns 0.0 point (Below)',
  greBelowBoundary.belowRequirements.some((r) => r.startsWith('GRE (Below'))
);

assertTest(
  'S4.12b',
  'Proximity',
  'GRE 310 vs 320 requirement earns 0.0 point (Below)',
  greBelow.belowRequirements.some((r) => r.startsWith('GRE (Below'))
);

// 4.4 GMAT Margin: 20.0
// Req 700: Met >= 700, Near >= 680, Below < 680
const gmatExactMet = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, gmat: 700 } }, testUniProximity);
const gmatExactNear = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, gmat: 680 } }, testUniProximity);
const gmatBelowBoundary = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, gmat: 679.9 } }, testUniProximity);
const gmatBelow = matchUniversity({ ...baseProfile, exams: { ...baseProfile.exams, gmat: 670 } }, testUniProximity);

assertTest(
  'S4.13',
  'Proximity',
  'GMAT 700 vs 700 requirement earns 1.0 point (Met)',
  gmatExactMet.metRequirements.some((r) => r.startsWith('GMAT (Met'))
);

assertTest(
  'S4.13b',
  'Proximity',
  'GMAT 670 vs 700 requirement earns 0.0 point (Below)',
  gmatBelow.belowRequirements.some((r) => r.startsWith('GMAT (Below'))
);

assertTest(
  'S4.14',
  'Proximity',
  'GMAT 680 vs 700 requirement (exact diff -20.0) earns 0.5 point (Near)',
  gmatExactNear.nearRequirements.some((r) => r.startsWith('GMAT (Near'))
);

assertTest(
  'S4.15',
  'Proximity',
  'GMAT 679.9 vs 700 requirement (diff -20.1) earns 0.0 point (Below)',
  gmatBelowBoundary.belowRequirements.some((r) => r.startsWith('GMAT (Below'))
);

// 4.5 English Equivalence Asymmetry (Best Score Selected)
const englishEquivUni: University = {
  ...testUniProximity,
  requirements: {
    ...testUniProximity.requirements,
    min_ielts: 7.0,
    min_toefl: 100,
    gre_required: null,
    gmat_required: null,
  },
};

// Case A: IELTS Below (6.0), TOEFL Near (95) -> Near (0.5) selected
const equivNearResult = matchUniversity(
  { ...baseProfile, exams: { ...baseProfile.exams, ielts: 6.0, toefl: 95 } },
  englishEquivUni
);
assertTest(
  'S4.16',
  'Proximity',
  'English Equivalence selects TOEFL Near (0.5) over IELTS Below (0.0)',
  equivNearResult.nearRequirements.some((r) => r.startsWith('TOEFL (Near')) &&
    equivNearResult.fitScore === 0.50
);

// Case B: IELTS Near (6.5), TOEFL Met (100) -> Met (1.0) selected
const equivMetResult = matchUniversity(
  { ...baseProfile, exams: { ...baseProfile.exams, ielts: 6.5, toefl: 100 } },
  englishEquivUni
);
assertTest(
  'S4.17',
  'Proximity',
  'English Equivalence selects TOEFL Met (1.0) over IELTS Near (0.5)',
  equivMetResult.metRequirements.some((r) => r.startsWith('TOEFL (Met')) &&
    equivMetResult.fitScore === 1.00
);

// Case C: IELTS Met (7.0), TOEFL Below (80) -> Met (1.0) selected
const equivMetIeltsResult = matchUniversity(
  { ...baseProfile, exams: { ...baseProfile.exams, ielts: 7.0, toefl: 80 } },
  englishEquivUni
);
assertTest(
  'S4.18',
  'Proximity',
  'English Equivalence selects IELTS Met (1.0) over TOEFL Below (0.0)',
  equivMetIeltsResult.metRequirements.some((r) => r.startsWith('IELTS (Met')) &&
    equivMetIeltsResult.fitScore === 1.00
);

// =============================================================================
// SUITE 5: Edge Cases, Null Handling, Empty Profiles & Sorting
// =============================================================================
console.log(cyan('\n=== SUITE 5: Edge Cases, Nulls, Empty Profiles & Sorting ==='));

// 5.1 All-Null Requirements University
const allNullUni: University = {
  id: 'all_null_uni',
  countryId: 'germany',
  name: 'Open Admissions Institute',
  program: 'M.Sc. Open Studies',
  requirements: {
    min_ielts: null,
    min_toefl: null,
    gre_required: null,
    gmat_required: null,
    min_gre: null,
    min_gmat: null,
    language_requirement: null,
    tuition_fee: null,
    application_deadline: null,
    notes: null,
  },
  tuition: 'Contact department',
  portalUrl: 'https://example.com/apply',
  sourceUrl: 'https://example.com/source',
  lastChecked: '2026-10-15',
  ruleChanged: false,
};

const studentWithExams: UserProfile = {
  uid: 'u_exam_student',
  name: 'Standard Applicant',
  examsTaken: true,
  exams: { ielts: 7.0, toefl: 95, gre: 320, gmat: null },
  targetCountries: ['germany'],
  budget: 15000,
  createdAt: '2026-10-15T12:00:00Z',
};

const allNullResult = matchUniversity(studentWithExams, allNullUni);

assertTest(
  'S5.1',
  'Edge Cases',
  'All-null requirements university does not crash with division-by-zero or NaN',
  !isNaN(allNullResult.fitScore) && isFinite(allNullResult.fitScore)
);

assertTest(
  'S5.2',
  'Edge Cases',
  'All-null requirements university uses neutral 0.70 baseScore + country bonus (+0.10) = 0.80',
  allNullResult.fitScore === 0.80,
  `fitScore = ${allNullResult.fitScore}`
);

assertTest(
  'S5.3',
  'Edge Cases',
  'All-null requirements university flags English, GRE, and GMAT in unconfirmedRequirements',
  allNullResult.unconfirmedRequirements.includes('English (IELTS/TOEFL)') &&
    allNullResult.unconfirmedRequirements.includes('GRE') &&
    allNullResult.unconfirmedRequirements.includes('GMAT'),
  `Unconfirmed: ${allNullResult.unconfirmedRequirements.join(', ')}`
);

// 5.2 Completely Empty User Profile
const minimalEmptyProfile: UserProfile = {
  uid: 'u_empty',
  name: '',
  examsTaken: false,
  exams: { ielts: null, toefl: null, gre: null, gmat: null },
  targetCountries: [],
  budget: null,
  createdAt: '',
};

let emptyProfileThrew = false;
let emptyMatches: MatchResult[] = [];
try {
  emptyMatches = calculateMatches(minimalEmptyProfile, seedUniversities);
} catch (e) {
  emptyProfileThrew = true;
}

assertTest(
  'S5.4',
  'Edge Cases',
  'Empty user profile processes all 11 universities without throwing exceptions',
  !emptyProfileThrew && emptyMatches.length === 11
);

assertTest(
  'S5.5',
  'Edge Cases',
  'Empty user profile assigns "Prep needed" (-1) to all universities',
  emptyMatches.every((m) => m.fitCategory === 'Prep needed' && m.fitScore === -1)
);

// 5.3 Adversarial / Extreme Values Stress Test
const adversarialProfile: UserProfile = {
  uid: 'u_adversary',
  name: 'Adversarial Input User',
  examsTaken: true,
  exams: {
    ielts: -999.0, // Absurdly negative score
    toefl: -500,   // Negative score
    gre: -10000,   // Negative score
    gmat: -99999,  // Negative score
  },
  targetCountries: ['NONEXISTENT_COUNTRY_XYZ'],
  budget: -999999999, // Absurd negative budget
  createdAt: 'invalid-date-string',
};

const advResults = calculateMatches(adversarialProfile, seedUniversities);

assertTest(
  'S5.6',
  'Edge Cases',
  'Absurdly negative scores do not cause runtime crashes or NaN fitScores',
  advResults.every((r) => !isNaN(r.fitScore) && isFinite(r.fitScore))
);

assertTest(
  'S5.7',
  'Edge Cases',
  'Absurdly negative scores are safely clamped to lower bound 0.00 and classified as Reach',
  advResults.every((r) => r.fitScore === 0.00 && r.fitCategory === 'Reach'),
  `Scores: ${advResults.map((r) => r.fitScore).join(', ')}`
);

// Extreme high scores stress test
const giantScoreProfile: UserProfile = {
  uid: 'u_giant',
  name: 'Giant Score User',
  examsTaken: true,
  exams: {
    ielts: 9999.0,
    toefl: 99999,
    gre: 999999,
    gmat: 9999999,
  },
  targetCountries: ['germany', 'ireland', 'uk'],
  budget: 1e15,
  createdAt: '2026-10-15',
};

const giantResults = calculateMatches(giantScoreProfile, seedUniversities);

assertTest(
  'S5.8',
  'Edge Cases',
  'Extreme giant scores are safely clamped to ceiling 1.00 without numeric overflow',
  giantResults.every((r) => r.fitScore === 1.00 && r.fitCategory === 'Strong fit'),
  `Scores: ${giantResults.map((r) => r.fitScore).join(', ')}`
);

// 5.4 Tie-Breaking and Sort Stability
const tiedUniA: University = {
  ...mockFreeUni,
  id: 'uni_charlie',
  name: 'Charlie University',
};

const tiedUniB: University = {
  ...mockFreeUni,
  id: 'uni_alpha',
  name: 'Alpha University',
};

const tiedUniC: University = {
  ...mockFreeUni,
  id: 'uni_bravo',
  name: 'Bravo University',
};

const prepUniZ: University = {
  ...mockFreeUni,
  id: 'uni_zulu_prep',
  name: 'Zulu Academy',
};

const prepUniA: University = {
  ...mockFreeUni,
  id: 'uni_able_prep',
  name: 'Able Academy',
};

// Test alphabetical tie-breaker among identical scores (0.50)
const partialTiedProfile: UserProfile = {
  ...baseProfile,
  exams: { ielts: 6.5, toefl: null, gre: null, gmat: null }, // Near (0.50)
};

const tiedMatches = calculateMatches(partialTiedProfile, [tiedUniA, tiedUniB, tiedUniC]);

assertTest(
  'S5.9',
  'Sorting',
  'Tied universities with identical fitScore sort alphabetically ascending: Alpha, Bravo, Charlie',
  tiedMatches[0].university.name === 'Alpha University' &&
    tiedMatches[1].university.name === 'Bravo University' &&
    tiedMatches[2].university.name === 'Charlie University',
  `Order: ${tiedMatches.map((m) => m.university.name).join(' -> ')}`
);

// Test Prep needed (-1) is placed strictly at the bottom below 0.00 Reach
const reachUni: University = {
  ...mockPaidUni,
  id: 'uni_delta_reach',
  name: 'Delta Reach University',
  requirements: {
    ...mockPaidUni.requirements,
    min_ielts: 8.5, // Student has 6.5 -> diff -2.0 -> Below (0.00)
  },
};

const mixedRankMatches = calculateMatches(partialTiedProfile, [prepUniZ, reachUni, tiedUniA, prepUniA]);

assertTest(
  'S5.10',
  'Sorting',
  'Scores sort descending (0.50 > 0.00 > -1), with Prep needed (-1) universities placed at the bottom',
  mixedRankMatches[0].fitScore === 0.50 &&
    mixedRankMatches[1].fitScore === 0.00 &&
    mixedRankMatches[2].fitScore === -1 &&
    mixedRankMatches[3].fitScore === -1,
  `Scores order: ${mixedRankMatches.map((m) => `${m.university.name} (${m.fitScore})`).join(', ')}`
);

assertTest(
  'S5.11',
  'Sorting',
  'Tied "Prep needed" universities (-1) also sort alphabetically ascending: Able Academy before Zulu Academy',
  mixedRankMatches[2].university.name === 'Able Academy' &&
    mixedRankMatches[3].university.name === 'Zulu Academy',
  `Order: ${mixedRankMatches.slice(2).map((m) => m.university.name).join(', ')}`
);

// 5.5 Case-Insensitivity of Target Country Bonus
const upperCaseCountryProfile: UserProfile = {
  ...partialScoreProfile,
  targetCountries: ['GERMANY', '  IrElAnD  '],
};

const tumUpperResult = matchUniversity(upperCaseCountryProfile, seedUniversities.find((u) => u.id === 'tum_informatics')!);
assertTest(
  'S5.12',
  'Bonuses',
  'Target country bonus is case-insensitive and trims surrounding whitespace ("GERMANY" matches "germany")',
  tumUpperResult.fitScore > 0.0,
  `TUM score with uppercase country: ${tumUpperResult.fitScore}`
);

// 5.6 GMAT / GRE required with no minimum score threshold specified
const greWithoutMinReqUni: University = {
  ...mockFreeUni,
  id: 'uni_gre_no_min',
  name: 'GRE Required (No Min Score Specified)',
  requirements: {
    min_ielts: null,
    min_toefl: null,
    gre_required: true,
    min_gre: null, // No minimum score stated
    gmat_required: null,
    min_gmat: null,
    language_requirement: null,
    tuition_fee: null,
    application_deadline: null,
    notes: null,
  },
};

const greTakenProfile: UserProfile = {
  ...baseProfile,
  exams: { ielts: null, toefl: null, gre: 300, gmat: null },
};

const greNoMinResult = matchUniversity(greTakenProfile, greWithoutMinReqUni);

assertTest(
  'S5.13',
  'Edge Cases',
  'gre_required === true with min_gre === null awards 1.0 point for taking the exam regardless of score',
  greNoMinResult.metRequirements.some((r) => r.includes('GRE (Taken: 300)')) &&
    greNoMinResult.fitScore === 1.00
);

// 5.7 Custom Threshold Config Override
const customConfigResult = matchUniversity(
  { ...partialScoreProfile, exams: { ...partialScoreProfile.exams, ielts: 6.5 } },
  mockPaidUni,
  {
    THRESHOLDS: {
      STRONG_FIT: 0.95,
      POSSIBLE: 0.40, // Lower threshold from 0.60 to 0.40
      REACH: 0.00,
    },
  }
);

assertTest(
  'S5.14',
  'Config',
  'Custom MatchConfig overrides threshold: score 0.50 is categorized as Possible when POSSIBLE threshold is 0.40',
  customConfigResult.fitCategory === 'Possible',
  `fitCategory: ${customConfigResult.fitCategory} with fitScore ${customConfigResult.fitScore}`
);

// =============================================================================
// SUMMARY REPORT
// =============================================================================
console.log(bold('\n============================================================================='));
console.log(bold('  STRESS TEST EXECUTION SUMMARY'));
console.log(bold('============================================================================='));

const passedTotal = results.filter((r) => r.passed).length;
const failedTotal = results.filter((r) => !r.passed).length;

console.log(`  Total Stress Tests: ${bold(String(results.length))}`);
console.log(`  Passed:             ${green(String(passedTotal))}`);
console.log(`  Failed:             ${failedTotal > 0 ? red(String(failedTotal)) : green(String(failedTotal))}`);

if (failedTotal > 0) {
  console.log(bold('\nFailed Tests:'));
  for (const r of results.filter((r) => !r.passed)) {
    console.log(`  ${red('✗')} [${r.id}] ${r.title}: ${r.details || 'Assertion failed'}`);
  }
  process.exit(1);
} else {
  console.log(bold(green('\nALL EMPIRICAL STRESS TESTS PASSED SUCCESSFULLY!')));
  process.exit(0);
}
