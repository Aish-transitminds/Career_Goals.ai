/**
 * AbroadPath AI - Verification Utilities Unit Tests
 * File: tests/unit/verificationUtils.test.ts
 */

import {
  getInstitutionVerificationStatus,
  getProgramVerificationStatus,
  getAccreditationStatus,
  getAdmissionRequirementVerificationStatus,
  getImageVerificationStatus,
  getWebsiteVerificationStatus,
  getDataFreshnessStatus,
  getFreshnessLabel,
  getVerificationStatusLabel,
  getLinkStatusLabel,
  getImageStatusLabel,
  isWikimediaImage,
  findDuplicatePhotos,
  looksLikeOfficialDomain,
} from '../../src/utils/verificationUtils';
import { University } from '../../src/types';

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

function createUniversity(overrides: Partial<University> = {}): University {
  return {
    id: 'test_uni',
    countryId: 'germany',
    name: 'Test University',
    program: 'M.Sc. Computer Science',
    requirements: {
      min_ielts: 6.5,
      min_toefl: 88,
      gre_required: null,
      gmat_required: null,
      min_gre: null,
      min_gmat: null,
      language_requirement: 'IELTS 6.5',
      application_deadline: 'May 31',
      tuition_fee: '€6,000',
      notes: null,
    },
    tuition: '€6,000 / semester',
    portalUrl: 'https://test-uni.edu/apply',
    sourceUrl: 'https://test-uni.edu/program',
    lastChecked: '2026-10-15',
    ruleChanged: false,
    photoUrl: '/images/test.jpg',
    photoCredit: 'Test Photographer',
    photoLicense: 'CC BY 4.0',
    photoSourceUrl: 'https://commons.wikimedia.org/wiki/File:Test.jpg',
    photoLicenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    ...overrides,
  };
}

console.log('\n=== RUNNING VERIFICATION UTILS UNIT TESTS ===\n');

// ==========================================
// Category 1: Institution Verification
// ==========================================
console.log('--- Category 1: Institution Verification ---');
{
  // Fully verified university
  const uniVerified = createUniversity();
  assert(
    getInstitutionVerificationStatus(uniVerified) === 'verified',
    'V1.1: University with source URL, lastChecked, and requirements → verified'
  );

  // Subject-only record (all null requirements + verificationNote)
  const uniSubjectOnly = createUniversity({
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
    },
    lastChecked: undefined,
    verificationNote: 'Not independently verified',
    sourceUrl: 'https://example.edu',
  });
  assert(
    getInstitutionVerificationStatus(uniSubjectOnly) === 'unverified',
    'V1.2: Subject-only record → unverified'
  );

  // Explicit status override
  const uniFlagged = createUniversity({ institutionVerificationStatus: 'flagged' });
  assert(
    getInstitutionVerificationStatus(uniFlagged) === 'flagged',
    'V1.3: Explicit institutionVerificationStatus is respected'
  );

  // Partial: has sourceUrl but no lastChecked
  const uniPartial = createUniversity({ lastChecked: undefined });
  assert(
    getInstitutionVerificationStatus(uniPartial) === 'partially_verified',
    'V1.4: Source URL + requirements but no lastChecked → partially_verified'
  );
}

// ==========================================
// Category 2: Program Verification
// ==========================================
console.log('\n--- Category 2: Program Verification ---');
{
  const uni = createUniversity();
  assert(
    getProgramVerificationStatus(uni) === 'verified',
    'V2.1: Institution verified + program-specific data → program verified'
  );

  const uniNoDeadline = createUniversity({
    requirements: {
      min_ielts: 6.5,
      min_toefl: 88,
      gre_required: null, gmat_required: null,
      min_gre: null, min_gmat: null,
      language_requirement: null,
      application_deadline: null,
      tuition_fee: null,
      notes: null,
    },
  });
  // Still has min_ielts/min_toefl so has program-specific data, but institution is verified
  // With program data and verified institution → verified
  assert(
    getProgramVerificationStatus(uniNoDeadline) === 'verified',
    'V2.2: Has exam requirements + verified institution → verified'
  );

  const uniTrulyEmpty = createUniversity({
    requirements: {
      min_ielts: null, min_toefl: null, gre_required: null, gmat_required: null,
      min_gre: null, min_gmat: null, language_requirement: null,
      application_deadline: null, tuition_fee: null, notes: null,
    },
    lastChecked: undefined,
  });
  assert(
    getProgramVerificationStatus(uniTrulyEmpty) === 'unverified',
    'V2.2b: No program-specific data at all → unverified'
  );

  const uniSubjectOnly = createUniversity({
    requirements: {
      min_ielts: null, min_toefl: null, gre_required: null, gmat_required: null,
      min_gre: null, min_gmat: null, language_requirement: null, application_deadline: null, tuition_fee: null, notes: null,
    },
    lastChecked: undefined,
  });
  assert(
    getProgramVerificationStatus(uniSubjectOnly) === 'unverified',
    'V2.3: Subject-only record → program unverified'
  );
}

// ==========================================
// Category 3: Accreditation Status
// ==========================================
console.log('\n--- Category 3: Accreditation Status ---');
{
  const uni = createUniversity();
  assert(
    getAccreditationStatus(uni) === 'partially_verified',
    'V3.1: Verified institution without explicit accreditation → partially_verified'
  );

  const uniExplicit = createUniversity({ accreditationStatus: 'verified', accreditationBody: 'DAAD' });
  assert(
    getAccreditationStatus(uniExplicit) === 'verified',
    'V3.2: Explicit accreditation status is respected'
  );
}

// ==========================================
// Category 4: Admission Requirement Verification
// ==========================================
console.log('\n--- Category 4: Admission Requirement Verification ---');
{
  const uni = createUniversity();
  assert(
    getAdmissionRequirementVerificationStatus(uni) === 'verified',
    'V4.1: Has lastChecked + sourceUrl + requirements → verified'
  );

  const uniNoCheck = createUniversity({ lastChecked: undefined });
  assert(
    getAdmissionRequirementVerificationStatus(uniNoCheck) === 'partially_verified',
    'V4.2: Has requirements but no lastChecked → partially_verified'
  );
}

// ==========================================
// Category 5: Image Verification
// ==========================================
console.log('\n--- Category 5: Image Verification ---');
{
  const uniWithPhoto = createUniversity();
  assert(
    getImageVerificationStatus(uniWithPhoto) === 'verified_authentic',
    'V5.1: Photo with full attribution → verified_authentic'
  );

  const uniNoPhoto = createUniversity({ photoUrl: undefined, photoCredit: undefined, photoLicense: undefined, photoSourceUrl: undefined });
  assert(
    getImageVerificationStatus(uniNoPhoto) === 'placeholder',
    'V5.2: No photo URL → placeholder'
  );

  const uniPartialPhoto = createUniversity({ photoCredit: undefined, photoLicense: undefined, photoSourceUrl: undefined });
  assert(
    getImageVerificationStatus(uniPartialPhoto) === 'unverified',
    'V5.3: Photo URL without attribution → unverified'
  );

  const uniExplicit = createUniversity({ imageVerificationStatus: 'broken' });
  assert(
    getImageVerificationStatus(uniExplicit) === 'broken',
    'V5.4: Explicit image status is respected'
  );
}

// ==========================================
// Category 6: Website Verification
// ==========================================
console.log('\n--- Category 6: Website Verification ---');
{
  const uni = createUniversity();
  assert(
    getWebsiteVerificationStatus(uni) === 'verified_official',
    'V6.1: Has portalUrl + sourceUrl + lastChecked → verified_official'
  );

  const uniNoCheck = createUniversity({ lastChecked: undefined });
  assert(
    getWebsiteVerificationStatus(uniNoCheck) === 'unverified',
    'V6.2: Has URLs but no lastChecked → unverified'
  );

  const uniExplicit = createUniversity({ websiteVerificationStatus: 'broken' });
  assert(
    getWebsiteVerificationStatus(uniExplicit) === 'broken',
    'V6.3: Explicit website status is respected'
  );
}

// ==========================================
// Category 7: Data Freshness
// ==========================================
console.log('\n--- Category 7: Data Freshness ---');
{
  // Recent date (within 180 days) → fresh
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 30);
  assert(
    getDataFreshnessStatus(recentDate.toISOString()) === 'fresh',
    'V7.1: 30 days ago → fresh'
  );

  // 200 days ago → stale
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - 200);
  assert(
    getDataFreshnessStatus(staleDate.toISOString()) === 'stale',
    'V7.2: 200 days ago → stale'
  );

  // 400 days ago → outdated
  const outdatedDate = new Date();
  outdatedDate.setDate(outdatedDate.getDate() - 400);
  assert(
    getDataFreshnessStatus(outdatedDate.toISOString()) === 'outdated',
    'V7.3: 400 days ago → outdated'
  );

  // No date → never_verified
  assert(
    getDataFreshnessStatus(null) === 'never_verified',
    'V7.4: Null date → never_verified'
  );
  assert(
    getDataFreshnessStatus(undefined) === 'never_verified',
    'V7.5: Undefined date → never_verified'
  );
  assert(
    getDataFreshnessStatus('') === 'never_verified',
    'V7.6: Empty string → never_verified'
  );
}

// ==========================================
// Category 8: Labels
// ==========================================
console.log('\n--- Category 8: Human-Readable Labels ---');
{
  assert(getVerificationStatusLabel('verified') === 'Verified', 'V8.1: verified label');
  assert(getVerificationStatusLabel('partially_verified') === 'Partially verified', 'V8.2: partially_verified label');
  assert(getVerificationStatusLabel('unverified') === 'Not verified', 'V8.3: unverified label');
  assert(getVerificationStatusLabel('flagged') === 'Flagged for review', 'V8.4: flagged label');

  assert(getLinkStatusLabel('verified_official') === 'Verified Official Link', 'V8.5: verified_official link label');
  assert(getLinkStatusLabel('redirected_verified') === 'Redirected and Verified', 'V8.6: redirected_verified link label');
  assert(getLinkStatusLabel('broken') === 'Broken Link', 'V8.7: broken link label');
  assert(getLinkStatusLabel('unverified') === 'Unverified Link', 'V8.8: unverified link label');
  assert(getLinkStatusLabel('outdated') === 'Outdated Information', 'V8.9: outdated link label');

  assert(getImageStatusLabel('verified_authentic') === 'Verified authentic image', 'V8.10: verified_authentic image label');
  assert(getImageStatusLabel('placeholder') === 'No image available', 'V8.11: placeholder image label');

  assert(getFreshnessLabel('fresh') === 'Recently verified', 'V8.12: fresh label');
  assert(getFreshnessLabel('stale') === 'May need re-verification', 'V8.13: stale label');
  assert(getFreshnessLabel('outdated') === 'Outdated — verify before relying', 'V8.14: outdated label');
  assert(getFreshnessLabel('never_verified') === 'Not verified', 'V8.15: never_verified label');
}

// ==========================================
// Category 9: Wikimedia Detection
// ==========================================
console.log('\n--- Category 9: Wikimedia Image Detection ---');
{
  const uniWikimedia = createUniversity({
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/test.jpg',
    photoSourceUrl: 'https://commons.wikimedia.org/wiki/File:Test.jpg',
  });
  assert(isWikimediaImage(uniWikimedia) === true, 'V9.1: Wikimedia URL detected');

  const uniNonWikimedia = createUniversity({
    photoUrl: '/images/local/test.jpg',
    photoSourceUrl: 'https://example.com/photo.jpg',
  });
  assert(isWikimediaImage(uniNonWikimedia) === false, 'V9.2: Non-Wikimedia URL not flagged as Wikimedia');
}

// ==========================================
// Category 10: Duplicate Photo Detection
// ==========================================
console.log('\n--- Category 10: Duplicate Photo Detection ---');
{
  const unis: University[] = [
    createUniversity({ id: 'uni_a', photoUrl: '/images/shared.jpg' }),
    createUniversity({ id: 'uni_b', photoUrl: '/images/shared.jpg' }),
    createUniversity({ id: 'uni_c', photoUrl: '/images/unique.jpg' }),
  ];
  const duplicates = findDuplicatePhotos(unis);
  assert(duplicates.size === 1, 'V10.1: One duplicate URL group found');
  const dupIds = Array.from(duplicates.values())[0];
  assert(dupIds.includes('uni_a') && dupIds.includes('uni_b'), 'V10.2: Both universities sharing URL identified');
}

// ==========================================
// Category 11: Official Domain Check
// ==========================================
console.log('\n--- Category 11: Official Domain Check ---');
{
  assert(
    looksLikeOfficialDomain('https://www.tum.de/en/studies', 'Technical University of Munich') === true,
    'V11.1: TUM domain matches institution name'
  );
  assert(
    looksLikeOfficialDomain('https://www.ox.ac.uk/admissions', 'University of Oxford') === true,
    'V11.2: Oxford .ac.uk domain detected'
  );
  assert(
    looksLikeOfficialDomain('https://random-blog.com/university', 'University of Oxford') === false,
    'V11.3: Random blog domain not flagged as official'
  );
}

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${passedCount + failedCount}`);
console.log(`TOTAL PASSED: ${passedCount}`);
console.log(`TOTAL FAILED: ${failedCount}`);
console.log(`========================================\n`);

if (failedCount > 0) {
  process.exit(1);
}
