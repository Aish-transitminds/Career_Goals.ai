/**
 * AbroadPath AI - Verification Utilities
 * File: src/utils/verificationUtils.ts
 *
 * Provides functions for assessing and labeling verification status of
 * institutions, programs, images, official links, and data freshness.
 * All functions are defensive — they work gracefully when metadata is absent.
 */

import {
  University,
  VerificationStatus,
  ImageVerificationStatus,
  LinkVerificationStatus,
  DataFreshnessStatus,
} from '../types';

// ==========================================
// Institution & Program Verification
// ==========================================

/**
 * Determines the institution verification status for a university record.
 * Falls back to inferring from available metadata when explicit status is absent.
 */
export function getInstitutionVerificationStatus(
  university: University
): VerificationStatus {
  // Use explicit field if present
  if (university.institutionVerificationStatus) {
    return university.institutionVerificationStatus;
  }

  // Infer from data quality
  const hasSourceUrl = !!university.sourceUrl;
  const hasLastChecked = !!university.lastChecked;
  const hasRequirements = university.requirements.min_ielts !== null ||
    university.requirements.min_toefl !== null ||
    university.requirements.gre_required !== null;

  // Subject-university records have all-null requirements and a verification note
  const isSubjectOnlyRecord =
    university.requirements.min_ielts === null &&
    university.requirements.min_toefl === null &&
    university.requirements.gre_required === null &&
    university.requirements.gmat_required === null &&
    university.requirements.tuition_fee === null &&
    !!university.verificationNote;

  if (isSubjectOnlyRecord) {
    return 'unverified';
  }

  if (hasSourceUrl && hasLastChecked && hasRequirements) {
    return 'verified';
  }

  if (hasSourceUrl || hasRequirements) {
    return 'partially_verified';
  }

  return 'unverified';
}

/**
 * Determines the program verification status for a university record.
 */
export function getProgramVerificationStatus(
  university: University
): VerificationStatus {
  if (university.programVerificationStatus) {
    return university.programVerificationStatus;
  }

  // If the institution is verified and has program-specific requirements, infer program verification
  const instStatus = getInstitutionVerificationStatus(university);
  const hasProgramSpecificData =
    university.requirements.application_deadline !== null ||
    university.requirements.tuition_fee !== null ||
    university.requirements.language_requirement !== null ||
    university.requirements.min_ielts !== null ||
    university.requirements.min_toefl !== null ||
    university.requirements.gre_required !== null ||
    university.requirements.gmat_required !== null;

  if (instStatus === 'verified' && hasProgramSpecificData) {
    return 'verified';
  }

  if (hasProgramSpecificData) {
    return 'partially_verified';
  }

  return 'unverified';
}

/**
 * Returns the accreditation status for a university.
 */
export function getAccreditationStatus(
  university: University
): VerificationStatus {
  if (university.accreditationStatus) {
    return university.accreditationStatus;
  }

  // Infer: institutions with verified source URLs and official domains are likely accredited
  const instStatus = getInstitutionVerificationStatus(university);
  if (instStatus === 'verified' || instStatus === 'partially_verified') {
    return 'partially_verified';
  }

  return 'unverified';
}

// ==========================================
// Admission Requirement Verification
// ==========================================

/**
 * Determines whether admission requirements have been verified against official sources.
 */
export function getAdmissionRequirementVerificationStatus(
  university: University
): VerificationStatus {
  if (university.admissionRequirementVerificationStatus) {
    return university.admissionRequirementVerificationStatus;
  }

  const hasLastChecked = !!university.lastChecked;
  const hasSourceUrl = !!university.sourceUrl;
  const hasAnyRequirement =
    university.requirements.min_ielts !== null ||
    university.requirements.min_toefl !== null ||
    university.requirements.gre_required !== null ||
    university.requirements.gmat_required !== null ||
    university.requirements.application_deadline !== null;

  if (hasLastChecked && hasSourceUrl && hasAnyRequirement) {
    return 'verified';
  }

  if (hasAnyRequirement) {
    return 'partially_verified';
  }

  return 'unverified';
}

// ==========================================
// Image Verification
// ==========================================

/**
 * Determines the image verification status for a university.
 * Checks for photoUrl presence, source attribution, and known issues.
 */
export function getImageVerificationStatus(
  university: University
): ImageVerificationStatus {
  if (university.imageVerificationStatus) {
    return university.imageVerificationStatus;
  }

  // No photo URL at all → placeholder
  if (!university.photoUrl) {
    return 'placeholder';
  }

  // Has photo with proper attribution (Wikimedia Commons style)
  if (
    university.photoUrl &&
    university.photoCredit &&
    university.photoLicense &&
    university.photoSourceUrl
  ) {
    return 'verified_authentic';
  }

  // Has photo URL but no attribution metadata
  if (university.photoUrl) {
    return 'unverified';
  }

  return 'placeholder';
}

/**
 * Checks if a photo URL appears to be a Wikimedia Commons image
 * (which provides traceable licensing and source attribution).
 */
export function isWikimediaImage(university: University): boolean {
  const url = university.photoUrl || university.photoSourceUrl || '';
  return (
    url.includes('wikimedia.org') ||
    url.includes('commons.wikimedia.org') ||
    url.includes('upload.wikimedia.org')
  );
}

/**
 * Checks if two universities share the same photo URL (potential duplication).
 */
export function findDuplicatePhotos(
  universities: University[]
): Map<string, string[]> {
  const urlToUniversities = new Map<string, string[]>();

  for (const uni of universities) {
    if (!uni.photoUrl) continue;
    // Normalize: strip query params for comparison
    const normalized = uni.photoUrl.split('?')[0];
    const existing = urlToUniversities.get(normalized);
    if (existing) {
      existing.push(uni.id);
    } else {
      urlToUniversities.set(normalized, [uni.id]);
    }
  }

  // Filter to only return duplicates
  const duplicates = new Map<string, string[]>();
  for (const [url, uniIds] of urlToUniversities) {
    if (uniIds.length > 1) {
      duplicates.set(url, uniIds);
    }
  }

  return duplicates;
}

// ==========================================
// Link Verification
// ==========================================

/**
 * Determines the verification status of a university's official website URL.
 */
export function getWebsiteVerificationStatus(
  university: University
): LinkVerificationStatus {
  if (university.websiteVerificationStatus) {
    return university.websiteVerificationStatus;
  }

  // Infer from homepage/portal URL quality
  const hasPortalUrl = !!university.portalUrl;
  const hasSourceUrl = !!university.sourceUrl;
  const hasLastChecked = !!university.lastChecked;

  if (hasPortalUrl && hasSourceUrl && hasLastChecked) {
    return 'verified_official';
  }

  if (hasPortalUrl || hasSourceUrl) {
    return 'unverified';
  }

  return 'broken';
}

/**
 * Returns the verification status of a specific link type for a university.
 */
export function getLinkStatus(
  university: University,
  linkType: 'homepage' | 'program' | 'admission' | 'tuition' | 'scholarship' | 'application'
): LinkVerificationStatus {
  const statusMap: Record<string, LinkVerificationStatus | undefined> = {
    homepage: university.homepageStatus,
    program: university.programPageStatus,
    admission: university.admissionPageStatus,
    tuition: university.tuitionPageStatus,
    scholarship: university.scholarshipPageStatus,
    application: university.applicationPageStatus,
  };

  const explicitStatus = statusMap[linkType];
  if (explicitStatus) {
    return explicitStatus;
  }

  // Infer based on available URLs
  const hasSourceUrl = !!university.sourceUrl;
  const hasLastChecked = !!university.lastChecked;

  // The sourceUrl typically serves as the program/admission page
  if ((linkType === 'program' || linkType === 'admission') && hasSourceUrl && hasLastChecked) {
    return 'verified_official';
  }

  if ((linkType === 'program' || linkType === 'admission') && hasSourceUrl) {
    return 'unverified';
  }

  // Application page: portalUrl serves this role
  if (linkType === 'application' && university.portalUrl) {
    return university.lastChecked ? 'verified_official' : 'unverified';
  }

  return 'unverified';
}

/**
 * Checks if a URL appears to belong to an official institutional domain.
 * This is a heuristic check — it does not perform live network validation.
 */
export function looksLikeOfficialDomain(url: string, universityName: string): boolean {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const nameWords = universityName
      .toLowerCase()
      .replace(/[(),]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !['the', 'and', 'of', 'for'].includes(w));

    // Check if any significant word from the university name appears in the domain
    const domainParts = hostname.split('.');
    const coreDomain = domainParts.length >= 2
      ? domainParts[domainParts.length - 2]
      : domainParts[0];

    // Common educational domain indicators
    const isEduDomain = hostname.endsWith('.edu') ||
      hostname.endsWith('.ac.uk') ||
      hostname.endsWith('.ac.jp') ||
      hostname.endsWith('.edu.au') ||
      hostname.endsWith('.uni-heidelberg.de') ||
      hostname.endsWith('.tum.de') ||
      hostname.endsWith('.rwth-aachen.de') ||
      hostname.endsWith('.ac.id') ||
      hostname.endsWith('.edu.sg');

    // Check domain against university name keywords
    const nameMatch = nameWords.some((word) => {
      if (word.length < 4) return false;
      return coreDomain.includes(word) || hostname.includes(word.replace(/[^a-z0-9]/g, ''));
    });

    return isEduDomain || nameMatch;
  } catch {
    return false;
  }
}

// ==========================================
// Data Freshness
// ==========================================

/** Stale threshold: 6 months. Outdated threshold: 12 months. */
const STALE_DAYS = 180;
const OUTDATED_DAYS = 365;

/**
 * Determines data freshness from the lastChecked date.
 */
export function getDataFreshnessStatus(
  lastChecked: string | null | undefined
): DataFreshnessStatus {
  if (!lastChecked) {
    return 'never_verified';
  }

  try {
    const checkedDate = new Date(lastChecked);
    if (isNaN(checkedDate.getTime())) {
      return 'never_verified';
    }

    const now = new Date();
    const daysSinceCheck = Math.floor(
      (now.getTime() - checkedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCheck <= STALE_DAYS) {
      return 'fresh';
    }

    if (daysSinceCheck <= OUTDATED_DAYS) {
      return 'stale';
    }

    return 'outdated';
  } catch {
    return 'never_verified';
  }
}

/**
 * Returns a human-readable freshness label.
 */
export function getFreshnessLabel(status: DataFreshnessStatus): string {
  switch (status) {
    case 'fresh':
      return 'Recently verified';
    case 'stale':
      return 'May need re-verification';
    case 'outdated':
      return 'Outdated — verify before relying';
    case 'never_verified':
      return 'Not verified';
    default:
      return 'Unknown';
  }
}

/**
 * Returns a human-readable verification status label.
 */
export function getVerificationStatusLabel(status: VerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'partially_verified':
      return 'Partially verified';
    case 'unverified':
      return 'Not verified';
    case 'flagged':
      return 'Flagged for review';
    default:
      return 'Unknown';
  }
}

/**
 * Returns a human-readable link status label.
 */
export function getLinkStatusLabel(status: LinkVerificationStatus): string {
  switch (status) {
    case 'verified_official':
      return 'Verified Official Link';
    case 'redirected_verified':
      return 'Redirected and Verified';
    case 'broken':
      return 'Broken Link';
    case 'unverified':
      return 'Unverified Link';
    case 'outdated':
      return 'Outdated Information';
    default:
      return 'Unknown';
  }
}

/**
 * Returns a human-readable image verification label.
 */
export function getImageStatusLabel(status: ImageVerificationStatus): string {
  switch (status) {
    case 'verified_authentic':
      return 'Verified authentic image';
    case 'unverified':
      return 'Image not verified';
    case 'broken':
      return 'Broken image';
    case 'duplicate':
      return 'Duplicate image detected';
    case 'misleading':
      return 'Image may be misleading';
    case 'placeholder':
      return 'No image available';
    default:
      return 'Unknown';
  }
}
