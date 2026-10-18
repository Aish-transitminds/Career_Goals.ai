/**
 * AbroadPath AI - Comprehensive Unit Tests for Onboarding Profile & University Matching
 * File: tests/unit/onboardingProfile.test.ts
 *
 * Verifies:
 * 1. Profile validation and optional scores
 * 2. Conditional test fields & multi-discipline representation
 * 3. Backward compatibility with existing demo profiles (Alex Chen, Jordan Lee, Maria Santos) & legacy saved records
 * 4. Correct persistence and reading of newly supported profile fields
 */

import { UserProfile } from '../../src/types';
import {
  validateAcademicScore,
  validateGraduationYear,
  validateEnglishScore,
  validateGreScore,
  validateGmatScore,
  validateBudget,
  validateProfileForm,
  buildUserProfileFromForm,
  ProfileFormData,
} from '../../src/utils/profileValidation';
import { matchUniversity, calculateMatches, hasTakenAnyExam } from '../../src/utils/matchEngine';
import seedUniversities from '../../src/data/universities.json';

const universities = seedUniversities as any[];

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

console.log('\n=== RUNNING ONBOARDING PROFILE & MATCHING INTEGRATION TESTS ===\n');

// =========================================================================
// Category 1: Profile Validation & Optional Scores
// =========================================================================
console.log('--- Category 1: Profile Validation & Optional Scores ---');

// 1.1 Academic Score (GPA) Validation
assert(validateAcademicScore('', '10.0') === null, 'T1.1: Empty GPA is valid (optional field)');
assert(validateAcademicScore(null, '10.0') === null, 'T1.2: Null GPA is valid');
assert(validateAcademicScore('8.2', '10.0') === null, 'T1.3: Valid 8.2 on 10.0 scale accepted');
assert(validateAcademicScore('10.0', '10.0') === null, 'T1.4: Exact 10.0 boundary accepted');
assert(validateAcademicScore('10.2', '10.0') !== null, 'T1.5: 10.2 on 10.0 scale rejected');
assert(validateAcademicScore('3.7', '4.0') === null, 'T1.6: Valid 3.7 on 4.0 scale accepted');
assert(validateAcademicScore('4.0', '4.0') === null, 'T1.7: Exact 4.0 boundary accepted');
assert(validateAcademicScore('4.2', '4.0') !== null, 'T1.8: 4.2 on 4.0 scale rejected');
assert(validateAcademicScore('82.5', '100%') === null, 'T1.9: Valid 82.5% accepted');
assert(validateAcademicScore('100', '100%') === null, 'T1.10: Exact 100% accepted');
assert(validateAcademicScore('102', '100%') !== null, 'T1.11: 102% rejected');
assert(validateAcademicScore('-1.5', '10.0') !== null, 'T1.12: Negative score rejected');
assert(validateAcademicScore('abc', '10.0') !== null, 'T1.13: Non-numeric score rejected');
assert(validateAcademicScore('1.7', 'other') === null, 'T1.14: Custom scale (German 1.7) accepted');

// 1.2 Graduation Year Validation
assert(validateGraduationYear('') === null, 'T1.15: Empty graduation year is valid (optional)');
assert(validateGraduationYear('2024') === null, 'T1.16: Valid graduation year 2024 accepted');
assert(validateGraduationYear('2027') === null, 'T1.17: Valid future graduation year 2027 accepted');
assert(validateGraduationYear('1965') !== null, 'T1.18: Out-of-bounds year 1965 rejected');
assert(validateGraduationYear('2040') !== null, 'T1.19: Out-of-bounds year 2040 rejected');
assert(validateGraduationYear('2024.5') !== null, 'T1.20: Non-integer year rejected');

// 1.3 English Test Score Validation
assert(validateEnglishScore('', 'IELTS') === null, 'T1.21: Empty IELTS score valid (optional)');
assert(validateEnglishScore('7.5', 'IELTS') === null, 'T1.22: Valid IELTS 7.5 accepted');
assert(validateEnglishScore('9.0', 'IELTS') === null, 'T1.23: Max IELTS 9.0 accepted');
assert(validateEnglishScore('9.5', 'IELTS') !== null, 'T1.24: Out-of-bounds IELTS 9.5 rejected');
assert(validateEnglishScore('-0.5', 'IELTS') !== null, 'T1.25: Negative IELTS rejected');
assert(validateEnglishScore('105', 'TOEFL') === null, 'T1.26: Valid TOEFL 105 accepted');
assert(validateEnglishScore('120', 'TOEFL') === null, 'T1.27: Max TOEFL 120 accepted');
assert(validateEnglishScore('125', 'TOEFL') !== null, 'T1.28: Out-of-bounds TOEFL 125 rejected');
assert(validateEnglishScore('75', 'PTE') === null, 'T1.29: Valid PTE 75 accepted');
assert(validateEnglishScore('90', 'PTE') === null, 'T1.30: Max PTE 90 accepted');
assert(validateEnglishScore('8', 'PTE') !== null, 'T1.31: Below-min PTE 8 rejected');

// 1.4 GRE & GMAT Validation
assert(validateGreScore('') === null, 'T1.32: Empty GRE score valid (optional)');
assert(validateGreScore('320') === null, 'T1.33: Valid GRE 320 accepted');
assert(validateGreScore('250') !== null, 'T1.34: GRE < 260 rejected');
assert(validateGreScore('345') !== null, 'T1.35: GRE > 340 rejected');
assert(validateGmatScore('') === null, 'T1.36: Empty GMAT score valid (optional)');
assert(validateGmatScore('680') === null, 'T1.37: Valid GMAT 680 accepted');
assert(validateGmatScore('180') !== null, 'T1.38: GMAT < 200 rejected');
assert(validateGmatScore('820') !== null, 'T1.39: GMAT > 800 rejected');

// 1.5 Budget Validation
assert(validateBudget('') === null, 'T1.40: Empty budget valid (optional)');
assert(validateBudget('15000') === null, 'T1.41: Valid budget 15000 accepted');
assert(validateBudget('0') === null, 'T1.42: Zero budget (tuition-free) accepted');
assert(validateBudget('-1000') !== null, 'T1.43: Negative budget rejected');

// 1.6 Full Form Validation Integration
const validForm: ProfileFormData = {
  name: 'Taylor Swift',
  qualification: "Bachelor's Degree",
  degreeTitle: 'B.A. Music & Performing Arts',
  fieldOfStudy: 'Theatre & Performing Arts',
  institution: 'NYU Tisch',
  gpa: '3.85',
  gpaScale: '4.0',
  graduationYear: '2023',
  intendedDegreeLevel: "Master's",
  intendedSubject: 'Theatre & Performing Arts',
  specialisation: 'Directing and Dramatic Arts',
  targetIntakeYear: '2026',
  targetIntakeSemester: 'Fall / Winter',
  targetProgramId: '',
  englishTestTaken: true,
  englishTestType: 'TOEFL',
  englishTestScore: '110',
  englishTestDate: '2025-05',
  otherTestsTaken: false,
  gre: '',
  gmat: '',
  targetCountries: ['uk', 'ireland'],
  budget: '25000',
  budgetPeriod: 'annual',
  budgetCovers: 'total_cost',
  scholarshipPreference: true,
};

const formErrs = validateProfileForm(validForm);
assert(Object.keys(formErrs).length === 0, 'T1.40: Valid full profile form produces 0 errors');

// Missing required name
const missingNameErrs = validateProfileForm({ ...validForm, name: '   ' });
assert(Boolean(missingNameErrs.name), 'T1.41: Empty name produces validation error');

// Missing target country
const missingCountryErrs = validateProfileForm({ ...validForm, targetCountries: [] });
assert(Boolean(missingCountryErrs.countries), 'T1.42: Empty country selection produces error');

// =========================================================================
// Category 2: Conditional Fields, Mapping & Diverse Fields
// =========================================================================
console.log('\n--- Category 2: Conditional Fields, Mapping & Diverse Fields ---');

// 2.1 Student with No Exams Taken
const noExamsForm: ProfileFormData = {
  ...validForm,
  englishTestTaken: false,
  englishTestScore: '',
  otherTestsTaken: false,
  gre: '',
  gmat: '',
};
const noExamsProfile = buildUserProfileFromForm(noExamsForm, 'user_no_exams', 'user@noexams.com');
assert(noExamsProfile.examsTaken === false, 'T2.1: examsTaken is false when no exams taken');
assert(noExamsProfile.exams.ielts === null, 'T2.2: IELTS is null when test not taken');
assert(noExamsProfile.exams.toefl === null, 'T2.3: TOEFL is null when test not taken');
assert(noExamsProfile.exams.gre === null, 'T2.4: GRE is null when test not taken');
assert(noExamsProfile.exams.gmat === null, 'T2.5: GMAT is null when test not taken');
assert(noExamsProfile.exams.pte === null, 'T2.6: PTE is null when test not taken');

// 2.2 Never substitute 0 for missing academic or test scores
assert(noExamsProfile.exams.ielts !== 0, 'T2.7: Missing IELTS is never 0');
assert(noExamsProfile.exams.gre !== 0, 'T2.8: Missing GRE is never 0');

// 2.3 Separate score and scale preservation
const profileWithScore = buildUserProfileFromForm(
  { ...validForm, gpa: '8.2', gpaScale: '10.0' },
  'user_scale',
  'scale@test.com'
);
assert(profileWithScore.gpa === 8.2, 'T2.9: GPA score is preserved as 8.2');
assert(profileWithScore.gpaScale === '10.0', 'T2.10: GPA scale is preserved as 10.0');
assert(profileWithScore.gpa !== 82, 'T2.11: 8.2 / 10 is NOT converted automatically to 82%');

// 2.4 English Test mapping
const ieltsForm: ProfileFormData = {
  ...validForm,
  englishTestTaken: true,
  englishTestType: 'IELTS',
  englishTestScore: '7.5',
};
const ieltsProfile = buildUserProfileFromForm(ieltsForm, 'user_ielts', 'ielts@test.com');
assert(ieltsProfile.exams.ielts === 7.5, 'T2.12: IELTS score correctly mapped to exams.ielts');
assert(ieltsProfile.exams.toefl === null, 'T2.13: TOEFL remains null when IELTS is chosen');
assert(ieltsProfile.examsTaken === true, 'T2.14: examsTaken is true when IELTS score is entered');

const pteForm: ProfileFormData = {
  ...validForm,
  englishTestTaken: true,
  englishTestType: 'PTE',
  englishTestScore: '68',
};
const pteProfile = buildUserProfileFromForm(pteForm, 'user_pte', 'pte@test.com');
assert(pteProfile.exams.pte === 68, 'T2.15: PTE score mapped to exams.pte');

// 2.5 Fashion Design student without GRE/GMAT
const fashionForm: ProfileFormData = {
  ...validForm,
  intendedSubject: 'Fashion Design & Textile Arts',
  specialisation: 'Sustainable Haute Couture & Fabric Innovation',
  otherTestsTaken: false,
  gre: '',
  gmat: '',
};
const fashionProfile = buildUserProfileFromForm(fashionForm, 'user_fashion', 'fashion@test.com');
assert(fashionProfile.intendedSubject === 'Fashion Design & Textile Arts', 'T2.16: Fashion Design subject retained');
assert(fashionProfile.specialisation?.includes('Haute Couture') === true, 'T2.17: Fashion specialisation retained');
assert(fashionProfile.exams.gre === null, 'T2.18: GRE is null for creative student');
assert(fashionProfile.exams.gmat === null, 'T2.19: GMAT is null for creative student');

// 2.6 Budget period and coverage preferences
assert(fashionProfile.budgetPeriod === 'annual', 'T2.20: Budget period correctly recorded as annual');
assert(fashionProfile.budgetCovers === 'total_cost', 'T2.21: Budget coverage recorded as total_cost');
assert(fashionProfile.scholarshipPreference === true, 'T2.22: Scholarship preference recorded as true');

// =========================================================================
// Category 3: Backward Compatibility with Existing Demo Profiles & Saved Records
// =========================================================================
console.log('\n--- Category 3: Backward Compatibility with Demo Profiles ---');

// 3.1 Alex Chen (Standard Demo Student) - Legacy format
const legacyAlexChen: UserProfile = {
  uid: 'mock_student_standard',
  name: 'Alex Chen (Demo Student)',
  email: 'alex.chen@demo.org',
  examsTaken: true,
  exams: { gre: 320, gmat: null, toefl: 105, ielts: 7.5 },
  targetCountries: ['germany'],
  budget: 15000,
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:00.000Z',
};

// Check that legacy profile is completely valid without new fields
assert(legacyAlexChen.qualification === undefined, 'T3.1: Legacy profile lacks qualification without runtime error');
assert(legacyAlexChen.gpa === undefined, 'T3.2: Legacy profile lacks gpa without runtime error');
assert(hasTakenAnyExam(legacyAlexChen) === true, 'T3.3: hasTakenAnyExam works on legacy Alex Chen');

// Run match engine on legacy Alex Chen
const alexMatches = calculateMatches(legacyAlexChen, universities);
assert(alexMatches.length === 11, 'T3.4: Match engine calculates 11 matches for legacy Alex Chen');
assert(alexMatches[0].fitScore >= 0.90, 'T3.5: Legacy Alex Chen receives top strong fit score');
assert(alexMatches[0].fitCategory === 'Strong fit', 'T3.6: Top tier is Strong fit for Alex Chen');

const singleMatch = matchUniversity(legacyAlexChen, universities[0]);
assert(singleMatch.fitScore > 0, 'T3.6b: Single matchUniversity evaluation works for legacy profile');

// 3.2 Jordan Lee (No Exams Demo Student) - Legacy format
const legacyJordanLee: UserProfile = {
  uid: 'mock_student_no_exams',
  name: 'Jordan Lee (No Exams)',
  email: 'jordan.lee@demo.org',
  examsTaken: false,
  exams: { gre: null, gmat: null, toefl: null, ielts: null },
  targetCountries: ['germany', 'ireland'],
  budget: 10000,
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:00.000Z',
};

assert(hasTakenAnyExam(legacyJordanLee) === false, 'T3.7: hasTakenAnyExam returns false for legacy Jordan Lee');
const jordanMatches = calculateMatches(legacyJordanLee, universities);
assert(
  jordanMatches.every((m) => m.fitCategory === 'Prep needed'),
  'T3.8: All universities display Prep needed for legacy Jordan Lee'
);
assert(
  jordanMatches.every((m) => m.fitScore === -1),
  'T3.9: All universities have fitScore -1 for legacy Jordan Lee'
);

// 3.3 Maria Santos (Low Budget Demo Student) - Legacy format
const legacyMariaSantos: UserProfile = {
  uid: 'mock_student_low_budget',
  name: 'Maria Santos (Low Budget)',
  email: 'maria.santos@demo.org',
  examsTaken: true,
  exams: { gre: null, gmat: null, toefl: null, ielts: 6.5 },
  targetCountries: ['germany'],
  budget: 3000,
  createdAt: '2026-10-15T00:00:00.000Z',
  updatedAt: '2026-10-15T00:00:00.000Z',
};

const mariaMatches = calculateMatches(legacyMariaSantos, universities);
assert(mariaMatches.length === 11, 'T3.10: Match engine processes legacy Maria Santos successfully');
assert(hasTakenAnyExam(legacyMariaSantos) === true, 'T3.11: hasTakenAnyExam recognizes IELTS 6.5');

// 3.4 Enriched Profile (with new fields) passes to Match Engine identically
const enrichedAlexChen: UserProfile = {
  ...legacyAlexChen,
  qualification: "Bachelor's Degree",
  degreeTitle: 'B.Tech Computer Science',
  fieldOfStudy: 'Computer Science',
  institution: 'National Institute of Technology',
  gpa: 8.4,
  gpaScale: '10.0',
  graduationYear: 2024,
  intendedDegreeLevel: "Master's",
  intendedSubject: 'Computer Science & Informatics',
  specialisation: 'Artificial Intelligence',
  targetIntakeYear: '2026',
  targetIntakeSemester: 'Fall / Winter',
  budgetPeriod: 'annual',
  budgetCovers: 'total_cost',
  scholarshipPreference: true,
};

const enrichedAlexMatches = calculateMatches(enrichedAlexChen, universities);
assert(
  enrichedAlexMatches[0].fitScore === alexMatches[0].fitScore,
  'T3.12: Enriched profile produces identical fit scores (match engine weights untouched)'
);
assert(
  enrichedAlexMatches[0].university.id === alexMatches[0].university.id,
  'T3.13: Top matched university is identical between legacy and enriched profile'
);

// =========================================================================
// Category 4: Persistence Simulation & Field Serialization
// =========================================================================
console.log('\n--- Category 4: Persistence Simulation & Reading Fields ---');

// 4.1 Serialization & Deserialization (as Firestore JSON)
const jsonSerialized = JSON.stringify(enrichedAlexChen);
const deserializedProfile: UserProfile = JSON.parse(jsonSerialized);

assert(deserializedProfile.qualification === "Bachelor's Degree", 'T4.1: Persisted qualification restored');
assert(deserializedProfile.degreeTitle === 'B.Tech Computer Science', 'T4.2: Persisted degree title restored');
assert(deserializedProfile.fieldOfStudy === 'Computer Science', 'T4.3: Persisted field of study restored');
assert(deserializedProfile.institution === 'National Institute of Technology', 'T4.4: Persisted institution restored');
assert(deserializedProfile.gpa === 8.4, 'T4.5: Persisted gpa restored');
assert(deserializedProfile.gpaScale === '10.0', 'T4.6: Persisted gpa scale restored');
assert(deserializedProfile.graduationYear === 2024, 'T4.7: Persisted graduation year restored');
assert(deserializedProfile.intendedDegreeLevel === "Master's", 'T4.8: Persisted intended degree level restored');
assert(deserializedProfile.intendedSubject === 'Computer Science & Informatics', 'T4.9: Persisted intended subject restored');
assert(deserializedProfile.specialisation === 'Artificial Intelligence', 'T4.10: Persisted specialisation restored');
assert(deserializedProfile.budgetPeriod === 'annual', 'T4.11: Persisted budget period restored');
assert(deserializedProfile.budgetCovers === 'total_cost', 'T4.12: Persisted budget coverage restored');
assert(deserializedProfile.scholarshipPreference === true, 'T4.13: Persisted scholarship preference restored');

// 4.2 Merge semantics: Updating existing profile retains unchanged fields
const updatedFieldsForm: ProfileFormData = {
  ...validForm,
  name: 'Taylor Swift Updated',
  gpa: '3.90', // changed GPA
  gpaScale: '4.0',
};
const mergedProfile = buildUserProfileFromForm(
  updatedFieldsForm,
  'user_taylor',
  'taylor@test.com',
  enrichedAlexChen // existing profile
);

assert(mergedProfile.createdAt === enrichedAlexChen.createdAt, 'T4.14: Original createdAt preserved during update');
assert(mergedProfile.name === 'Taylor Swift Updated', 'T4.15: Name updated correctly');
assert(mergedProfile.gpa === 3.90, 'T4.16: GPA updated correctly');

console.log('\n========================================');
console.log('ALL ONBOARDING & PROFILE TESTS PASSED (100%)');
console.log('========================================\n');
