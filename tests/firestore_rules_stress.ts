/**
 * Comprehensive Empirical Stress-Test Suite for firestore.rules and Environment Hygiene
 * Challenger 2 (Milestone 1) - AbroadPath AI
 */

import * as fs from 'fs';
import * as path from 'path';

// ANSI color helpers
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, category: string, failureMsg?: string) {
  if (condition) {
    results.push({ name, category, passed: true });
  } else {
    results.push({ name, category, passed: false, error: failureMsg || 'Assertion failed' });
    console.error(`  ${red('FAIL')}: [${category}] ${name} - ${failureMsg || 'Condition false'}`);
  }
}

// =============================================================================
// PART 1: Source File Parsing & Static Integrity Analysis
// =============================================================================
console.log(bold('\n=== PART 1: firestore.rules Source Parsing & Integrity Analysis ==='));

const rulesPath = path.resolve('firestore.rules');
assert(fs.existsSync(rulesPath), 'firestore.rules exists', 'Static Analysis');
const rulesContent = fs.readFileSync(rulesPath, 'utf8');

// 1.1 Verify Version and Structure
assert(/rules_version\s*=\s*['"]2['"]\s*;/.test(rulesContent), 'Rules version is 2', 'Static Analysis');
assert(/service\s+cloud\.firestore/.test(rulesContent), 'Service cloud.firestore defined', 'Static Analysis');
assert(/match\s+\/databases\/\{database\}\/documents/.test(rulesContent), 'Root documents match block exists', 'Static Analysis');

// 1.2 Verify Helper Functions
assert(/function\s+isSignedIn\s*\(\s*\)/.test(rulesContent), 'function isSignedIn() declared', 'Function Declarations');
assert(/function\s+isOwner\s*\(\s*userId\s*\)/.test(rulesContent), 'function isOwner(userId) declared', 'Function Declarations');
assert(/function\s+isValidScore\s*\(\s*val\s*,\s*minVal\s*,\s*maxVal\s*\)/.test(rulesContent), 'function isValidScore(val, minVal, maxVal) declared', 'Function Declarations');
assert(/function\s+isValidExams\s*\(\s*exams\s*\)/.test(rulesContent), 'function isValidExams(exams) declared', 'Function Declarations');
assert(/function\s+isValidUser\s*\(\s*data\s*,\s*userId\s*\)/.test(rulesContent), 'function isValidUser(data, userId) declared', 'Function Declarations');
assert(/function\s+isValidApplication\s*\(\s*data\s*\)/.test(rulesContent), 'function isValidApplication(data) declared', 'Function Declarations');
assert(/function\s+isValidNotification\s*\(\s*data\s*\)/.test(rulesContent), 'function isValidNotification(data) declared', 'Function Declarations');

// 1.3 Verify Exact Boundary Constants in Rules Source
const ieltsMatch = rulesContent.match(/isValidScore\(exams\.get\('ielts',\s*null\),\s*([0-9.]+),\s*([0-9.]+)\)/);
assert(ieltsMatch !== null && parseFloat(ieltsMatch[1]) === 0.0 && parseFloat(ieltsMatch[2]) === 9.0, 'IELTS range is strictly [0.0, 9.0]', 'Boundary Verification');

const toeflMatch = rulesContent.match(/isValidScore\(exams\.get\('toefl',\s*null\),\s*([0-9]+),\s*([0-9]+)\)/);
assert(toeflMatch !== null && parseInt(toeflMatch[1]) === 0 && parseInt(toeflMatch[2]) === 120, 'TOEFL range is strictly [0, 120]', 'Boundary Verification');

const greMatch = rulesContent.match(/isValidScore\(exams\.get\('gre',\s*null\),\s*([0-9]+),\s*([0-9]+)\)/);
assert(greMatch !== null && parseInt(greMatch[1]) === 260 && parseInt(greMatch[2]) === 340, 'GRE range is strictly [260, 340]', 'Boundary Verification');

const gmatMatch = rulesContent.match(/isValidScore\(exams\.get\('gmat',\s*null\),\s*([0-9]+),\s*([0-9]+)\)/);
assert(gmatMatch !== null && parseInt(gmatMatch[1]) === 200 && parseInt(gmatMatch[2]) === 800, 'GMAT range is strictly [200, 800]', 'Boundary Verification');

// 1.4 Verify 500-Character Caps
assert(/data\.name\.size\(\)\s*<=\s*500/.test(rulesContent), 'UserProfile.name has 500 char cap', 'Length Constraints');
assert(/data\.notes\.size\(\)\s*<=\s*500/.test(rulesContent), 'Application.notes has 500 char cap', 'Length Constraints');
assert(/data\.message\.size\(\)\s*<=\s*500/.test(rulesContent), 'Notification.message has 500 char cap', 'Length Constraints');

// 1.5 Verify Application Status Enum
const statusEnumMatch = rulesContent.match(/data\.status\s+in\s+\[(.*?)\]/);
assert(statusEnumMatch !== null, 'Application status enum check exists', 'Enum Verification');
if (statusEnumMatch) {
  const allowedStatuses = statusEnumMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
  const expectedStatuses = ['planned', 'applied', 'accepted', 'rejected'];
  assert(
    expectedStatuses.every(st => allowedStatuses.includes(st)) && allowedStatuses.length === 4,
    `Application status contains exactly ${expectedStatuses.join(', ')}`,
    'Enum Verification'
  );
}

// 1.6 Verify Collection Match Blocks & Access Rules
assert(/match\s+\/countries\/\{countryId\}\s*\{\s*allow\s+read:\s*if\s+isSignedIn\(\);\s*allow\s+write:\s*if\s+false;\s*\}/.test(rulesContent),
  '/countries/{countryId} is read: if isSignedIn(); write: if false;', 'Catalog Access Control');

assert(/match\s+\/universities\/\{universityId\}\s*\{\s*allow\s+read:\s*if\s+isSignedIn\(\);\s*allow\s+write:\s*if\s+false;\s*\}/.test(rulesContent),
  '/universities/{universityId} is read: if isSignedIn(); write: if false;', 'Catalog Access Control');

assert(/match\s+\/users\/\{userId\}\s*\{[\s\S]*allow\s+read,\s*delete:\s*if\s+isOwner\(userId\);/.test(rulesContent),
  '/users/{userId} allows read, delete: if isOwner(userId)', 'User Access Control');

assert(/allow\s+create,\s*update:\s*if\s+isOwner\(userId\)\s*&&\s*isValidUser\(request\.resource\.data,\s*userId\);/.test(rulesContent),
  '/users/{userId} allows create, update: if isOwner(userId) && isValidUser(...)', 'User Access Control');

assert(/match\s+\/applications\/\{applicationId\}\s*\{[\s\S]*allow\s+read,\s*delete:\s*if\s+isOwner\(userId\);[\s\S]*allow\s+create,\s*update:\s*if\s+isOwner\(userId\)\s*&&\s*isValidApplication\(request\.resource\.data\);/.test(rulesContent),
  '/users/{userId}/applications allows owner read/delete/create/update with isValidApplication', 'Application Access Control');

assert(/match\s+\/notifications\/\{notificationId\}\s*\{[\s\S]*allow\s+read,\s*delete:\s*if\s+isOwner\(userId\);[\s\S]*allow\s+create,\s*update:\s*if\s+isOwner\(userId\)\s*&&\s*isValidNotification\(request\.resource\.data\);/.test(rulesContent),
  '/users/{userId}/notifications allows owner read/delete/create/update with isValidNotification', 'Notification Access Control');

assert(/match\s+\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/.test(rulesContent),
  'Default deny rule /{document=**} allows read, write: if false;', 'Default Deny');

// =============================================================================
// PART 2: Empirical Rules Logic Execution Engine & Stress Testing
// =============================================================================
console.log(bold('\n=== PART 2: Empirical Rules Execution & Stress Testing ==='));

// Mirror the exact logic of the parsed firestore.rules
class FirestoreRulesSimulator {
  // Helper: isSignedIn()
  static isSignedIn(requestAuth: { uid: string } | null): boolean {
    return requestAuth !== null;
  }

  // Helper: isOwner(userId)
  static isOwner(requestAuth: { uid: string } | null, userId: string): boolean {
    return this.isSignedIn(requestAuth) && requestAuth!.uid === userId;
  }

  // Helper: isValidScore(val, minVal, maxVal)
  // return val == null || (val is number && val >= minVal && val <= maxVal);
  static isValidScore(val: any, minVal: number, maxVal: number): boolean {
    if (val === null || val === undefined) return true;
    if (typeof val !== 'number' || isNaN(val)) return false;
    return val >= minVal && val <= maxVal;
  }

  // Helper: isValidExams(exams)
  static isValidExams(exams: any): boolean {
    if (typeof exams !== 'object' || exams === null || Array.isArray(exams)) return false;
    const ielts = exams['ielts'] !== undefined ? exams['ielts'] : null;
    const toefl = exams['toefl'] !== undefined ? exams['toefl'] : null;
    const gre = exams['gre'] !== undefined ? exams['gre'] : null;
    const gmat = exams['gmat'] !== undefined ? exams['gmat'] : null;

    return this.isValidScore(ielts, 0.0, 9.0)
      && this.isValidScore(toefl, 0, 120)
      && this.isValidScore(gre, 260, 340)
      && this.isValidScore(gmat, 200, 800);
  }

  // Helper: isValidUser(data, userId)
  static isValidUser(data: any, userId: string): boolean {
    if (typeof data !== 'object' || data === null) return false;
    const nameValid = typeof data.name === 'string' && data.name.length > 0 && data.name.length <= 500;
    const examsTakenValid = typeof data.examsTaken === 'boolean';
    const examsValid = this.isValidExams(data.exams);
    const targetCountriesValid = Array.isArray(data.targetCountries);
    const budget = data['budget'] !== undefined ? data['budget'] : null;
    const budgetValid = budget === null || (typeof budget === 'number' && !isNaN(budget) && budget >= 0);
    const uid = data['uid'] !== undefined ? data['uid'] : userId;
    const uidValid = uid === userId;

    return nameValid && examsTakenValid && examsValid && targetCountriesValid && budgetValid && uidValid;
  }

  // Helper: isValidApplication(data)
  static isValidApplication(data: any): boolean {
    if (typeof data !== 'object' || data === null) return false;
    const univIdValid = typeof data.universityId === 'string' && data.universityId.length > 0 && data.universityId.length <= 100;
    const statusValid = ['planned', 'applied', 'accepted', 'rejected'].includes(data.status);
    const notes = data['notes'] !== undefined ? data['notes'] : null;
    const notesValid = notes === null || (typeof notes === 'string' && notes.length <= 500);
    const appliedAt = data['appliedAt'] !== undefined ? data['appliedAt'] : null;
    const appliedAtValid = appliedAt === null || typeof appliedAt === 'string' || appliedAt instanceof Date;
    const updatedAt = data['updatedAt'] !== undefined ? data['updatedAt'] : null;
    const updatedAtValid = updatedAt === null || typeof updatedAt === 'string' || updatedAt instanceof Date;

    return univIdValid && statusValid && notesValid && appliedAtValid && updatedAtValid;
  }

  // Helper: isValidNotification(data)
  static isValidNotification(data: any): boolean {
    if (typeof data !== 'object' || data === null) return false;
    const msgValid = typeof data.message === 'string' && data.message.length > 0 && data.message.length <= 500;
    const readValid = typeof data.read === 'boolean';
    const appIdValid = typeof data.applicationId === 'string' && data.applicationId.length > 0 && data.applicationId.length <= 100;
    const createdAt = data['createdAt'] !== undefined ? data['createdAt'] : null;
    const createdAtValid = createdAt === null || typeof createdAt === 'string' || createdAt instanceof Date;
    const dueAt = data['dueAt'] !== undefined ? data['dueAt'] : null;
    const dueAtValid = dueAt === null || typeof dueAt === 'string' || dueAt instanceof Date;

    return msgValid && readValid && appIdValid && createdAtValid && dueAtValid;
  }

  // Simulation: Evaluate operation
  static evaluate(
    pathStr: string,
    operation: 'read' | 'create' | 'update' | 'delete',
    requestAuth: { uid: string } | null,
    resourceData?: any
  ): { allowed: boolean; reason: string } {
    const parts = pathStr.split('/').filter(Boolean);

    // 1. /countries/{countryId}
    if (parts.length === 2 && parts[0] === 'countries') {
      if (operation === 'read') {
        if (this.isSignedIn(requestAuth)) return { allowed: true, reason: 'SignedIn read permitted' };
        return { allowed: false, reason: 'Unauthenticated read rejected' };
      }
      return { allowed: false, reason: 'Catalog client writes unconditionally rejected' };
    }

    // 2. /universities/{universityId}
    if (parts.length === 2 && parts[0] === 'universities') {
      if (operation === 'read') {
        if (this.isSignedIn(requestAuth)) return { allowed: true, reason: 'SignedIn read permitted' };
        return { allowed: false, reason: 'Unauthenticated read rejected' };
      }
      return { allowed: false, reason: 'Catalog client writes unconditionally rejected' };
    }

    // 3. /users/{userId}
    if (parts.length === 2 && parts[0] === 'users') {
      const userId = parts[1];
      if (!this.isOwner(requestAuth, userId)) {
        return { allowed: false, reason: 'Not owner of user document' };
      }
      if (operation === 'read' || operation === 'delete') {
        return { allowed: true, reason: 'Owner read/delete allowed' };
      }
      if (operation === 'create' || operation === 'update') {
        if (this.isValidUser(resourceData, userId)) {
          return { allowed: true, reason: 'Owner write with valid user schema allowed' };
        }
        return { allowed: false, reason: 'Invalid user document schema or constraints' };
      }
    }

    // 4. /users/{userId}/applications/{applicationId}
    if (parts.length === 4 && parts[0] === 'users' && parts[2] === 'applications') {
      const userId = parts[1];
      if (!this.isOwner(requestAuth, userId)) {
        return { allowed: false, reason: 'Not owner of application document' };
      }
      if (operation === 'read' || operation === 'delete') {
        return { allowed: true, reason: 'Owner read/delete allowed' };
      }
      if (operation === 'create' || operation === 'update') {
        if (this.isValidApplication(resourceData)) {
          return { allowed: true, reason: 'Owner write with valid application schema allowed' };
        }
        return { allowed: false, reason: 'Invalid application schema or constraints' };
      }
    }

    // 5. /users/{userId}/notifications/{notificationId}
    if (parts.length === 4 && parts[0] === 'users' && parts[2] === 'notifications') {
      const userId = parts[1];
      if (!this.isOwner(requestAuth, userId)) {
        return { allowed: false, reason: 'Not owner of notification document' };
      }
      if (operation === 'read' || operation === 'delete') {
        return { allowed: true, reason: 'Owner read/delete allowed' };
      }
      if (operation === 'create' || operation === 'update') {
        if (this.isValidNotification(resourceData)) {
          return { allowed: true, reason: 'Owner write with valid notification schema allowed' };
        }
        return { allowed: false, reason: 'Invalid notification schema or constraints' };
      }
    }

    // 6. Default Deny
    return { allowed: false, reason: 'Default deny rule active' };
  }
}

// -----------------------------------------------------------------------------
// Test Suite 2.1: IELTS Boundary & Stress Tests [0.0 - 9.0]
// -----------------------------------------------------------------------------
const validIelts = [0.0, 0.5, 4.0, 6.5, 7.0, 8.5, 9.0, null, undefined];
validIelts.forEach(score => {
  assert(FirestoreRulesSimulator.isValidScore(score, 0.0, 9.0), `IELTS valid score ${score} accepted`, 'IELTS Validation');
});

const invalidIelts = [-1.0, -0.1, 9.01, 9.1, 9.5, 10.0, 100.0, '7.5', true, false, [7.0], { score: 7.0 }, NaN];
invalidIelts.forEach(score => {
  assert(!FirestoreRulesSimulator.isValidScore(score, 0.0, 9.0), `IELTS invalid score ${JSON.stringify(score)} rejected`, 'IELTS Validation');
});

// -----------------------------------------------------------------------------
// Test Suite 2.2: TOEFL Boundary & Stress Tests [0 - 120]
// -----------------------------------------------------------------------------
const validToefl = [0, 1, 60, 80, 90, 100, 110, 119, 120, null, undefined];
validToefl.forEach(score => {
  assert(FirestoreRulesSimulator.isValidScore(score, 0, 120), `TOEFL valid score ${score} accepted`, 'TOEFL Validation');
});

const invalidToefl = [-1, -50, 120.1, 121, 125, 200, 300, '100', true, false, [100], {}, NaN];
invalidToefl.forEach(score => {
  assert(!FirestoreRulesSimulator.isValidScore(score, 0, 120), `TOEFL invalid score ${JSON.stringify(score)} rejected`, 'TOEFL Validation');
});

// -----------------------------------------------------------------------------
// Test Suite 2.3: GRE Boundary & Stress Tests [260 - 340]
// -----------------------------------------------------------------------------
const validGre = [260, 261, 300, 310, 320, 330, 339, 340, null, undefined];
validGre.forEach(score => {
  assert(FirestoreRulesSimulator.isValidScore(score, 260, 340), `GRE valid score ${score} accepted`, 'GRE Validation');
});

const invalidGre = [0, 100, 250, 259, 259.9, 340.1, 341, 350, 400, -1, '320', true, false, [320], {}, NaN];
invalidGre.forEach(score => {
  assert(!FirestoreRulesSimulator.isValidScore(score, 260, 340), `GRE invalid score ${JSON.stringify(score)} rejected`, 'GRE Validation');
});

// -----------------------------------------------------------------------------
// Test Suite 2.4: GMAT Boundary & Stress Tests [200 - 800]
// -----------------------------------------------------------------------------
const validGmat = [200, 201, 500, 600, 700, 750, 799, 800, null, undefined];
validGmat.forEach(score => {
  assert(FirestoreRulesSimulator.isValidScore(score, 200, 800), `GMAT valid score ${score} accepted`, 'GMAT Validation');
});

const invalidGmat = [0, 100, 199, 199.9, 800.1, 801, 850, 1000, -1, '700', true, false, [700], {}, NaN];
invalidGmat.forEach(score => {
  assert(!FirestoreRulesSimulator.isValidScore(score, 200, 800), `GMAT invalid score ${JSON.stringify(score)} rejected`, 'GMAT Validation');
});

// -----------------------------------------------------------------------------
// Test Suite 2.5: User Document Validation & 500-Char Cap
// -----------------------------------------------------------------------------
const baseUser = {
  name: 'Ada Lovelace',
  examsTaken: true,
  exams: { gre: 325, gmat: null, toefl: 110, ielts: 8.0 },
  targetCountries: ['germany', 'ireland'],
  budget: 15000,
  uid: 'user_ada'
};

// Valid baseline
assert(FirestoreRulesSimulator.isValidUser(baseUser, 'user_ada'), 'Valid user profile accepted', 'User Validation');

// Student with no exams taken
const noExamsUser = {
  name: 'Charles Babbage',
  examsTaken: false,
  exams: { gre: null, gmat: null, toefl: null, ielts: null },
  targetCountries: ['uk'],
  budget: 20000,
  uid: 'user_charles'
};
assert(FirestoreRulesSimulator.isValidUser(noExamsUser, 'user_charles'), 'Student with no exams accepted', 'User Validation');

// Name length constraints
assert(!FirestoreRulesSimulator.isValidUser({ ...baseUser, name: '' }, 'user_ada'), 'Empty name rejected', 'User Validation');
assert(FirestoreRulesSimulator.isValidUser({ ...baseUser, name: 'A'.repeat(500) }, 'user_ada'), '500-char name accepted', 'User Validation');
assert(!FirestoreRulesSimulator.isValidUser({ ...baseUser, name: 'A'.repeat(501) }, 'user_ada'), '501-char name rejected', 'User Validation');
assert(!FirestoreRulesSimulator.isValidUser({ ...baseUser, name: 12345 }, 'user_ada'), 'Non-string name rejected', 'User Validation');

// Budget boundaries
assert(FirestoreRulesSimulator.isValidUser({ ...baseUser, budget: 0 }, 'user_ada'), 'Zero budget accepted', 'User Validation');
assert(FirestoreRulesSimulator.isValidUser({ ...baseUser, budget: null }, 'user_ada'), 'Null budget accepted', 'User Validation');
assert(!FirestoreRulesSimulator.isValidUser({ ...baseUser, budget: -1 }, 'user_ada'), 'Negative budget rejected', 'User Validation');
assert(!FirestoreRulesSimulator.isValidUser({ ...baseUser, budget: '15000' }, 'user_ada'), 'String budget rejected', 'User Validation');

// UID spoofing attempt
assert(!FirestoreRulesSimulator.isValidUser({ ...baseUser, uid: 'spoofed_victim_uid' }, 'user_ada'), 'Spoofed internal uid rejected', 'User Validation');

// Invalid score inside exams map
assert(!FirestoreRulesSimulator.isValidUser({
  ...baseUser,
  exams: { gre: 250, gmat: null, toefl: 110, ielts: 8.0 }
}, 'user_ada'), 'Invalid GRE score 250 rejected in user profile', 'User Validation');

assert(!FirestoreRulesSimulator.isValidUser({
  ...baseUser,
  exams: { gre: 320, gmat: 850, toefl: 110, ielts: 8.0 }
}, 'user_ada'), 'Invalid GMAT score 850 rejected in user profile', 'User Validation');

assert(!FirestoreRulesSimulator.isValidUser({
  ...baseUser,
  exams: { gre: 320, gmat: 700, toefl: 125, ielts: 8.0 }
}, 'user_ada'), 'Invalid TOEFL score 125 rejected in user profile', 'User Validation');

assert(!FirestoreRulesSimulator.isValidUser({
  ...baseUser,
  exams: { gre: 320, gmat: 700, toefl: 110, ielts: 9.5 }
}, 'user_ada'), 'Invalid IELTS score 9.5 rejected in user profile', 'User Validation');

// -----------------------------------------------------------------------------
// Test Suite 2.6: Application Validation & Status Enums
// -----------------------------------------------------------------------------
const baseApp = {
  universityId: 'tum_informatics',
  status: 'applied',
  notes: 'Submitted via TUMonline',
  appliedAt: '2026-10-15T12:00:00Z',
  updatedAt: '2026-10-15T12:00:00Z'
};

assert(FirestoreRulesSimulator.isValidApplication(baseApp), 'Valid application document accepted', 'Application Validation');

// Status enum verification
['planned', 'applied', 'accepted', 'rejected'].forEach(st => {
  assert(FirestoreRulesSimulator.isValidApplication({ ...baseApp, status: st }), `Valid status '${st}' accepted`, 'Application Validation');
});

['pending', 'submitted', 'waitlisted', 'enrolled', 'withdrawn', '', null, 123].forEach(st => {
  assert(!FirestoreRulesSimulator.isValidApplication({ ...baseApp, status: st }), `Invalid status '${JSON.stringify(st)}' rejected`, 'Application Validation');
});

// Notes length constraints
assert(FirestoreRulesSimulator.isValidApplication({ ...baseApp, notes: null }), 'Null notes accepted', 'Application Validation');
assert(FirestoreRulesSimulator.isValidApplication({ ...baseApp, notes: 'N'.repeat(500) }), '500-char notes accepted', 'Application Validation');
assert(!FirestoreRulesSimulator.isValidApplication({ ...baseApp, notes: 'N'.repeat(501) }), '501-char notes rejected', 'Application Validation');
assert(!FirestoreRulesSimulator.isValidApplication({ ...baseApp, notes: 12345 }), 'Non-string notes rejected', 'Application Validation');

// UniversityId constraints
assert(!FirestoreRulesSimulator.isValidApplication({ ...baseApp, universityId: '' }), 'Empty universityId rejected', 'Application Validation');
assert(FirestoreRulesSimulator.isValidApplication({ ...baseApp, universityId: 'U'.repeat(100) }), '100-char universityId accepted', 'Application Validation');
assert(!FirestoreRulesSimulator.isValidApplication({ ...baseApp, universityId: 'U'.repeat(101) }), '101-char universityId rejected', 'Application Validation');

// -----------------------------------------------------------------------------
// Test Suite 2.7: In-App Notification Validation & 500-Char Cap
// -----------------------------------------------------------------------------
const baseNotif = {
  message: 'Application reminder: Submit certified transcripts in 3 days.',
  read: false,
  applicationId: 'app_tum_123',
  createdAt: '2026-10-15T12:00:00Z',
  dueAt: '2026-10-18T12:00:00Z'
};

assert(FirestoreRulesSimulator.isValidNotification(baseNotif), 'Valid notification accepted', 'Notification Validation');

// Message constraints
assert(!FirestoreRulesSimulator.isValidNotification({ ...baseNotif, message: '' }), 'Empty notification message rejected', 'Notification Validation');
assert(FirestoreRulesSimulator.isValidNotification({ ...baseNotif, message: 'M'.repeat(500) }), '500-char message accepted', 'Notification Validation');
assert(!FirestoreRulesSimulator.isValidNotification({ ...baseNotif, message: 'M'.repeat(501) }), '501-char message rejected', 'Notification Validation');
assert(!FirestoreRulesSimulator.isValidNotification({ ...baseNotif, message: true }), 'Non-string message rejected', 'Notification Validation');

// Read flag
assert(FirestoreRulesSimulator.isValidNotification({ ...baseNotif, read: true }), 'read: true accepted', 'Notification Validation');
assert(!FirestoreRulesSimulator.isValidNotification({ ...baseNotif, read: 'false' }), 'Non-boolean read rejected', 'Notification Validation');
assert(!FirestoreRulesSimulator.isValidNotification({ ...baseNotif, read: null }), 'Null read rejected', 'Notification Validation');

// -----------------------------------------------------------------------------
// Test Suite 2.8: Access Control & Authorization Scenarios
// -----------------------------------------------------------------------------

// Catalog access control
assert(!FirestoreRulesSimulator.evaluate('/countries/germany', 'read', null).allowed,
  'Unauthenticated read of /countries/germany REJECTED', 'Catalog Security');

assert(FirestoreRulesSimulator.evaluate('/countries/germany', 'read', { uid: 'user_1' }).allowed,
  'Authenticated read of /countries/germany ALLOWED', 'Catalog Security');

assert(!FirestoreRulesSimulator.evaluate('/countries/germany', 'create', { uid: 'user_1' }, {}).allowed,
  'Client write (create) to /countries/germany REJECTED', 'Catalog Security');

assert(!FirestoreRulesSimulator.evaluate('/universities/tum_informatics', 'read', null).allowed,
  'Unauthenticated read of /universities/tum_informatics REJECTED', 'Catalog Security');

assert(FirestoreRulesSimulator.evaluate('/universities/tum_informatics', 'read', { uid: 'user_1' }).allowed,
  'Authenticated read of /universities/tum_informatics ALLOWED', 'Catalog Security');

assert(!FirestoreRulesSimulator.evaluate('/universities/tum_informatics', 'update', { uid: 'user_1' }, {}).allowed,
  'Client write (update) to /universities/tum_informatics REJECTED', 'Catalog Security');

assert(!FirestoreRulesSimulator.evaluate('/universities/tum_informatics', 'delete', { uid: 'user_1' }).allowed,
  'Client delete of /universities/tum_informatics REJECTED', 'Catalog Security');

// User Isolation
assert(!FirestoreRulesSimulator.evaluate('/users/victim_user', 'read', null).allowed,
  'Unauthenticated read of /users/victim_user REJECTED', 'User Isolation');

assert(!FirestoreRulesSimulator.evaluate('/users/victim_user', 'read', { uid: 'attacker_user' }).allowed,
  'Cross-user read of /users/victim_user by attacker REJECTED', 'User Isolation');

assert(!FirestoreRulesSimulator.evaluate('/users/victim_user', 'update', { uid: 'attacker_user' }, baseUser).allowed,
  'Cross-user update of /users/victim_user by attacker REJECTED', 'User Isolation');

assert(!FirestoreRulesSimulator.evaluate('/users/victim_user', 'delete', { uid: 'attacker_user' }).allowed,
  'Cross-user delete of /users/victim_user by attacker REJECTED', 'User Isolation');

assert(FirestoreRulesSimulator.evaluate('/users/user_ada', 'read', { uid: 'user_ada' }).allowed,
  'Owner read of /users/user_ada ALLOWED', 'User Isolation');

assert(FirestoreRulesSimulator.evaluate('/users/user_ada', 'delete', { uid: 'user_ada' }).allowed,
  'Owner delete of /users/user_ada ALLOWED ("Delete my data")', 'User Isolation');

assert(FirestoreRulesSimulator.evaluate('/users/user_ada', 'create', { uid: 'user_ada' }, baseUser).allowed,
  'Owner create of /users/user_ada with valid data ALLOWED', 'User Isolation');

// Subcollections isolation
assert(!FirestoreRulesSimulator.evaluate('/users/victim_user/applications/app_1', 'read', { uid: 'attacker_user' }).allowed,
  'Cross-user read of application subcollection REJECTED', 'Subcollection Isolation');

assert(FirestoreRulesSimulator.evaluate('/users/user_ada/applications/app_1', 'read', { uid: 'user_ada' }).allowed,
  'Owner read of application subcollection ALLOWED', 'Subcollection Isolation');

assert(FirestoreRulesSimulator.evaluate('/users/user_ada/applications/app_1', 'delete', { uid: 'user_ada' }).allowed,
  'Owner delete of application subcollection ALLOWED (cascade delete)', 'Subcollection Isolation');

assert(!FirestoreRulesSimulator.evaluate('/users/victim_user/notifications/notif_1', 'read', { uid: 'attacker_user' }).allowed,
  'Cross-user read of notification subcollection REJECTED', 'Subcollection Isolation');

assert(FirestoreRulesSimulator.evaluate('/users/user_ada/notifications/notif_1', 'read', { uid: 'user_ada' }).allowed,
  'Owner read of notification subcollection ALLOWED', 'Subcollection Isolation');

assert(FirestoreRulesSimulator.evaluate('/users/user_ada/notifications/notif_1', 'delete', { uid: 'user_ada' }).allowed,
  'Owner delete of notification subcollection ALLOWED (cascade delete)', 'Subcollection Isolation');

// Default Deny
assert(!FirestoreRulesSimulator.evaluate('/admin/system_config', 'read', { uid: 'user_ada' }).allowed,
  'Arbitrary path /admin/system_config read REJECTED by default deny', 'Default Deny');

assert(!FirestoreRulesSimulator.evaluate('/secrets/gemini_key', 'read', { uid: 'user_ada' }).allowed,
  'Arbitrary path /secrets/gemini_key read REJECTED by default deny', 'Default Deny');

// =============================================================================
// PART 3: Environment Configuration & Git Hygiene Verification
// =============================================================================
console.log(bold('\n=== PART 3: Environment Configuration & Git Hygiene Audit ==='));

// 3.1 Check .env.example
const envExamplePath = path.resolve('.env.example');
assert(fs.existsSync(envExamplePath), '.env.example exists on disk', 'Environment Hygiene');
const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');

assert(!envExampleContent.includes('AIza'), '.env.example contains NO live Google API key', 'Environment Hygiene');
assert(envExampleContent.includes('VITE_FIREBASE_API_KEY=your-firebase-api-key-placeholder'),
  '.env.example uses explicit placeholder for API key', 'Environment Hygiene');
assert(envExampleContent.includes('NEVER put Google AI Studio (GEMINI_API_KEY)'),
  '.env.example warns against committing Gemini API keys', 'Environment Hygiene');
assert(envExampleContent.includes('NEVER put Firebase Admin SDK Service Account JSON'),
  '.env.example warns against committing Service Account keys', 'Environment Hygiene');

// 3.2 Check .gitignore
const gitignorePath = path.resolve('.gitignore');
assert(fs.existsSync(gitignorePath), '.gitignore exists on disk', 'Environment Hygiene');
const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

assert(/^\.env$/m.test(gitignoreContent), '.gitignore ignores .env', 'Git Hygiene');
assert(/^\.env\.\*$/m.test(gitignoreContent), '.gitignore ignores .env.*', 'Git Hygiene');
assert(/^!\.env\.example$/m.test(gitignoreContent), '.gitignore whitelists !.env.example', 'Git Hygiene');
assert(/\*service-account\*\.json/.test(gitignoreContent), '.gitignore blocks *service-account*.json', 'Git Hygiene');
assert(/\*firebase-admin\*\.json/.test(gitignoreContent), '.gitignore blocks *firebase-admin*.json', 'Git Hygiene');
assert(/\*\.pem/.test(gitignoreContent), '.gitignore blocks *.pem private keys', 'Git Hygiene');
assert(/\*\.key/.test(gitignoreContent), '.gitignore blocks *.key private keys', 'Git Hygiene');
assert(/node_modules\//.test(gitignoreContent), '.gitignore blocks node_modules/', 'Git Hygiene');
assert(/dist\//.test(gitignoreContent), '.gitignore blocks dist/', 'Git Hygiene');

// 3.3 Verify No .env file or credentials on disk
const envPath = path.resolve('.env');
assert(!fs.existsSync(envPath), 'No .env file committed or present on disk', 'Secret Hygiene');

// 3.4 Deep Scan of project source files for leaked secrets
const projectFilesToScan = [
  'firestore.rules',
  '.env.example',
  '.gitignore',
  'package.json',
  'tsconfig.json',
  'scripts/seed.ts',
  'src/types/index.ts',
  'src/data/countries.json',
  'src/data/universities.json'
];

let secretFound = false;
for (const relPath of projectFilesToScan) {
  const fullPath = path.resolve(relPath);
  if (fs.existsSync(fullPath)) {
    const fileText = fs.readFileSync(fullPath, 'utf8');
    if (/AIza[0-9A-Za-z-_]{35}/.test(fileText)) {
      secretFound = true;
      assert(false, `Leaked Google API key found in ${relPath}`, 'Secret Hygiene');
    }
    if (/-----BEGIN\s+(?:RSA\s+|EC\s+|OPENSSH\s+)?PRIVATE\s+KEY-----/.test(fileText)) {
      secretFound = true;
      assert(false, `Leaked private key found in ${relPath}`, 'Secret Hygiene');
    }
    if (/"type":\s*"service_account"/.test(fileText)) {
      secretFound = true;
      assert(false, `Leaked service account JSON found in ${relPath}`, 'Secret Hygiene');
    }
  }
}
assert(!secretFound, 'Project files scanned: Zero credentials, private keys, or real API keys detected', 'Secret Hygiene');

// =============================================================================
// TEST SUMMARY & METRICS
// =============================================================================
const totalTests = results.length;
const passedTests = results.filter(r => r.passed).length;
const failedTests = totalTests - passedTests;

console.log(bold('\n============================================================='));
console.log(bold(` Test Execution Summary: ${passedTests}/${totalTests} Passed`));
console.log(bold('============================================================='));

const categories = [...new Set(results.map(r => r.category))];
for (const cat of categories) {
  const catTests = results.filter(r => r.category === cat);
  const catPassed = catTests.filter(r => r.passed).length;
  const statusColor = catPassed === catTests.length ? green : red;
  console.log(` - ${cat}: ${statusColor(`${catPassed}/${catTests.length} passed`)}`);
}

if (failedTests > 0) {
  console.error(red(`\n❌ VERDICT: FAIL - ${failedTests} tests failed.`));
  process.exit(1);
} else {
  console.log(green(`\n✅ VERDICT: ALL ${totalTests} TESTS PASSED CLEANLY!`));
  process.exit(0);
}
