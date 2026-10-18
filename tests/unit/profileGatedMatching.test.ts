/**
 * AbroadPath AI - Profile-Gated Matching Unit Tests
 * File: tests/unit/profileGatedMatching.test.ts
 *
 * Tests the profile readiness gate, empty match results for incomplete profiles,
 * optional test score handling, unmet requirement capping, and legacy profile compat.
 */

import {
  checkProfileReadiness,
  calculateGatedMatches,
  calculateMatches,
  matchUniversity,
} from '../../src/utils/matchEngine';
import { isLegacyProfile } from '../../src/utils/profileValidation';
import { UserProfile, University } from '../../src/types';

let passedCount = 0;
let failedCount = 0;
const failures: string[] = [];

function assert(condition: boolean, desc: string) {
  if (condition) {
    passedCount++;
    console.log('  \u2713 ' + desc);
  } else {
    failedCount++;
    failures.push(desc);
    console.error('  \u2717 FAIL: ' + desc);
  }
}

function createReadyProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    uid: 'test_ready_user',
    name: 'Ready Student',
    email: 'ready@test.org',
    examsTaken: true,
    exams: { ielts: 7.0, toefl: 100, gre: 320, gmat: null },
    targetCountries: ['germany'],
    budget: 15000,
    intendedDegreeLevel: "Master's",
    intendedSubject: 'Computer Science & Informatics',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
      gmat_required: false,
      min_gmat: null,
      language_requirement: null,
      tuition_fee: null,
      application_deadline: 'May 31',
      notes: null,
    },
    tuition: '\u20ac0 (Tuition-free)',
    portalUrl: 'https://example.com/apply',
    sourceUrl: 'https://example.com/admissions',
    lastChecked: '2025-10-01',
    ruleChanged: false,
    ...overrides,
  };
}

const sampleUniversities: University[] = [createSampleUniversity()];

// --- Category 1: Null / Undefined Profile ---
console.log('\n--- Category 1: Null / Undefined Profile Handling ---');
{
  const nullR = checkProfileReadiness(null);
  assert(nullR.isReady === false, 'G1.1: null profile -> isReady = false');
  assert(nullR.missingFields.includes('profile'), 'G1.2: null profile -> missingFields includes profile');
  assert(nullR.reasons.length > 0, 'G1.3: null profile -> reasons non-empty');

  const undefR = checkProfileReadiness(undefined);
  assert(undefR.isReady === false, 'G1.4: undefined profile -> isReady = false');

  const { readiness: gr, matches: gm } = calculateGatedMatches(null, sampleUniversities);
  assert(gr.isReady === false, 'G1.5: calculateGatedMatches(null) -> readiness.isReady = false');
  assert(gm.length === 0, 'G1.6: calculateGatedMatches(null) -> matches = []');
}

// --- Category 2: Incomplete Profiles Are Blocked ---
console.log('\n--- Category 2: Incomplete Profiles Are Blocked ---');
{
  const noName = createReadyProfile({ name: '' });
  const noNameR = checkProfileReadiness(noName);
  assert(noNameR.isReady === false, 'G2.1: Empty name -> isReady = false');
  assert(noNameR.missingFields.includes('name'), 'G2.2: Empty name -> missingFields includes name');

  const noCountries = createReadyProfile({ targetCountries: [] });
  const noCountriesR = checkProfileReadiness(noCountries);
  assert(noCountriesR.isReady === false, 'G2.3: Empty targetCountries -> isReady = false');
  assert(noCountriesR.missingFields.includes('targetCountries'), 'G2.4: Empty countries -> missingFields has targetCountries');

  const noDegree = createReadyProfile({ intendedDegreeLevel: null });
  const noDegreeR = checkProfileReadiness(noDegree);
  assert(noDegreeR.isReady === false, 'G2.5: null intendedDegreeLevel -> isReady = false');
  assert(noDegreeR.missingFields.includes('intendedDegreeLevel'), 'G2.6: Missing degreeLevel -> in missingFields');

  const noSubject = createReadyProfile({ intendedSubject: null });
  const noSubjectR = checkProfileReadiness(noSubject);
  assert(noSubjectR.isReady === false, 'G2.7: null intendedSubject -> isReady = false');
  assert(noSubjectR.missingFields.includes('intendedSubject'), 'G2.8: Missing subject -> in missingFields');

  const multi = createReadyProfile({ name: '', targetCountries: [], intendedSubject: null });
  const multiR = checkProfileReadiness(multi);
  assert(multiR.isReady === false, 'G2.9: Multiple missing -> isReady = false');
  assert(multiR.missingFields.length >= 3, 'G2.10: Multiple missing -> all reported');
}

// --- Category 3: Optional Scores Do NOT Block Readiness ---
console.log('\n--- Category 3: Optional Scores Do Not Block Readiness ---');
{
  const noExams = createReadyProfile({ examsTaken: false, exams: { ielts: null, toefl: null, gre: null, gmat: null } });
  const noExamsR = checkProfileReadiness(noExams);
  assert(noExamsR.isReady === true, 'G3.1: No exam scores -> readiness not blocked');

  const noGre = createReadyProfile({ exams: { ielts: 7.0, toefl: null, gre: null, gmat: null } });
  const noGreR = checkProfileReadiness(noGre);
  assert(noGreR.isReady === true, 'G3.2: Missing GRE -> readiness not blocked');
}

// --- Category 4: Ready Profile Produces Matches ---
console.log('\n--- Category 4: Ready Profile Produces Matches ---');
{
  const r = createReadyProfile();
  const readiness = checkProfileReadiness(r);
  assert(readiness.isReady === true, 'G4.1: Full profile -> isReady = true');
  assert(readiness.missingFields.length === 0, 'G4.2: Full profile -> missingFields empty');

  const { readiness: gR, matches: gM } = calculateGatedMatches(r, sampleUniversities);
  assert(gR.isReady === true, 'G4.3: calculateGatedMatches(ready) -> readiness.isReady = true');
  assert(gM.length > 0, 'G4.4: calculateGatedMatches(ready) -> matches non-empty');
}

// --- Category 5: Unmet Mandatory Requirements Capped at Reach ---
console.log('\n--- Category 5: Unmet Requirements Capped at Reach ---');
{
  const lowGre = createReadyProfile({ exams: { ielts: 7.5, toefl: 105, gre: 290, gmat: null } });
  const uni = createSampleUniversity();
  const result = matchUniversity(lowGre, uni);
  assert(result.belowRequirements.length > 0, 'G5.1: Below-cutoff GRE -> belowRequirements non-empty');
  assert(result.fitCategory === 'Reach', 'G5.2: Unmet GRE -> fitCategory capped at Reach');
  assert(result.fitCategory !== 'Strong fit', 'G5.3: Unmet GRE -> NOT Strong fit');
  assert(result.fitCategory !== 'Possible', 'G5.4: Unmet GRE -> NOT Possible');
  assert(result.isEligible === false, 'G5.5: Unmet GRE -> isEligible = false');

  const lowIelts = createReadyProfile({ exams: { ielts: 5.5, toefl: null, gre: 320, gmat: null } });
  const uniIelts = createSampleUniversity({ requirements: { min_ielts: 7.0, min_toefl: null, gre_required: false, min_gre: null, gmat_required: false, min_gmat: null, language_requirement: null, tuition_fee: null, application_deadline: null, notes: null } });
  const ieltsResult = matchUniversity(lowIelts, uniIelts);
  assert(ieltsResult.belowRequirements.some(r2 => r2.includes('English') || r2.includes('IELTS')), 'G5.6: Below IELTS -> belowRequirements has English/IELTS');
  assert(ieltsResult.fitCategory === 'Reach', 'G5.7: Below IELTS -> capped at Reach');
  assert(ieltsResult.isEligible === false, 'G5.8: Below IELTS -> isEligible = false');
}

// --- Category 6: Met Requirements -> isEligible = true ---
console.log('\n--- Category 6: Met Requirements -> isEligible = true ---');
{
  const r = createReadyProfile({ exams: { ielts: 7.5, toefl: 105, gre: 320, gmat: null }, budget: 20000 });
  const uni = createSampleUniversity();
  const result = matchUniversity(r, uni);
  assert(result.isEligible === true, 'G6.1: All requirements met -> isEligible = true');
  assert(result.belowRequirements.length === 0, 'G6.2: All requirements met -> belowRequirements empty');
  assert(result.fitCategory !== 'Prep needed', 'G6.3: Exam scores present -> NOT Prep needed');
}

// --- Category 7: Unconfirmed Requirements Stay Unconfirmed ---
console.log('\n--- Category 7: Unconfirmed Requirements ---');
{
  const r = createReadyProfile({ exams: { ielts: 7.0, toefl: 100, gre: null, gmat: null } });
  const uniUnconf = createSampleUniversity({ requirements: { min_ielts: 6.5, min_toefl: 88, gre_required: null, min_gre: null, gmat_required: null, min_gmat: null, language_requirement: null, tuition_fee: null, application_deadline: null, notes: null } });
  const result = matchUniversity(r, uniUnconf);
  assert(result.unconfirmedRequirements.length > 0, 'G7.1: null gre/gmat_required -> unconfirmedRequirements non-empty');
  assert(!result.belowRequirements.some(x => x.toUpperCase().includes('GRE') || x.toUpperCase().includes('GMAT')), 'G7.2: Unconfirmed GRE/GMAT NOT in belowRequirements');
}

// --- Category 8: Legacy / Demo Profiles Pass Readiness ---
console.log('\n--- Category 8: Legacy / Demo Profile Backward Compatibility ---');
{
  const legacyAlex: UserProfile = { uid: 'mock_student_standard', name: 'Alex Chen (Demo Student)', email: 'alex.chen@demo.org', examsTaken: true, exams: { gre: 320, gmat: null, toefl: 105, ielts: 7.5 }, targetCountries: ['germany'], budget: 15000, createdAt: '2026-10-15T00:00:00.000Z', updatedAt: '2026-10-15T00:00:00.000Z' };
  assert(isLegacyProfile(legacyAlex) === true, 'G8.1: Alex Chen mock_student_ uid -> isLegacyProfile = true');
  assert(checkProfileReadiness(legacyAlex).isReady === true, 'G8.2: Legacy Alex Chen -> readiness passes');

  const legacyJordan: UserProfile = { uid: 'mock_student_no_exams', name: 'Jordan Lee (No Exams)', email: 'jordan.lee@demo.org', examsTaken: false, exams: { gre: null, gmat: null, toefl: null, ielts: null }, targetCountries: ['germany', 'ireland'], budget: 10000, createdAt: '2026-10-15T00:00:00.000Z', updatedAt: '2026-10-15T00:00:00.000Z' };
  assert(isLegacyProfile(legacyJordan) === true, 'G8.3: Jordan Lee mock_student_ uid -> isLegacyProfile = true');
  assert(checkProfileReadiness(legacyJordan).isReady === true, 'G8.4: Legacy Jordan Lee -> readiness passes');

  const legacyMaria: UserProfile = { uid: 'mock_student_low_budget', name: 'Maria Santos (Low Budget)', email: 'maria.santos@demo.org', examsTaken: true, exams: { gre: null, gmat: null, toefl: null, ielts: 6.5 }, targetCountries: ['germany'], budget: 3000, createdAt: '2026-10-15T00:00:00.000Z', updatedAt: '2026-10-15T00:00:00.000Z' };
  assert(isLegacyProfile(legacyMaria) === true, 'G8.5: Maria Santos mock_student_ uid -> isLegacyProfile = true');
  assert(checkProfileReadiness(legacyMaria).isReady === true, 'G8.6: Legacy Maria Santos -> readiness passes');

  const structureLegacy: UserProfile = { uid: 'some_firestore_uid', name: 'Old Format Student', examsTaken: true, exams: { gre: null, gmat: null, toefl: null, ielts: 7.0 }, targetCountries: ['germany'], budget: 12000, createdAt: '2025-01-01T00:00:00.000Z' };
  assert(isLegacyProfile(structureLegacy) === true, 'G8.7: Old-format profile without extended fields -> isLegacyProfile = true');
  assert(checkProfileReadiness(structureLegacy).isReady === true, 'G8.8: Old-format legacy -> readiness passes (backward compat)');
}

// --- Category 9: New-format Profile With Missing Fields -> Not Ready ---
console.log('\n--- Category 9: New-format Profile With Missing Fields ---');
{
  const newIncomplete: UserProfile = { uid: 'new_user_xyz', name: 'New Student', examsTaken: false, exams: { gre: null, gmat: null, toefl: null, ielts: null }, targetCountries: ['ireland'], budget: 12000, intendedDegreeLevel: "Master's", intendedSubject: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  assert(isLegacyProfile(newIncomplete) === false, 'G9.1: New-format profile with empty subject -> NOT legacy');
  const r = checkProfileReadiness(newIncomplete);
  assert(r.isReady === false, 'G9.2: New-format empty subject -> isReady = false');
  assert(r.missingFields.includes('intendedSubject'), 'G9.3: Empty subject -> missingFields includes intendedSubject');
}

// --- Category 10: calculateGatedMatches vs calculateMatches Parity ---
console.log('\n--- Category 10: calculateGatedMatches Parity ---');
{
  const ready = createReadyProfile();
  const unis = [createSampleUniversity(), createSampleUniversity({ id: 'sample_uni_2', name: 'Another University' })];
  const { matches: gated } = calculateGatedMatches(ready, unis);
  const direct = calculateMatches(ready, unis);
  assert(gated.length === direct.length, 'G10.1: Ready profile -> gated and direct match counts agree');
  assert(gated[0].fitScore === direct[0].fitScore, 'G10.2: Ready profile -> gated and direct top scores agree');

  const incomplete = createReadyProfile({ intendedSubject: null });
  const { matches: gatedIncomplete } = calculateGatedMatches(incomplete, unis);
  assert(gatedIncomplete.length === 0, 'G10.3: Incomplete profile -> calculateGatedMatches returns []');
}

// --- Summary ---
console.log('\n==================================================================');
console.log('Profile-Gated Matching Tests: ' + passedCount + ' passed, ' + failedCount + ' failed');
if (failures.length > 0) {
  console.error('\nFailed assertions:');
  failures.forEach(f => console.error('  x ' + f));
}
console.log('==================================================================\n');
if (failedCount > 0) { process.exit(1); }
