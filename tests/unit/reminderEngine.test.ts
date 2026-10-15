/**
 * AbroadPath AI - Unit Test Suite for Reminder Engine
 * File: tests/unit/reminderEngine.test.ts
 * Authoritative Reference: ORIGINAL_REQUEST.md (§Screens #6, Tech Stack) & PROJECT.md
 */

import {
  calculateDueNotifications,
  getNotificationId,
} from '../../src/utils/reminderEngine';
import { Application, University, InAppNotification } from '../../src/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

const mockUnivs: University[] = [
  {
    id: 'tum_informatics',
    countryId: 'germany',
    name: 'Technical University of Munich (TUM)',
    program: 'M.Sc. Informatics',
    requirements: {
      gmat_required: true,
      gre_required: true,
      min_ielts: 6.5,
      min_toefl: 88,
      language_requirement: 'English B2',
      tuition_fee: '€6,000 / semester',
      application_deadline: 'May 31',
      notes: null,
    },
    tuition: '€6,000 / sem',
    portalUrl: 'https://campus.tum.de',
    sourceUrl: 'https://tum.de',
    lastChecked: '2026-10-15',
    ruleChanged: true,
  },
  {
    id: 'tcd_cs',
    countryId: 'ireland',
    name: 'Trinity College Dublin',
    program: 'M.Sc. Computer Science',
    requirements: {
      gmat_required: null,
      gre_required: false,
      min_ielts: 6.5,
      min_toefl: 88,
      language_requirement: null,
      tuition_fee: '€25,800 / year',
      application_deadline: 'June 30',
      notes: null,
    },
    tuition: '€25,800 / year',
    portalUrl: 'https://www.tcd.ie/apply',
    sourceUrl: 'https://tcd.ie',
    lastChecked: '2026-10-15',
    ruleChanged: false,
  },
];

console.log('--- Reminder Engine Unit Tests ---');

// Test 1: Deterministic ID generation
{
  const id1 = getNotificationId('tum_informatics', 1);
  const id3 = getNotificationId('tum_informatics', 3);
  const id7 = getNotificationId('tum_informatics', 7);
  assert(id1 === 'notif_tum_informatics_day1', 'Generates correct ID for Day 1');
  assert(id3 === 'notif_tum_informatics_day3', 'Generates correct ID for Day 3');
  assert(id7 === 'notif_tum_informatics_day7', 'Generates correct ID for Day 7');

  const sanitizedId = getNotificationId('app/special:123', 1);
  assert(sanitizedId === 'notif_app_special_123_day1', 'Sanitizes special characters in app id');
}

// Test 2: No reminders generated before 24h
{
  const appliedAt = '2026-10-15T10:00:00Z';
  const now = new Date('2026-10-15T18:00:00Z'); // 8 hours elapsed
  const apps: Application[] = [
    {
      id: 'tum_informatics',
      universityId: 'tum_informatics',
      status: 'applied',
      appliedAt,
      updatedAt: appliedAt,
    },
  ];

  const notifs = calculateDueNotifications(apps, mockUnivs, [], now);
  assert(notifs.length === 0, 'No notification generated when only 8 hours elapsed');
}

// Test 3: Day 1 reminder triggers after 24h (26h elapsed)
{
  const appliedAt = '2026-10-15T10:00:00Z';
  const now = new Date('2026-10-16T12:00:00Z'); // 26 hours elapsed
  const apps: Application[] = [
    {
      id: 'tum_informatics',
      universityId: 'tum_informatics',
      status: 'applied',
      appliedAt,
      updatedAt: appliedAt,
    },
  ];

  const notifs = calculateDueNotifications(apps, mockUnivs, [], now);
  assert(notifs.length === 1, 'Generates exactly 1 notification after 26 hours');
  assert(notifs[0].id === 'notif_tum_informatics_day1', 'Generated notification has deterministic Day 1 ID');
  assert(notifs[0].dayInterval === 1, 'Notification has dayInterval 1');
  assert(notifs[0].read === false, 'Notification defaults to unread (read: false)');
  assert(notifs[0].message.includes('Technical University of Munich (TUM)'), 'Notification references university name');
}

// Test 4: Day 1 and Day 3 reminders trigger after 72h (80h elapsed)
{
  const appliedAt = '2026-10-15T10:00:00Z';
  const now = new Date('2026-10-18T18:00:00Z'); // 80 hours elapsed (3 days, 8 hours)
  const apps: Application[] = [
    {
      id: 'tum_informatics',
      universityId: 'tum_informatics',
      status: 'applied',
      appliedAt,
      updatedAt: appliedAt,
    },
  ];

  const notifs = calculateDueNotifications(apps, mockUnivs, [], now);
  assert(notifs.length === 2, 'Generates Day 1 and Day 3 notifications after 80 hours');
  const dayIntervals = notifs.map((n) => n.dayInterval);
  assert(dayIntervals.includes(1) && dayIntervals.includes(3), 'Contains both Day 1 and Day 3');
}

// Test 5: Retrospective generation (all 3 milestones after 10 days)
{
  const appliedAt = '2026-10-15T10:00:00Z';
  const now = new Date('2026-10-25T10:00:00Z'); // 10 days elapsed
  const apps: Application[] = [
    {
      id: 'tum_informatics',
      universityId: 'tum_informatics',
      status: 'applied',
      appliedAt,
      updatedAt: appliedAt,
    },
  ];

  const notifs = calculateDueNotifications(apps, mockUnivs, [], now);
  assert(notifs.length === 3, 'Generates all 3 notifications (+1, +3, +7 days) after 10 days');
  assert(notifs.some((n) => n.dayInterval === 1), 'Has Day 1');
  assert(notifs.some((n) => n.dayInterval === 3), 'Has Day 3');
  assert(notifs.some((n) => n.dayInterval === 7), 'Has Day 7');
}

// Test 6: Deduplication against existing notifications
{
  const appliedAt = '2026-10-15T10:00:00Z';
  const now = new Date('2026-10-25T10:00:00Z'); // 10 days elapsed
  const apps: Application[] = [
    {
      id: 'tum_informatics',
      universityId: 'tum_informatics',
      status: 'applied',
      appliedAt,
      updatedAt: appliedAt,
    },
  ];
  const existing: InAppNotification[] = [
    {
      id: 'notif_tum_informatics_day1',
      applicationId: 'tum_informatics',
      message: 'Already read message',
      createdAt: '2026-10-16T12:00:00Z',
      dueAt: '2026-10-16T10:00:00Z',
      read: true,
      dayInterval: 1,
    },
  ];

  const notifs = calculateDueNotifications(apps, mockUnivs, existing, now);
  assert(notifs.length === 2, 'Skips already existing Day 1 notification, only generates Day 3 and Day 7');
  assert(!notifs.some((n) => n.id === 'notif_tum_informatics_day1'), 'Does not regenerate Day 1 notification');
}

// Test 7: Applications without appliedAt or invalid dates are skipped
{
  const now = new Date('2026-10-25T10:00:00Z');
  const apps: Application[] = [
    {
      id: 'app_planned',
      universityId: 'tum_informatics',
      status: 'planned',
      appliedAt: null,
      updatedAt: '2026-10-15T10:00:00Z',
    },
    {
      id: 'app_invalid_date',
      universityId: 'tum_informatics',
      status: 'applied',
      appliedAt: 'not-a-valid-date',
      updatedAt: '2026-10-15T10:00:00Z',
    },
  ];

  const notifs = calculateDueNotifications(apps, mockUnivs, [], now);
  assert(notifs.length === 0, 'Skips apps with null or invalid appliedAt');
}

// Test 8: Multiple applications tracked simultaneously
{
  const now = new Date('2026-10-17T12:00:00Z'); // 48h after TUM, 12h after TCD
  const apps: Application[] = [
    {
      id: 'tum_informatics',
      universityId: 'tum_informatics',
      status: 'applied',
      appliedAt: '2026-10-15T10:00:00Z', // 50h elapsed -> Day 1 due
      updatedAt: '2026-10-15T10:00:00Z',
    },
    {
      id: 'tcd_cs',
      universityId: 'tcd_cs',
      status: 'applied',
      appliedAt: '2026-10-17T00:00:00Z', // 12h elapsed -> None due yet
      updatedAt: '2026-10-17T00:00:00Z',
    },
  ];

  const notifs = calculateDueNotifications(apps, mockUnivs, [], now);
  assert(notifs.length === 1, 'Only generates due notification for TUM');
  assert(notifs[0].applicationId === 'tum_informatics', 'Correct applicationId assigned');
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Reminder Engine tests passed successfully!');
}
