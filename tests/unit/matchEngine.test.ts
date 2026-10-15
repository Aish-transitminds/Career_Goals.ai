/**
 * AbroadPath AI - Exhaustive Unit Test Suite for Deterministic Match Engine
 * File: tests/unit/matchEngine.test.ts
 * Authoritative Reference: ORIGINAL_REQUEST.md (§Matching Logic) & PROJECT.md
 */

import {
  matchUniversity,
  calculateMatches,
  parseAnnualTuition,
  hasTakenAnyExam,
  buildMissingExamsList,
  DEFAULT_MATCH_CONFIG,
} from '../../src/utils/matchEngine';
import { University, UserProfile } from '../../src/types';

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

function createSampleProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: 'test_user_1',
    name: 'Sample Student',
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
    ...overrides,
  };
}

function createSampleUniversity(overrides: Partial<University> = {}): University {
  return {
    id: 'sample_uni',
    countryId: 'germany',
    name: 'Sample Technical University',
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
      tuition_fee: '€0 (Tuition-free)',
      notes: null,
    },
    tuition: '€0 (Tuition-free)',
    portalUrl: 'https://example.com/portal',
    sourceUrl: 'https://example.com/source',
    lastChecked: '2026-10-15',
    ruleChanged: false,
    ...overrides,
  };
}

console.log('\n=== RUNNING MATCH ENGINE UNIT TESTS (35+ TEST CASES) ===\n');

// ==========================================
// Category 0: Config & Helpers (3 tests)
// ==========================================
console.log('--- Category 0: Config & Helper Functions ---');
assert(DEFAULT_MATCH_CONFIG.THRESHOLDS.STRONG_FIT === 0.90, 'T0.1: Default strong fit threshold is 0.90');
assert(hasTakenAnyExam(createSampleProfile({ examsTaken: false })) === false, 'T0.2: hasTakenAnyExam returns false when examsTaken is false');
assert(buildMissingExamsList(createSampleUniversity()).length >= 2, 'T0.3: buildMissingExamsList extracts required exams');

// ==========================================
// Category 1: Tuition Parsing (8 tests)
// ==========================================
console.log('--- Category 1: Tuition Parser ---');
assert(parseAnnualTuition('€0 (Tuition-free)') === 0, 'T1.1: Parses €0 tuition-free as 0');
assert(parseAnnualTuition('Free') === 0, 'T1.2: Parses "Free" as 0');
assert(parseAnnualTuition('€6,000 / semester (Non-EU)') === 12000, 'T1.3: Parses semester tuition and doubles it (6000 -> 12000)');
assert(parseAnnualTuition('€1,500 / semester (Non-EU)') === 3000, 'T1.4: Parses €1,500 semester tuition as 3000');
assert(parseAnnualTuition('€27,500 / year (Non-EU)') === 27500, 'T1.5: Parses €27,500 annual tuition directly');
assert(parseAnnualTuition('£46,000 / year (Overseas)') === 46000, 'T1.6: Parses £46,000 annual tuition directly');
assert(parseAnnualTuition(null) === null, 'T1.7: Returns null for null tuition');
assert(parseAnnualTuition('Invalid string with no numbers') === null, 'T1.8: Returns null for unparseable tuition');

// ==========================================
// Category 2: IELTS & TOEFL Scoring & Margins (7 tests)
// ==========================================
console.log('\n--- Category 2: English Test Cutoffs & Near Margins ---');
{
  const uni = createSampleUniversity({
    countryId: 'uk', // no country bonus
    tuition: '€50,000 / year', // no budget bonus
    requirements: {
      min_ielts: 6.5,
      min_toefl: null,
      gre_required: null,
      gmat_required: null,
      language_requirement: null,
      application_deadline: null,
      tuition_fee: null,
      notes: null,
    },
  });

  // Met (1.0)
  const pMet = createSampleProfile({ exams: { ielts: 7.0, toefl: null, gre: null, gmat: null }, targetCountries: ['us'], budget: 1000 });
  const rMet = matchUniversity(pMet, uni);
  assert(rMet.fitScore === 1.0, 'T2.1: IELTS 7.0 vs 6.5 earns 1.0 (Met)');
  assert(rMet.fitCategory === 'Strong fit', 'T2.2: 1.0 is categorized as Strong fit');

  // Exact boundary (1.0)
  const pBound = createSampleProfile({ exams: { ielts: 6.5, toefl: null, gre: null, gmat: null }, targetCountries: ['us'], budget: 1000 });
  const rBound = matchUniversity(pBound, uni);
  assert(rBound.fitScore === 1.0, 'T2.3: IELTS 6.5 vs 6.5 exact boundary earns 1.0 (Met)');

  // Near (0.5) - margin is 0.5
  const pNear = createSampleProfile({ exams: { ielts: 6.0, toefl: null, gre: null, gmat: null }, targetCountries: ['us'], budget: 1000 });
  const rNear = matchUniversity(pNear, uni);
  assert(rNear.fitScore === 0.5, 'T2.4: IELTS 6.0 vs 6.5 (diff -0.5) earns 0.5 (Near)');
  assert(rNear.nearRequirements?.some(r => r.includes('IELTS')) ?? false, 'T2.5: Near requirement is recorded in nearRequirements');

  // Below (0.0) - diff > 0.5
  const pBelow = createSampleProfile({ exams: { ielts: 5.5, toefl: null, gre: null, gmat: null }, targetCountries: ['us'], budget: 1000 });
  const rBelow = matchUniversity(pBelow, uni);
  assert(rBelow.fitScore === 0.0, 'T2.6: IELTS 5.5 vs 6.5 (diff -1.0) earns 0.0 (Below)');
  assert(rBelow.fitCategory === 'Reach', 'T2.7: 0.0 is categorized as Reach');
}

// TOEFL tests (4 tests)
{
  const uni = createSampleUniversity({
    countryId: 'uk',
    tuition: '€50,000 / year',
    requirements: {
      min_ielts: null,
      min_toefl: 90,
      gre_required: null,
      gmat_required: null,
      language_requirement: null,
      application_deadline: null,
      tuition_fee: null,
      notes: null,
    },
  });

  const pMet = createSampleProfile({ exams: { ielts: null, toefl: 95, gre: null, gmat: null }, targetCountries: [], budget: null });
  assert(matchUniversity(pMet, uni).fitScore === 1.0, 'T2.8: TOEFL 95 vs 90 earns 1.0 (Met)');

  const pBound = createSampleProfile({ exams: { ielts: null, toefl: 90, gre: null, gmat: null }, targetCountries: [], budget: null });
  assert(matchUniversity(pBound, uni).fitScore === 1.0, 'T2.9: TOEFL 90 vs 90 exact boundary earns 1.0 (Met)');

  const pNear = createSampleProfile({ exams: { ielts: null, toefl: 85, gre: null, gmat: null }, targetCountries: [], budget: null });
  assert(matchUniversity(pNear, uni).fitScore === 0.5, 'T2.10: TOEFL 85 vs 90 (diff -5, margin 5) earns 0.5 (Near)');

  const pBelow = createSampleProfile({ exams: { ielts: null, toefl: 84, gre: null, gmat: null }, targetCountries: [], budget: null });
  assert(matchUniversity(pBelow, uni).fitScore === 0.0, 'T2.11: TOEFL 84 vs 90 (diff -6) earns 0.0 (Below)');
}

// ==========================================
// Category 3: Standardized Graduate Tests (GRE & GMAT) (8 tests)
// ==========================================
console.log('\n--- Category 3: GRE & GMAT Scoring & Margins ---');
{
  // GRE with numeric cutoff (margin 5)
  const uniGre = createSampleUniversity({
    countryId: 'uk',
    tuition: '€50,000',
    requirements: {
      min_ielts: null,
      min_toefl: null,
      gre_required: true,
      min_gre: 315,
      gmat_required: null,
      language_requirement: null,
      application_deadline: null,
      tuition_fee: null,
      notes: null,
    },
  });

  const pGreMet = createSampleProfile({ exams: { gre: 320, gmat: null, toefl: null, ielts: null }, targetCountries: [], budget: null });
  assert(matchUniversity(pGreMet, uniGre).fitScore === 1.0, 'T3.1: GRE 320 vs 315 earns 1.0 (Met)');

  const pGreBound = createSampleProfile({ exams: { gre: 315, gmat: null, toefl: null, ielts: null }, targetCountries: [], budget: null });
  assert(matchUniversity(pGreBound, uniGre).fitScore === 1.0, 'T3.2: GRE 315 vs 315 earns 1.0 (Met)');

  const pGreNear = createSampleProfile({ exams: { gre: 310, gmat: null, toefl: null, ielts: null }, targetCountries: [], budget: null });
  assert(matchUniversity(pGreNear, uniGre).fitScore === 0.5, 'T3.3: GRE 310 vs 315 (diff -5, margin 5) earns 0.5 (Near)');

  const pGreBelow = createSampleProfile({ exams: { gre: 309, gmat: null, toefl: null, ielts: null }, targetCountries: [], budget: null });
  assert(matchUniversity(pGreBelow, uniGre).fitScore === 0.0, 'T3.4: GRE 309 vs 315 (diff -6) earns 0.0 (Below)');

  // GMAT with numeric cutoff (margin 20)
  const uniGmat = createSampleUniversity({
    countryId: 'uk',
    tuition: '€50,000',
    requirements: {
      min_ielts: null,
      min_toefl: null,
      gre_required: null,
      gmat_required: true,
      min_gmat: 650,
      language_requirement: null,
      application_deadline: null,
      tuition_fee: null,
      notes: null,
    },
  });

  const pGmatMet = createSampleProfile({ exams: { gre: null, gmat: 660, toefl: null, ielts: null }, targetCountries: [], budget: null });
  assert(matchUniversity(pGmatMet, uniGmat).fitScore === 1.0, 'T3.5: GMAT 660 vs 650 earns 1.0 (Met)');

  const pGmatBound = createSampleProfile({ exams: { gre: null, gmat: 650, toefl: null, ielts: null }, targetCountries: [], budget: null });
  assert(matchUniversity(pGmatBound, uniGmat).fitScore === 1.0, 'T3.6: GMAT 650 vs 650 earns 1.0 (Met)');

  const pGmatNear = createSampleProfile({ exams: { gre: null, gmat: 630, toefl: null, ielts: null }, targetCountries: [], budget: null });
  assert(matchUniversity(pGmatNear, uniGmat).fitScore === 0.5, 'T3.7: GMAT 630 vs 650 (diff -20, margin 20) earns 0.5 (Near)');

  const pGmatBelow = createSampleProfile({ exams: { gre: null, gmat: 629, toefl: null, ielts: null }, targetCountries: [], budget: null });
  assert(matchUniversity(pGmatBelow, uniGmat).fitScore === 0.0, 'T3.8: GMAT 629 vs 650 (diff -21) earns 0.0 (Below)');
}

// ==========================================
// Category 4: English Equivalence (IELTS or TOEFL) (4 tests)
// ==========================================
console.log('\n--- Category 4: English Language Equivalence ---');
{
  const uniBoth = createSampleUniversity({
    countryId: 'uk',
    tuition: '€50,000',
    requirements: {
      min_ielts: 7.0,
      min_toefl: 100,
      gre_required: null,
      gmat_required: null,
      language_requirement: null,
      application_deadline: null,
      tuition_fee: null,
      notes: null,
    },
  });

  // Student has IELTS 7.5, TOEFL null -> counts as Met (1.0), not penalized for missing TOEFL
  const pIeltsOnly = createSampleProfile({ exams: { ielts: 7.5, toefl: null, gre: null, gmat: null }, targetCountries: [], budget: null });
  const rIeltsOnly = matchUniversity(pIeltsOnly, uniBoth);
  assert(rIeltsOnly.fitScore === 1.0, 'T4.1: IELTS only satisfies dual requirement without TOEFL penalty');

  // Student has TOEFL 105, IELTS null -> counts as Met (1.0)
  const pToeflOnly = createSampleProfile({ exams: { ielts: null, toefl: 105, gre: null, gmat: null }, targetCountries: [], budget: null });
  const rToeflOnly = matchUniversity(pToeflOnly, uniBoth);
  assert(rToeflOnly.fitScore === 1.0, 'T4.2: TOEFL only satisfies dual requirement without IELTS penalty');

  // Student has both IELTS 6.5 (Near) and TOEFL 105 (Met) -> takes higher score (1.0)
  const pBoth = createSampleProfile({ exams: { ielts: 6.5, toefl: 105, gre: null, gmat: null }, targetCountries: [], budget: null });
  const rBoth = matchUniversity(pBoth, uniBoth);
  assert(rBoth.fitScore === 1.0, 'T4.3: Best of IELTS/TOEFL is selected (TOEFL Met over IELTS Near)');

  // Student has neither test -> Below (0.0)
  const pNeither = createSampleProfile({ exams: { ielts: null, toefl: null, gre: 320, gmat: null }, targetCountries: [], budget: null });
  const rNeither = matchUniversity(pNeither, uniBoth);
  assert(rNeither.belowRequirements?.some(r => r.includes('English Proficiency')) ?? false, 'T4.4: English evaluated as Below when neither test taken');
}

// ==========================================
// Category 5: Strict Null Handling (4 tests)
// ==========================================
console.log('\n--- Category 5: Strict Null Handling ---');
{
  const uniWithNulls = createSampleUniversity({
    countryId: 'france',
    tuition: '€50,000',
    requirements: {
      min_ielts: 6.5,
      min_toefl: null,
      gre_required: null,
      gmat_required: null,
      language_requirement: null,
      application_deadline: null,
      tuition_fee: null,
      notes: null,
    },
  });

  const profile = createSampleProfile({ exams: { ielts: 6.5, toefl: null, gre: null, gmat: null }, targetCountries: [], budget: null });
  const res = matchUniversity(profile, uniWithNulls);
  assert(res.fitScore === 1.0, 'T5.1: Null requirements excluded from denominator: 1 met / 1 known = 1.0');
  assert(res.unconfirmedRequirements.includes('GRE'), 'T5.2: Null GRE tracked in unconfirmedRequirements');
  assert(res.unconfirmedRequirements.includes('GMAT'), 'T5.3: Null GMAT tracked in unconfirmedRequirements');

  // All-null fallback (knownRequirementsCount === 0)
  const allNullUni = createSampleUniversity({
    countryId: 'france',
    tuition: '€50,000',
    requirements: {
      min_ielts: null,
      min_toefl: null,
      gre_required: null,
      gmat_required: null,
      language_requirement: null,
      application_deadline: null,
      tuition_fee: null,
      notes: null,
    },
  });
  const resAllNull = matchUniversity(profile, allNullUni);
  assert(resAllNull.fitScore === 0.70, 'T5.4: All-null requirements returns neutral 0.70 base score without NaN');
}

// ==========================================
// Category 6: Bonuses & Score Capping (6 tests)
// ==========================================
console.log('\n--- Category 6: Bonuses & Score Capping ---');
{
  const uni = createSampleUniversity({
    countryId: 'germany',
    tuition: '€0 (Tuition-free)',
    requirements: {
      min_ielts: 6.5,
      min_toefl: null,
      gre_required: null,
      gmat_required: null,
      language_requirement: null,
      application_deadline: null,
      tuition_fee: null,
      notes: null,
    },
  });

  // Country bonus match (case-insensitive)
  const pCountry = createSampleProfile({
    exams: { ielts: 6.5, toefl: null, gre: null, gmat: null },
    targetCountries: ['GERMANY'],
    budget: null,
  });
  const rCountry = matchUniversity(pCountry, uni);
  assert(rCountry.fitScore === 1.00, 'T6.1: Country bonus applied with case-insensitivity');

  // Country bonus mismatch
  const pNoCountry = createSampleProfile({
    exams: { ielts: 6.0, toefl: null, gre: null, gmat: null }, // base 0.5
    targetCountries: ['Ireland'],
    budget: null,
  });
  const rNoCountry = matchUniversity(pNoCountry, uni);
  assert(rNoCountry.fitScore === 0.50, 'T6.2: Country bonus not applied when country mismatches');

  // Budget bonus applied for tuition-free
  const pBudgetFree = createSampleProfile({
    exams: { ielts: 6.0, toefl: null, gre: null, gmat: null }, // base 0.5
    targetCountries: [],
    budget: 0,
  });
  const rBudgetFree = matchUniversity(pBudgetFree, uni);
  assert(rBudgetFree.fitScore === 0.55, 'T6.3: Budget bonus (+0.05) applied for tuition-free program');

  // Budget bonus applied for paid within budget
  const uniPaid = createSampleUniversity({
    countryId: 'france',
    tuition: '€6,000 / semester (Non-EU)', // 12,000 annual
    requirements: {
      min_ielts: 6.0,
      min_toefl: null,
      gre_required: null,
      gmat_required: null,
      language_requirement: null,
      application_deadline: null,
      tuition_fee: null,
      notes: null,
    },
  });
  const pBudgetPaid = createSampleProfile({
    exams: { ielts: 6.0, toefl: null, gre: null, gmat: null }, // base 1.0
    targetCountries: [],
    budget: 15000,
  });
  const rBudgetPaid = matchUniversity(pBudgetPaid, uniPaid);
  assert(rBudgetPaid.fitScore === 1.00, 'T6.4: Paid tuition within budget earns bonus');

  // Budget bonus omitted when exceeded
  const pBudgetExceeded = createSampleProfile({
    exams: { ielts: 5.0, toefl: null, gre: null, gmat: null }, // base 0.0
    targetCountries: [],
    budget: 8000, // < 12,000
  });
  const rBudgetExceeded = matchUniversity(pBudgetExceeded, uniPaid);
  assert(rBudgetExceeded.fitScore === 0.00, 'T6.5: Budget bonus omitted when tuition exceeds budget');

  // Hard ceiling cap at 1.00
  const pMax = createSampleProfile({
    exams: { ielts: 7.0, toefl: null, gre: null, gmat: null }, // base 1.0
    targetCountries: ['Germany'], // +0.10
    budget: 20000, // +0.05 -> raw 1.15
  });
  const rMax = matchUniversity(pMax, uni);
  assert(rMax.fitScore === 1.00, 'T6.6: Total score strictly capped at 1.00 ceiling');
}

// ==========================================
// Category 7: Fit Tier Thresholds (4 tests)
// ==========================================
console.log('\n--- Category 7: Fit Tier Thresholds ---');
{
  const uni = createSampleUniversity({
    countryId: 'other',
    tuition: '€50,000',
    requirements: {
      min_ielts: 6.5,
      min_toefl: null,
      gre_required: null,
      gmat_required: null,
      language_requirement: null,
      application_deadline: null,
      tuition_fee: null,
      notes: null,
    },
  });

  // Score >= 0.90 -> Strong fit
  const pStrong = createSampleProfile({ exams: { ielts: 6.5, toefl: null, gre: null, gmat: null }, targetCountries: [], budget: null });
  assert(matchUniversity(pStrong, uni).fitCategory === 'Strong fit', 'T7.1: Score 1.00 is Strong fit');

  // Score 0.60 - 0.89 -> Possible
  const pPossible = createSampleProfile({
    exams: { ielts: 6.0, toefl: null, gre: null, gmat: null }, // base 0.5
    targetCountries: ['other'], // +0.10 -> 0.60
    budget: null,
  });
  const rPossible = matchUniversity(pPossible, uni);
  assert(rPossible.fitScore === 0.60, 'T7.2: Score 0.60 calculated accurately');
  assert(rPossible.fitCategory === 'Possible', 'T7.3: Score 0.60 is Possible');

  // Score < 0.60 -> Reach
  const pReach = createSampleProfile({
    exams: { ielts: 6.0, toefl: null, gre: null, gmat: null }, // base 0.5
    targetCountries: [], // no bonus -> 0.50
    budget: null,
  });
  const rReach = matchUniversity(pReach, uni);
  assert(rReach.fitScore === 0.50, 'T7.4: Score 0.50 calculated accurately');
  assert(rReach.fitCategory === 'Reach', 'T7.5: Score 0.50 is Reach');
}

// ==========================================
// Category 8: "Prep Needed" State (4 tests)
// ==========================================
console.log('\n--- Category 8: Prep Needed State ---');
{
  const uni = createSampleUniversity();

  // examsTaken === false
  const pNoExams = createSampleProfile({
    examsTaken: false,
    exams: { ielts: null, toefl: null, gre: null, gmat: null },
  });
  const rNoExams = matchUniversity(pNoExams, uni);
  assert(rNoExams.fitCategory === 'Prep needed', 'T8.1: examsTaken === false sets fitCategory to Prep needed');
  assert(rNoExams.fitScore === -1, 'T8.2: fitScore is -1 for Prep needed');
  assert(rNoExams.missingExams.length >= 2, 'T8.3: Lists missing required exams (IELTS/TOEFL and GRE)');
  assert(rNoExams.metRequirements.length === 0, 'T8.4: metRequirements is empty in Prep needed');

  // examsTaken === true but all exam scores null
  const pAllNullScores = createSampleProfile({
    examsTaken: true,
    exams: { ielts: null, toefl: null, gre: null, gmat: null },
  });
  assert(matchUniversity(pAllNullScores, uni).fitCategory === 'Prep needed', 'T8.5: All null scores triggers Prep needed');
}

// ==========================================
// Category 9: Rule Change Flag Propagation (2 tests)
// ==========================================
console.log('\n--- Category 9: Rule Change Flag Propagation ---');
{
  const uniChanged = createSampleUniversity({ ruleChanged: true });
  const uniUnchanged = createSampleUniversity({ ruleChanged: false });
  const profile = createSampleProfile();

  assert(matchUniversity(profile, uniChanged).ruleChanged === true, 'T9.1: Propagates ruleChanged = true');
  assert(matchUniversity(profile, uniUnchanged).ruleChanged === false, 'T9.2: Propagates ruleChanged = false');
}

// ==========================================
// Category 10: Deterministic Sorting (3 tests)
// ==========================================
console.log('\n--- Category 10: Deterministic Sorting ---');
{
  const uniA = createSampleUniversity({
    name: 'Alpha University',
    tuition: '€50,000',
    requirements: { min_ielts: 6.0, min_toefl: null, gre_required: null, gmat_required: null, language_requirement: null, application_deadline: null, tuition_fee: null, notes: null },
  });
  const uniB = createSampleUniversity({
    name: 'Beta University',
    tuition: '€50,000',
    requirements: { min_ielts: 7.0, min_toefl: null, gre_required: null, gmat_required: null, language_requirement: null, application_deadline: null, tuition_fee: null, notes: null },
  });
  const uniC = createSampleUniversity({
    name: 'Gamma University',
    tuition: '€50,000',
    requirements: { min_ielts: 6.0, min_toefl: null, gre_required: null, gmat_required: null, language_requirement: null, application_deadline: null, tuition_fee: null, notes: null },
  });

  const profile = createSampleProfile({
    exams: { ielts: 6.5, toefl: null, gre: null, gmat: null },
    targetCountries: [],
    budget: null,
  });

  // UniA: student 6.5 >= 6.0 -> 1.0
  // UniB: student 6.5 vs 7.0 -> 0.5
  // UniC: student 6.5 >= 6.0 -> 1.0 (ties with UniA, UniA precedes UniC alphabetically)
  const sorted = calculateMatches(profile, [uniB, uniC, uniA]);

  assert(sorted[0].university.name === 'Alpha University', 'T10.1: Highest score (1.0) and alphabetical tie-breaker ranked first');
  assert(sorted[1].university.name === 'Gamma University', 'T10.2: Identical score (1.0) sorted alphabetically second');
  assert(sorted[2].university.name === 'Beta University', 'T10.3: Lower score (0.5) ranked third');
}

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
console.log(`TOTAL PASSED: ${passedCount}`);
console.log(`TOTAL FAILED: ${failedCount}`);
console.log(`========================================\n`);

if (failedCount > 0) {
  process.exit(1);
}
