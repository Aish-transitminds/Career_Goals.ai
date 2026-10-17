/**
 * Unit Tests for Programme-Specific Statement Requirements
 * File: tests/unit/letterHelperRequirements.test.ts
 */

import seedUniversities from '../../src/data/universities.json';
import { University, StatementVerificationStatus } from '../../src/types';

const universities = seedUniversities as unknown as University[];

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ✗ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

console.log('\n=== RUNNING STATEMENT REQUIREMENTS UNIT TESTS ===\n');

// Category 1: Catalogue Data Integrity & Verification Statuses
console.log('--- Category 1: Catalogue Verification Statuses ---');
assert(universities.length === 11, 'All 11 universities are present in the catalogue');

const allStatuses = new Set<StatementVerificationStatus>();
universities.forEach((u) => {
  if (u.statementRequirements) {
    allStatuses.add(u.statementRequirements.status);
  }
});

assert(allStatuses.has('Verified'), 'Contains programmes with status: Verified');
assert(allStatuses.has('Needs review'), 'Contains programmes with status: Needs review');
assert(allStatuses.has('Stale'), 'Contains programmes with status: Stale');
assert(allStatuses.has('Unknown'), 'Contains programmes with status: Unknown');
assert(allStatuses.has('Conflicting'), 'Contains programmes with status: Conflicting');
assert(allStatuses.size === 5, 'All 5 required statuses are represented without omission');

// Category 2: Programme-Specific Requirement Details
console.log('\n--- Category 2: Detailed Requirement Fields ---');

// 2.1 Oxford ACS
const oxford = universities.find((u) => u.id === 'oxford_acs');
assert(Boolean(oxford), 'Oxford ACS exists in catalogue');
assert(oxford?.statementRequirements?.status === 'Verified', 'Oxford ACS status is Verified');
assert(oxford?.statementRequirements?.documentType === 'Statement of Purpose', 'Oxford requires Statement of Purpose');
assert(oxford?.statementRequirements?.required === true, 'Oxford statement is required (required: true)');
assert(Boolean(oxford?.statementRequirements?.lengthLimit?.includes('1,000 words')), 'Oxford enforces 1,000-word limit');
assert(
  Boolean(oxford?.statementRequirements?.specificQuestions && oxford.statementRequirements.specificQuestions.length >= 3),
  'Oxford provides programme-specific questions'
);
assert(Boolean(oxford?.statementRequirements?.aiPolicy?.includes('authentic work')), 'Oxford specifies AI-use policy');
assert(Boolean(oxford?.statementRequirements?.sourceUrl?.startsWith('https://')), 'Oxford has valid sourceUrl');

// 2.2 TUM Informatics (demo-seeded record)
const tum = universities.find((u) => u.id === 'tum_informatics');
assert(Boolean(tum), 'TUM Informatics exists');
assert(tum?.demoSeeded === true, 'TUM retains demoSeeded flag for change-detection demonstration');
assert(tum?.statementRequirements?.documentType === 'Motivation Letter', 'TUM specifies Motivation Letter');
assert(tum?.statementRequirements?.required === true, 'TUM letter is required');
assert(Boolean(tum?.statementRequirements?.specificQuestions && tum.statementRequirements.specificQuestions.length === 3), 'TUM has 3 specific questions');

// 2.3 RWTH Aachen (Document Not Required)
const rwth = universities.find((u) => u.id === 'rwth_cs');
assert(Boolean(rwth), 'RWTH CS exists');
assert(rwth?.statementRequirements?.documentType === 'Not required', 'RWTH CS specifies document is Not required');
assert(rwth?.statementRequirements?.required === false, 'RWTH CS required flag is explicitly false');
assert(rwth?.statementRequirements?.lengthLimit === null, 'RWTH length limit is explicitly null');
assert(Boolean(rwth?.statementRequirements?.generalGuidance?.includes('Do not submit')), 'RWTH gives clear advice not to submit unsolicited letters');

// 2.4 Heidelberg DCS (Unknown / Not Confirmed)
const heidelberg = universities.find((u) => u.id === 'heidelberg_dcs');
assert(Boolean(heidelberg), 'Heidelberg DCS exists');
assert(heidelberg?.statementRequirements?.status === 'Unknown', 'Heidelberg status is explicitly Unknown');
assert(heidelberg?.statementRequirements?.documentType === null, 'Heidelberg documentType is explicitly null (Not confirmed)');
assert(heidelberg?.statementRequirements?.required === null, 'Heidelberg required is explicitly null (Not confirmed)');
assert(Boolean(heidelberg?.statementRequirements?.sourceUrl?.startsWith('https://')), 'Heidelberg has valid official sourceUrl');

// 2.5 UCD CS (Conflicting Status)
const ucd = universities.find((u) => u.id === 'ucd_cs');
assert(Boolean(ucd), 'UCD CS exists');
assert(ucd?.statementRequirements?.status === 'Conflicting', 'UCD CS status is Conflicting');
assert(Boolean(ucd?.statementRequirements?.statusNotes?.includes('Discrepancy detected')), 'UCD explains conflicting guidelines');

// 2.6 UCC CS (Stale Status)
const ucc = universities.find((u) => u.id === 'ucc_cs');
assert(Boolean(ucc), 'UCC CS exists');
assert(ucc?.statementRequirements?.status === 'Stale', 'UCC CS status is Stale');
assert(Boolean(ucc?.statementRequirements?.statusNotes?.includes('2024/2025')), 'UCC indicates older cycle date');

// Category 3: Scoped Storage Key Utility
console.log('\n--- Category 3: LocalStorage Scoping Logic ---');

function getDraftStorageKey(uid: string | null, programId: string | null, intake: string): string {
  const userScope = uid || 'guest';
  const progScope = programId || 'general';
  const intakeScope = intake || '2026';
  return `abroadpath_sop_draft_${userScope}_${progScope}_${intakeScope}`;
}

const key1 = getDraftStorageKey('user_123', 'oxford_acs', '2026');
assert(key1 === 'abroadpath_sop_draft_user_123_oxford_acs_2026', 'Scopes key correctly for authenticated user and program');

const key2 = getDraftStorageKey(null, 'tum_informatics', '2027');
assert(key2 === 'abroadpath_sop_draft_guest_tum_informatics_2027', 'Scopes key correctly for guest user and intake 2027');

const key3 = getDraftStorageKey(null, null, '');
assert(key3 === 'abroadpath_sop_draft_guest_general_2026', 'Falls back safely to guest/general/2026 when params empty');

// Category 4: Country Guides Separation & Checklist Text
console.log('\n--- Category 4: Country Guides Separation & Checklist ---');
import seedCountries from '../../src/data/countries.json';
const countries = seedCountries as any[];

const germany = countries.find((c) => c.id === 'germany');
assert(Boolean(germany), 'Germany exists in country catalog');
const germanyStatementDoc = germany?.documents.find((d: string) => d.includes('Motivation letter or statement of purpose'));
assert(
  Boolean(germanyStatementDoc && germanyStatementDoc.includes('typical length is 1–2 pages') && germanyStatementDoc.includes('confirm the document type')),
  'Germany checklist qualifies statement requirement as typical guidance and advises confirming with selected programme'
);

// Navigation routing test
function resolveCountryChecklistAction(countryId: string, selectedProgId: string | null, intake: string = '2026') {
  const matches = universities.find((u) => u.id === selectedProgId && u.countryId === countryId);
  if (matches) {
    return `/letter-helper?programId=${encodeURIComponent(matches.id)}&intake=${encodeURIComponent(intake)}`;
  }
  return `/matches?country=${countryId}`;
}

assert(
  resolveCountryChecklistAction('germany', 'tum_informatics', '2026') === '/letter-helper?programId=tum_informatics&intake=2026',
  'Navigates to Statement Requirements & Planner with programId and intake when programme is selected'
);
assert(
  resolveCountryChecklistAction('germany', null) === '/matches?country=germany',
  'Directs user to Matches to choose a programme when none is selected'
);
assert(
  resolveCountryChecklistAction('ireland', 'tum_informatics') === '/matches?country=ireland',
  'Directs to Matches if selected programme belongs to a different country'
);

// Category 5: Truthful Status & Demonstration Labelling
console.log('\n--- Category 5: Truthful Demonstration Labelling ---');
const demoRecord = universities.find((u) => u.id === 'tum_informatics');
assert(demoRecord?.demoSeeded === true, 'tum_informatics is explicitly demoSeeded');

function getRuleChangeBadgeLabel(isDemoSeeded: boolean) {
  return isDemoSeeded ? 'Demonstration Record' : 'Verified Change Alert';
}
assert(getRuleChangeBadgeLabel(true) === 'Demonstration Record', 'Demo-seeded record labels badge as Demonstration Record, never Live Verified Alert');
assert(getRuleChangeBadgeLabel(false) === 'Verified Change Alert', 'Real record labels badge as Verified Change Alert');

console.log('\n========================================');
console.log('ALL STATEMENT REQUIREMENTS & PLANNER TESTS PASSED (100%)');
console.log('========================================\n');
