/**
 * AbroadPath AI - Eligibility Comparison Engine
 * File: src/utils/eligibilityEngine.ts
 *
 * Produces structured student-vs-university requirement comparisons with
 * explicit status labels (Meets / Exceeds / Below / Not Required / Not Verified /
 * Conditional), exact gap calculations, and match explanations.
 *
 * This module is additive — it does not modify the existing matchEngine scoring
 * logic. It builds on top of MatchResult to provide richer display data.
 */

import {
  UserProfile,
  University,
  UniversityRequirements,
  MatchResult,
  EligibilityStatus,
  RequirementComparisonRow,
  EligibilityComparison,
  MatchExplanation,
  EnhancedFitCategory,
  FitCategory,
  RequirementEvaluation,
} from '../types';

// ==========================================
// Status Mapping
// ==========================================

/** Maps the existing RequirementEvaluation to the new EligibilityStatus labels */
export function mapEvaluationToStatus(
  evaluation: RequirementEvaluation
): EligibilityStatus {
  switch (evaluation) {
    case 'MET':
      return 'Meets Requirement';
    case 'NEAR':
      return 'Below Requirement';
    case 'BELOW':
      return 'Below Requirement';
    case 'NOT_REQUIRED':
      return 'Not Required';
    case 'UNCONFIRMED':
      return 'Not Verified';
    default:
      return 'Not Verified';
  }
}

/** Maps the existing FitCategory to the enhanced naming convention */
export function mapFitCategoryToEnhanced(
  fitCategory: FitCategory,
  matchResult: MatchResult
): EnhancedFitCategory {
  // If there are any belowRequirements and the student has taken exams, check eligibility
  if (fitCategory === 'Prep needed') {
    return 'Not Eligible';
  }

  // If there are hard below requirements, it's not eligible
  if (
    matchResult.belowRequirements.length > 0 &&
    matchResult.missingExams.length === 0
  ) {
    // Check if the below requirement is a hard fail (not just missing exam)
    const hardFails = matchResult.belowRequirements.filter(
      (r) => !r.includes('Not taken') && !r.includes('Required but not taken')
    );
    if (hardFails.length > 0) {
      return 'Not Eligible';
    }
  }

  switch (fitCategory) {
    case 'Strong fit':
      return 'Strong Match';
    case 'Possible':
      return 'Moderate Match';
    case 'Reach':
      return 'Ambitious Match';
    default:
      return 'Ambitious Match';
  }
}

// ==========================================
// Individual Comparison Helpers
// ==========================================

/** Calculates the gap between student and required score */
function calculateGap(
  studentScore: number | null,
  requiredScore: number | null
): { gap: number | null; description: string | null } {
  if (studentScore === null || requiredScore === null) {
    return { gap: null, description: null };
  }
  const diff = studentScore - requiredScore;
  if (diff >= 0) {
    return {
      gap: diff,
      description: diff === 0 ? null : `${formatGapValue(diff)} above requirement`,
    };
  }
  return {
    gap: diff,
    description: `${formatGapValue(Math.abs(diff))} below requirement`,
  };
}

/** Formats a gap value with appropriate decimal places */
function formatGapValue(value: number): string {
  if (value < 1 && value > 0) {
    return value.toFixed(1);
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(1);
}

/** Formats a score value for display */
function formatScore(value: number | null | undefined, forceDecimal = false): string | null {
  if (value === null || value === undefined) return null;
  if (forceDecimal) return value.toFixed(1);
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

// ==========================================
// CGPA Comparison
// ==========================================

/**
 * Compares student CGPA/GPA against the university requirement.
 * Handles different grading scales by normalizing to a 0-100 percentage where possible.
 */
function compareCGPA(
  profile: UserProfile,
  req: UniversityRequirements
): RequirementComparisonRow {
  const studentGpa = profile.gpa ?? null;
  const studentScale = profile.gpaScale ?? null;
  const minGpa = req.min_gpa ?? null;
  const reqScale = req.gpa_scale ?? null;
  const minPercentage = req.min_percentage ?? null;

  // If no minimum specified
  if (minGpa === null && minPercentage === null) {
    return {
      parameter: 'CGPA / Academic Score',
      studentScore: studentGpa !== null ? `${formatScore(studentGpa)} / ${studentScale || '?'}` : null,
      universityRequirement: null,
      status: 'Not Required',
      gap: null,
      gapDescription: null,
      note: 'No minimum CGPA published for this program.',
      requirementType: 'informational',
    };
  }

  // If student hasn't provided GPA
  if (studentGpa === null) {
    return {
      parameter: 'CGPA / Academic Score',
      studentScore: null,
      universityRequirement: minGpa !== null
        ? `${formatScore(minGpa)} / ${reqScale || '?'}`
        : minPercentage !== null
        ? `${minPercentage}%`
        : 'Not specified',
      status: 'Not Verified',
      gap: null,
      gapDescription: null,
      note: 'Student has not provided an academic score. This requirement cannot be evaluated.',
      requirementType: 'minimum',
    };
  }

  // If scales match, direct comparison
  if (minGpa !== null && (reqScale === studentScale || (!reqScale && studentScale))) {
    const gapResult = calculateGap(studentGpa, minGpa);
    const status: EligibilityStatus =
      studentGpa > minGpa
        ? 'Exceeds Requirement'
        : studentGpa >= minGpa
        ? 'Meets Requirement'
        : 'Below Requirement';

    return {
      parameter: 'CGPA / Academic Score',
      studentScore: `${formatScore(studentGpa)} / ${studentScale || reqScale || '?'}`,
      universityRequirement: `${formatScore(minGpa)} / ${reqScale || studentScale || '?'}`,
      status,
      gap: gapResult.gap,
      gapDescription: gapResult.description,
      note: status === 'Below Requirement'
        ? `Student score ${formatScore(studentGpa)} is below the minimum ${formatScore(minGpa)}.`
        : null,
      requirementType: 'minimum',
    };
  }

  // If percentage-based requirement
  if (minPercentage !== null && studentScale === '100%') {
    const gapResult = calculateGap(studentGpa, minPercentage);
    const status: EligibilityStatus =
      studentGpa > minPercentage
        ? 'Exceeds Requirement'
        : studentGpa >= minPercentage
        ? 'Meets Requirement'
        : 'Below Requirement';

    return {
      parameter: 'Academic Percentage',
      studentScore: `${formatScore(studentGpa)}%`,
      universityRequirement: `${minPercentage}%`,
      status,
      gap: gapResult.gap,
      gapDescription: gapResult.description,
      note: null,
      requirementType: 'minimum',
    };
  }

  // Scales don't match — cannot directly compare
  return {
    parameter: 'CGPA / Academic Score',
    studentScore: `${formatScore(studentGpa)} / ${studentScale || '?'}`,
    universityRequirement: minGpa !== null
      ? `${formatScore(minGpa)} / ${reqScale || '?'}`
      : minPercentage !== null
      ? `${minPercentage}%`
      : 'Not specified',
    status: 'Not Verified',
    gap: null,
    gapDescription: null,
    note: 'Grading scales differ between student and requirement. Direct comparison not possible without conversion.',
    requirementType: 'minimum',
  };
}

// ==========================================
// IELTS Comparison (Overall + Individual Bands)
// ==========================================

function compareIELTS(
  profile: UserProfile,
  req: UniversityRequirements
): RequirementComparisonRow[] {
  const rows: RequirementComparisonRow[] = [];
  const minIelts = req.min_ielts;
  const exams = profile.exams || {};

  // Overall IELTS
  if (minIelts !== null && minIelts !== undefined) {
    const studentIelts = exams.ielts ?? null;
    const gapResult = calculateGap(studentIelts, minIelts);

    let status: EligibilityStatus;
    if (studentIelts === null) {
      status = 'Not Verified';
    } else if (studentIelts > minIelts) {
      status = 'Exceeds Requirement';
    } else if (studentIelts >= minIelts) {
      status = 'Meets Requirement';
    } else {
      status = 'Below Requirement';
    }

    rows.push({
      parameter: 'IELTS (Overall)',
      studentScore: studentIelts !== null ? formatScore(studentIelts, true) : null,
      universityRequirement: formatScore(minIelts, true),
      status,
      gap: gapResult.gap,
      gapDescription: gapResult.description,
      note: status === 'Below Requirement'
        ? `Student IELTS: ${formatScore(studentIelts, true)}. Required: ${formatScore(minIelts, true)}. Difference: ${formatGapValue(minIelts - (studentIelts || 0))} bands. Status: Does Not Meet Requirement.`
        : studentIelts === null
        ? 'Student has not taken IELTS. TOEFL may be accepted as an alternative.'
        : null,
      requirementType: 'minimum',
    });
  }

  // Individual band requirements
  const bandFields: Array<{
    field: 'ielts_min_reading' | 'ielts_min_writing' | 'ielts_min_speaking' | 'ielts_min_listening';
    examField: 'ieltsReading' | 'ieltsWriting' | 'ieltsSpeaking' | 'ieltsListening';
    label: string;
  }> = [
    { field: 'ielts_min_reading', examField: 'ieltsReading', label: 'IELTS Reading' },
    { field: 'ielts_min_writing', examField: 'ieltsWriting', label: 'IELTS Writing' },
    { field: 'ielts_min_speaking', examField: 'ieltsSpeaking', label: 'IELTS Speaking' },
    { field: 'ielts_min_listening', examField: 'ieltsListening', label: 'IELTS Listening' },
  ];

  for (const { field, examField, label } of bandFields) {
    const minBand = req[field] ?? null;
    if (minBand !== null) {
      const studentBand = exams[examField] ?? null;
      const gapResult = calculateGap(studentBand, minBand);
      let status: EligibilityStatus;
      if (studentBand === null) {
        status = 'Not Verified';
      } else if (studentBand > minBand) {
        status = 'Exceeds Requirement';
      } else if (studentBand >= minBand) {
        status = 'Meets Requirement';
      } else {
        status = 'Below Requirement';
      }

      rows.push({
        parameter: label,
        studentScore: studentBand !== null ? formatScore(studentBand, true) : null,
        universityRequirement: formatScore(minBand, true),
        status,
        gap: gapResult.gap,
        gapDescription: gapResult.description,
        note: studentBand === null ? 'Individual band score not reported.' : null,
        requirementType: 'minimum',
      });
    }
  }

  return rows;
}

// ==========================================
// TOEFL Comparison
// ==========================================

function compareTOEFL(
  profile: UserProfile,
  req: UniversityRequirements
): RequirementComparisonRow {
  const minToefl = req.min_toefl;
  const studentToefl = profile.exams?.toefl ?? null;

  if (minToefl === null || minToefl === undefined) {
    return {
      parameter: 'TOEFL',
      studentScore: studentToefl !== null ? formatScore(studentToefl) : null,
      universityRequirement: null,
      status: 'Not Required',
      gap: null,
      gapDescription: null,
      note: 'TOEFL is not required or IELTS is the primary English test.',
      requirementType: 'informational',
    };
  }

  const gapResult = calculateGap(studentToefl, minToefl);
  let status: EligibilityStatus;
  if (studentToefl === null) {
    status = 'Not Verified';
  } else if (studentToefl > minToefl) {
    status = 'Exceeds Requirement';
  } else if (studentToefl >= minToefl) {
    status = 'Meets Requirement';
  } else {
    status = 'Below Requirement';
  }

  return {
    parameter: 'TOEFL',
    studentScore: studentToefl !== null ? formatScore(studentToefl) : null,
    universityRequirement: formatScore(minToefl),
    status,
    gap: gapResult.gap,
    gapDescription: gapResult.description,
    note: status === 'Below Requirement'
      ? `Student TOEFL: ${formatScore(studentToefl)}. Required: ${formatScore(minToefl)}. Difference: ${formatGapValue(minToefl - (studentToefl || 0))} points. Status: Does Not Meet Requirement.`
      : studentToefl === null
      ? 'Student has not taken TOEFL. IELTS may be accepted as an alternative.'
      : null,
    requirementType: 'minimum',
  };
}

// ==========================================
// GRE Comparison
// ==========================================

function compareGRE(
  profile: UserProfile,
  req: UniversityRequirements
): RequirementComparisonRow {
  const greRequired = req.gre_required;
  const minGre = req.min_gre ?? null;
  const studentGre = profile.exams?.gre ?? null;

  // Not required
  if (greRequired === false) {
    return {
      parameter: 'GRE',
      studentScore: studentGre !== null ? formatScore(studentGre) : null,
      universityRequirement: 'Not required',
      status: 'Not Required',
      gap: null,
      gapDescription: null,
      note: 'GRE is explicitly waived for this program.',
      requirementType: 'informational',
    };
  }

  // Unconfirmed
  if (greRequired === null) {
    return {
      parameter: 'GRE',
      studentScore: studentGre !== null ? formatScore(studentGre) : null,
      universityRequirement: null,
      status: 'Not Verified',
      gap: null,
      gapDescription: null,
      note: 'GRE requirement is not confirmed for this program.',
      requirementType: 'informational',
    };
  }

  // Required
  if (minGre !== null) {
    const gapResult = calculateGap(studentGre, minGre);
    let status: EligibilityStatus;
    if (studentGre === null) {
      status = 'Below Requirement';
    } else if (studentGre > minGre) {
      status = 'Exceeds Requirement';
    } else if (studentGre >= minGre) {
      status = 'Meets Requirement';
    } else {
      status = 'Below Requirement';
    }

    return {
      parameter: 'GRE',
      studentScore: studentGre !== null ? formatScore(studentGre) : null,
      universityRequirement: `Min ${formatScore(minGre)}`,
      status,
      gap: gapResult.gap,
      gapDescription: gapResult.description,
      note: studentGre === null
        ? 'GRE is required but student has not taken it.'
        : status === 'Below Requirement'
        ? `Student GRE: ${formatScore(studentGre)}. Required: ${formatScore(minGre)}. Difference: ${formatGapValue(minGre - (studentGre || 0))} points.`
        : null,
      requirementType: 'minimum',
    };
  }

  // Required but no numeric threshold
  return {
    parameter: 'GRE',
    studentScore: studentGre !== null ? formatScore(studentGre) : null,
    universityRequirement: 'Required',
    status: studentGre !== null ? 'Meets Requirement' : 'Below Requirement',
    gap: null,
    gapDescription: null,
    note: studentGre === null
      ? 'GRE is required but student has not taken it.'
      : 'GRE taken — no specific score threshold published.',
    requirementType: 'minimum',
  };
}

// ==========================================
// GMAT Comparison
// ==========================================

function compareGMAT(
  profile: UserProfile,
  req: UniversityRequirements
): RequirementComparisonRow {
  const gmatRequired = req.gmat_required;
  const minGmat = req.min_gmat ?? null;
  const studentGmat = profile.exams?.gmat ?? null;

  if (gmatRequired === false) {
    return {
      parameter: 'GMAT',
      studentScore: studentGmat !== null ? formatScore(studentGmat) : null,
      universityRequirement: 'Not required',
      status: 'Not Required',
      gap: null,
      gapDescription: null,
      note: 'GMAT is explicitly waived for this program.',
      requirementType: 'informational',
    };
  }

  if (gmatRequired === null) {
    return {
      parameter: 'GMAT',
      studentScore: studentGmat !== null ? formatScore(studentGmat) : null,
      universityRequirement: null,
      status: 'Not Verified',
      gap: null,
      gapDescription: null,
      note: 'GMAT requirement is not confirmed for this program.',
      requirementType: 'informational',
    };
  }

  if (minGmat !== null) {
    const gapResult = calculateGap(studentGmat, minGmat);
    let status: EligibilityStatus;
    if (studentGmat === null) {
      status = 'Below Requirement';
    } else if (studentGmat > minGmat) {
      status = 'Exceeds Requirement';
    } else if (studentGmat >= minGmat) {
      status = 'Meets Requirement';
    } else {
      status = 'Below Requirement';
    }

    return {
      parameter: 'GMAT',
      studentScore: studentGmat !== null ? formatScore(studentGmat) : null,
      universityRequirement: `Min ${formatScore(minGmat)}`,
      status,
      gap: gapResult.gap,
      gapDescription: gapResult.description,
      note: studentGmat === null
        ? 'GMAT is required but student has not taken it.'
        : status === 'Below Requirement'
        ? `Student GMAT: ${formatScore(studentGmat)}. Required: ${formatScore(minGmat)}. Difference: ${formatGapValue(minGmat - (studentGmat || 0))} points.`
        : null,
      requirementType: 'minimum',
    };
  }

  return {
    parameter: 'GMAT',
    studentScore: studentGmat !== null ? formatScore(studentGmat) : null,
    universityRequirement: 'Required',
    status: studentGmat !== null ? 'Meets Requirement' : 'Below Requirement',
    gap: null,
    gapDescription: null,
    note: studentGmat === null
      ? 'GMAT is required but student has not taken it.'
      : 'GMAT taken — no specific score threshold published.',
    requirementType: 'minimum',
  };
}

// ==========================================
// SAT Comparison
// ==========================================

function compareSAT(
  profile: UserProfile,
  req: UniversityRequirements
): RequirementComparisonRow {
  const satRequired = req.sat_required;
  const minSat = req.min_sat ?? null;
  const studentSat = profile.exams?.sat ?? null;

  if (satRequired === false || (satRequired === undefined && minSat === null)) {
    return {
      parameter: 'SAT',
      studentScore: studentSat !== null ? formatScore(studentSat) : null,
      universityRequirement: 'Not required',
      status: 'Not Required',
      gap: null,
      gapDescription: null,
      note: 'SAT is not required for this program.',
      requirementType: 'informational',
    };
  }

  if (satRequired === null || (satRequired === undefined && minSat === null)) {
    return {
      parameter: 'SAT',
      studentScore: studentSat !== null ? formatScore(studentSat) : null,
      universityRequirement: null,
      status: 'Not Verified',
      gap: null,
      gapDescription: null,
      note: 'SAT requirement is not confirmed for this program.',
      requirementType: 'informational',
    };
  }

  if (minSat !== null) {
    const gapResult = calculateGap(studentSat, minSat);
    let status: EligibilityStatus;
    if (studentSat === null) {
      status = 'Below Requirement';
    } else if (studentSat > minSat) {
      status = 'Exceeds Requirement';
    } else if (studentSat >= minSat) {
      status = 'Meets Requirement';
    } else {
      status = 'Below Requirement';
    }

    return {
      parameter: 'SAT',
      studentScore: studentSat !== null ? formatScore(studentSat) : null,
      universityRequirement: `Min ${formatScore(minSat)}`,
      status,
      gap: gapResult.gap,
      gapDescription: gapResult.description,
      note: studentSat === null
        ? 'SAT is required but student has not taken it.'
        : null,
      requirementType: 'minimum',
    };
  }

  return {
    parameter: 'SAT',
    studentScore: studentSat !== null ? formatScore(studentSat) : null,
    universityRequirement: 'Required',
    status: studentSat !== null ? 'Meets Requirement' : 'Below Requirement',
    gap: null,
    gapDescription: null,
    note: studentSat === null
      ? 'SAT is required but student has not taken it.'
      : 'SAT taken — no specific score threshold published.',
    requirementType: 'minimum',
  };
}

// ==========================================
// Portfolio / Audition / Work Experience
// ==========================================

function comparePortfolio(
  profile: UserProfile,
  req: UniversityRequirements
): RequirementComparisonRow | null {
  if (req.portfolio_required === null || req.portfolio_required === undefined) {
    return null;
  }

  if (req.portfolio_required === false) {
    return {
      parameter: 'Portfolio',
      studentScore: profile.hasPortfolio ? 'Submitted' : 'Not provided',
      universityRequirement: 'Not required',
      status: 'Not Required',
      gap: null,
      gapDescription: null,
      note: 'Portfolio is not required for this program.',
      requirementType: 'informational',
    };
  }

  const hasPortfolio = profile.hasPortfolio === true || !!profile.portfolioUrl;
  return {
    parameter: 'Portfolio',
    studentScore: hasPortfolio ? 'Available' : 'Not provided',
    universityRequirement: 'Required',
    status: hasPortfolio ? 'Meets Requirement' : 'Below Requirement',
    gap: null,
    gapDescription: null,
    note: hasPortfolio
      ? null
      : 'A creative portfolio is required for this program. Prepare design work, sketches, or project samples.',
    requirementType: 'minimum',
  };
}

function compareAudition(
  _profile: UserProfile,
  req: UniversityRequirements
): RequirementComparisonRow | null {
  if (req.audition_required === null || req.audition_required === undefined) {
    return null;
  }

  if (req.audition_required === false) {
    return {
      parameter: 'Audition',
      studentScore: 'N/A',
      universityRequirement: 'Not required',
      status: 'Not Required',
      gap: null,
      gapDescription: null,
      note: 'Audition is not required for this program.',
      requirementType: 'informational',
    };
  }

  return {
    parameter: 'Audition',
    studentScore: 'Not scheduled',
    universityRequirement: 'Required',
    status: 'Conditional Requirement',
    gap: null,
    gapDescription: null,
    note: 'An audition or practical assessment is required. Schedule directly with the institution.',
    requirementType: 'minimum',
  };
}

function compareWorkExperience(
  profile: UserProfile,
  req: UniversityRequirements
): RequirementComparisonRow | null {
  if (!req.work_experience_required) {
    return null;
  }

  const studentMonths = profile.workExperienceMonths ?? null;
  const requiredText = req.work_experience_required;
  const studentText = studentMonths !== null ? `${studentMonths} months` : 'Not provided';

  return {
    parameter: 'Work Experience',
    studentScore: studentText,
    universityRequirement: requiredText,
    status: studentMonths !== null ? 'Meets Requirement' : 'Not Verified',
    gap: null,
    gapDescription: null,
    note: studentMonths === null
      ? 'Work experience is required. Student has not provided work experience details.'
      : null,
    requirementType: 'minimum',
  };
}

// ==========================================
// Main: Build Full Comparison Table
// ==========================================

/**
 * Builds a complete structured eligibility comparison between a student profile
 * and a university's program requirements.
 */
export function buildEligibilityComparison(
  profile: UserProfile,
  university: University
): EligibilityComparison {
  const req = university.requirements;
  const rows: RequirementComparisonRow[] = [];

  // CGPA / Academic Score
  rows.push(compareCGPA(profile, req));

  // IELTS (overall + individual bands)
  rows.push(...compareIELTS(profile, req));

  // TOEFL
  rows.push(compareTOEFL(profile, req));

  // GRE
  rows.push(compareGRE(profile, req));

  // GMAT
  rows.push(compareGMAT(profile, req));

  // SAT
  rows.push(compareSAT(profile, req));

  // Portfolio
  const portfolioRow = comparePortfolio(profile, req);
  if (portfolioRow) rows.push(portfolioRow);

  // Audition
  const auditionRow = compareAudition(profile, req);
  if (auditionRow) rows.push(auditionRow);

  // Work Experience
  const workRow = compareWorkExperience(profile, req);
  if (workRow) rows.push(workRow);

  // Determine overall eligibility
  const hardFailRows = rows.filter(
    (r) => r.status === 'Below Requirement' && r.requirementType === 'minimum'
  );
  const unverifiedRows = rows.filter((r) => r.status === 'Not Verified');
  const meetsRows = rows.filter(
    (r) => r.status === 'Meets Requirement' || r.status === 'Exceeds Requirement'
  );

  let overallEligibility: EligibilityComparison['overallEligibility'];
  if (hardFailRows.length > 0) {
    overallEligibility = 'not_eligible';
  } else if (unverifiedRows.length > 0 && meetsRows.length === 0) {
    overallEligibility = 'insufficient_info';
  } else if (unverifiedRows.length > 0) {
    overallEligibility = 'potentially_eligible';
  } else {
    overallEligibility = 'eligible';
  }

  // Build summary
  const summaryParts: string[] = [];
  if (meetsRows.length > 0) {
    summaryParts.push(`${meetsRows.length} requirement(s) met or exceeded`);
  }
  if (hardFailRows.length > 0) {
    summaryParts.push(`${hardFailRows.length} requirement(s) below threshold`);
  }
  if (unverifiedRows.length > 0) {
    summaryParts.push(`${unverifiedRows.length} requirement(s) not verified`);
  }
  const summary = summaryParts.length > 0
    ? summaryParts.join(' · ')
    : 'No specific requirements to compare.';

  return {
    universityId: university.id,
    rows,
    overallEligibility,
    summary,
    hasVerifiedData: university.lastChecked !== undefined && university.lastChecked !== null,
    sourceUrl: university.sourceUrl || null,
    lastChecked: university.lastChecked || null,
  };
}

// ==========================================
// Match Explanation
// ==========================================

/**
 * Produces a human-readable explanation of why a university was recommended,
 * including strengths, concerns, and disclaimers.
 */
export function buildMatchExplanation(
  matchResult: MatchResult,
  profile: UserProfile
): MatchExplanation {
  const strengths: string[] = [];
  const concerns: string[] = [];
  const unverified: string[] = [];

  // Analyze met requirements
  for (const met of matchResult.metRequirements) {
    strengths.push(met);
  }

  // Analyze near requirements
  for (const near of matchResult.nearRequirements) {
    concerns.push(`${near} — within margin of the cutoff`);
  }

  // Analyze below requirements
  for (const below of matchResult.belowRequirements) {
    concerns.push(below);
  }

  // Analyze unconfirmed requirements
  for (const unconf of matchResult.unconfirmedRequirements) {
    unverified.push(`${unconf} requirement not confirmed in our data`);
  }

  // Analyze missing exams
  if (matchResult.missingExams.length > 0) {
    concerns.push(`Missing required exam(s): ${matchResult.missingExams.join(', ')}`);
  }

  // Country match
  if (profile.targetCountries?.length > 0) {
    const isTarget = profile.targetCountries.some(
      (c) => c.toLowerCase() === matchResult.university.countryId.toLowerCase()
    );
    if (isTarget) {
      strengths.push(`Located in a preferred destination (${matchResult.university.countryId})`);
    }
  }

  // Budget match
  if (profile.budget !== null && profile.budget !== undefined) {
    const tuitionLower = matchResult.university.tuition?.toLowerCase();
    if (tuitionLower?.includes('free') || tuitionLower?.includes('€0')) {
      strengths.push('Tuition-free or very low cost program');
    }
  }

  // Build primary reason
  let primaryReason: string;
  switch (matchResult.fitCategory) {
    case 'Strong fit':
      primaryReason = strengths.length > 0
        ? `Strong match: ${strengths.slice(0, 2).join('; ')}`
        : 'Meets all verified academic and language criteria';
      break;
    case 'Possible':
      primaryReason = concerns.length > 0
        ? `Moderate match: ${concerns.slice(0, 2).join('; ')}`
        : 'Meets most verified requirements with minor gaps';
      break;
    case 'Reach':
      primaryReason = 'Ambitious match: competitive program where meeting minimum requirements may not guarantee admission';
      break;
    case 'Prep needed':
      primaryReason = matchResult.missingExams.length > 0
        ? `Preparation needed: requires ${matchResult.missingExams.join(', ')}`
        : 'Additional preparation recommended before applying';
      break;
    default:
      primaryReason = 'Match assessment based on available verified data';
  }

  // Disclaimer
  const disclaimer =
    'Meeting minimum eligibility requirements does not guarantee admission. ' +
    'Admission decisions consider the full applicant pool, program competitiveness, ' +
    'and holistic factors beyond published minimums.';

  // Can estimate probability?
  const canEstimateProbability = false; // We do not manufacture probabilities

  return {
    primaryReason,
    strengths,
    concerns,
    unverified,
    canEstimateProbability,
    disclaimer,
  };
}

/**
 * Convenience function: builds comparison + explanation for a match result.
 */
export function buildFullMatchAnalysis(
  matchResult: MatchResult,
  profile: UserProfile
): {
  comparison: EligibilityComparison;
  explanation: MatchExplanation;
  enhancedCategory: EnhancedFitCategory;
} {
  const comparison = buildEligibilityComparison(profile, matchResult.university);
  const explanation = buildMatchExplanation(matchResult, profile);
  const enhancedCategory = mapFitCategoryToEnhanced(matchResult.fitCategory, matchResult);

  return { comparison, explanation, enhancedCategory };
}
