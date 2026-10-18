/**
 * AbroadPath AI - Profile Validation and Form Mapping Utilities
 * File: src/utils/profileValidation.ts
 * Authoritative Reference: Onboarding Profile Specification (§2, §3, §4, §5)
 */

import {
  UserProfile,
  GradingScale,
  DegreeLevel,
  BudgetPeriod,
  BudgetCoverage,
  EnglishTestType,
} from '../types';

export interface ProfileFormData {
  name: string;
  qualification: string;
  degreeTitle: string;
  fieldOfStudy: string;
  institution: string;
  gpa: string;
  gpaScale: GradingScale;
  graduationYear: string;
  intendedDegreeLevel: DegreeLevel;
  intendedSubject: string;
  specialisation: string;
  targetIntakeYear: string;
  targetIntakeSemester: string;
  targetProgramId: string;
  englishTestTaken: boolean;
  englishTestType: EnglishTestType;
  englishTestScore: string;
  englishTestDate: string;
  otherTestsTaken: boolean;
  gre: string;
  gmat: string;
  targetCountries: string[];
  budget: string;
  budgetPeriod: BudgetPeriod;
  budgetCovers: BudgetCoverage;
  scholarshipPreference: boolean;
}

/**
 * Validates GPA / Academic Score against the selected grading scale.
 * Validates range ONLY when a score is provided. Empty scores are completely valid (optional).
 */
export function validateAcademicScore(
  gpaStr: string | null | undefined,
  gpaScale: GradingScale | string
): string | null {
  if (!gpaStr || gpaStr.trim() === '') {
    return null; // Score is optional; missing score is not an error
  }

  const num = Number(gpaStr);
  if (isNaN(num)) {
    return 'Grade/GPA must be a valid number.';
  }

  if (num < 0) {
    return 'Grade/GPA cannot be negative.';
  }

  switch (gpaScale) {
    case '10.0':
      if (num > 10.0) {
        return 'Score on a 10.0 scale cannot exceed 10.0 (e.g. 8.2).';
      }
      break;
    case '4.0':
      if (num > 4.0) {
        return 'Score on a 4.0 scale cannot exceed 4.0 (e.g. 3.7).';
      }
      break;
    case '100%':
      if (num > 100.0) {
        return 'Percentage score cannot exceed 100%.';
      }
      break;
    case 'other':
    default:
      // Other grading systems (e.g. German 1.0 - 5.0, UK Honours) - must be non-negative
      break;
  }

  return null;
}

/**
 * Validates graduation year (optional, but if provided must be a 4-digit valid year)
 */
export function validateGraduationYear(yearStr: string | null | undefined): string | null {
  if (!yearStr || yearStr.trim() === '') {
    return null; // Optional
  }

  const yearNum = Number(yearStr);
  if (isNaN(yearNum) || !Number.isInteger(yearNum) || yearNum < 1970 || yearNum > 2035) {
    return 'Graduation year must be a 4-digit year between 1970 and 2035.';
  }

  return null;
}

/**
 * Validates English proficiency score based on test type.
 * Validates range ONLY when a score is provided.
 */
export function validateEnglishScore(
  scoreStr: string | null | undefined,
  testType: EnglishTestType | string
): string | null {
  if (!scoreStr || scoreStr.trim() === '') {
    return null; // Optional
  }

  const num = Number(scoreStr);
  if (isNaN(num)) {
    return 'English test score must be a valid number.';
  }

  switch (testType) {
    case 'IELTS':
      if (num < 0.0 || num > 9.0) {
        return 'IELTS Academic score must be between 0.0 and 9.0.';
      }
      break;
    case 'TOEFL':
      if (num < 0 || num > 120) {
        return 'TOEFL iBT score must be between 0 and 120.';
      }
      break;
    case 'PTE':
      if (num < 10 || num > 90) {
        return 'PTE Academic score must be between 10 and 90.';
      }
      break;
    default:
      break;
  }

  return null;
}

/**
 * Validates GRE score (260 - 340) if provided.
 */
export function validateGreScore(greStr: string | null | undefined): string | null {
  if (!greStr || greStr.trim() === '') return null;
  const val = Number(greStr);
  if (isNaN(val) || val < 260 || val > 340) {
    return 'GRE General score must be between 260 and 340.';
  }
  return null;
}

/**
 * Validates GMAT score (200 - 800) if provided.
 */
export function validateGmatScore(gmatStr: string | null | undefined): string | null {
  if (!gmatStr || gmatStr.trim() === '') return null;
  const val = Number(gmatStr);
  if (isNaN(val) || val < 200 || val > 800) {
    return 'GMAT score must be between 200 and 800.';
  }
  return null;
}

/**
 * Validates budget amount
 */
export function validateBudget(budgetStr: string | null | undefined): string | null {
  if (!budgetStr || budgetStr.trim() === '') return null;
  const val = Number(budgetStr);
  if (isNaN(val) || val < 0) {
    return 'Budget must be a positive number or 0.';
  }
  return null;
}

/**
 * Comprehensive profile form validator.
 */
export function validateProfileForm(form: Partial<ProfileFormData>): Record<string, string> {
  const errs: Record<string, string> = {};

  // Name
  if (!form.name || !form.name.trim()) {
    errs.name = 'Please provide your name or preferred display handle.';
  } else if (form.name.length > 500) {
    errs.name = 'Name must be 500 characters or fewer.';
  }

  // Academic Score
  if (form.gpa !== undefined && form.gpa !== null) {
    const gpaErr = validateAcademicScore(form.gpa, form.gpaScale || '10.0');
    if (gpaErr) errs.gpa = gpaErr;
  }

  // Graduation Year
  if (form.graduationYear) {
    const yearErr = validateGraduationYear(form.graduationYear);
    if (yearErr) errs.graduationYear = yearErr;
  }

  // English Proficiency
  if (form.englishTestTaken && form.englishTestScore) {
    const engErr = validateEnglishScore(form.englishTestScore, form.englishTestType || 'IELTS');
    if (engErr) errs.englishScore = engErr;
  }

  // Other Admission Tests
  if (form.otherTestsTaken) {
    if (form.gre) {
      const greErr = validateGreScore(form.gre);
      if (greErr) errs.gre = greErr;
    }
    if (form.gmat) {
      const gmatErr = validateGmatScore(form.gmat);
      if (gmatErr) errs.gmat = gmatErr;
    }
  }

  // Target Countries
  if (!form.targetCountries || form.targetCountries.length === 0) {
    errs.countries = 'Please select at least one target country.';
  }

  // Budget
  if (form.budget) {
    const budgetErr = validateBudget(form.budget);
    if (budgetErr) errs.budget = budgetErr;
  }

  return errs;
}

/**
 * Builds a strict, typed UserProfile from form inputs.
 * Strictly preserves null values for omitted tests or academic scores (NEVER substitutes 0).
 */
export function buildUserProfileFromForm(
  form: ProfileFormData,
  uid: string,
  email: string = '',
  existingProfile?: UserProfile | null
): UserProfile {
  const gpaVal = form.gpa && form.gpa.trim() !== '' ? Number(form.gpa) : null;
  const gradYearVal = form.graduationYear && form.graduationYear.trim() !== ''
    ? parseInt(form.graduationYear, 10)
    : null;

  let ieltsVal: number | null = null;
  let toeflVal: number | null = null;
  let pteVal: number | null = null;

  if (form.englishTestTaken && form.englishTestScore && form.englishTestScore.trim() !== '') {
    const s = Number(form.englishTestScore);
    if (form.englishTestType === 'IELTS') ieltsVal = s;
    else if (form.englishTestType === 'TOEFL') toeflVal = s;
    else if (form.englishTestType === 'PTE') pteVal = s;
  }

  const greVal = form.otherTestsTaken && form.gre && form.gre.trim() !== '' ? Number(form.gre) : null;
  const gmatVal = form.otherTestsTaken && form.gmat && form.gmat.trim() !== '' ? Number(form.gmat) : null;

  const hasAnyExamScores =
    ieltsVal !== null ||
    toeflVal !== null ||
    pteVal !== null ||
    greVal !== null ||
    gmatVal !== null;

  return {
    uid,
    name: form.name.trim().slice(0, 500),
    email,
    examsTaken: hasAnyExamScores,
    exams: {
      gre: greVal,
      gmat: gmatVal,
      toefl: toeflVal,
      ielts: ieltsVal,
      pte: pteVal,
    },
    targetCountries: form.targetCountries,
    budget: form.budget && form.budget.trim() !== '' ? Number(form.budget) : null,
    createdAt: existingProfile?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    // Academic Background
    qualification: form.qualification && form.qualification.trim() !== '' ? form.qualification.trim() : null,
    degreeTitle: form.degreeTitle && form.degreeTitle.trim() !== '' ? form.degreeTitle.trim().slice(0, 200) : null,
    fieldOfStudy: form.fieldOfStudy && form.fieldOfStudy.trim() !== '' ? form.fieldOfStudy.trim().slice(0, 200) : null,
    institution: form.institution && form.institution.trim() !== '' ? form.institution.trim().slice(0, 200) : null,
    gpa: gpaVal,
    gpaScale: gpaVal !== null ? form.gpaScale : (form.gpaScale || null),
    graduationYear: gradYearVal,

    // Intended Studies
    intendedDegreeLevel: form.intendedDegreeLevel || "Master's",
    intendedSubject: form.intendedSubject || 'Computer Science & Informatics',
    specialisation: form.specialisation && form.specialisation.trim() !== '' ? form.specialisation.trim().slice(0, 200) : null,
    targetIntakeYear: form.targetIntakeYear || '2026',
    targetIntakeSemester: form.targetIntakeSemester || 'Fall / Winter',
    targetProgramId: form.targetProgramId && form.targetProgramId.trim() !== '' ? form.targetProgramId.trim() : null,

    // English Proficiency
    englishTestTaken: Boolean(form.englishTestTaken),
    englishTestType: form.englishTestTaken ? form.englishTestType : 'None',
    englishTestScore: form.englishTestTaken && form.englishTestScore && form.englishTestScore.trim() !== ''
      ? Number(form.englishTestScore)
      : null,
    englishTestDate: form.englishTestTaken && form.englishTestDate && form.englishTestDate.trim() !== ''
      ? form.englishTestDate.trim()
      : null,

    // Other Admission Tests
    otherTestsTaken: Boolean(form.otherTestsTaken),

    // Preferences & Budget Details
    budgetPeriod: form.budgetPeriod || 'annual',
    budgetCovers: form.budgetCovers || 'total_cost',
    scholarshipPreference: Boolean(form.scholarshipPreference),
  };
}
