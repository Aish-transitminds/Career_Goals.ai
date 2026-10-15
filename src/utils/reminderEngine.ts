/**
 * AbroadPath AI - Deterministic Milestone Reminder Engine
 * File: src/utils/reminderEngine.ts
 * Authoritative Reference: ORIGINAL_REQUEST.md (§Screens #6, Tech Stack) & PROJECT.md
 */

import { Application, University, InAppNotification } from '../types';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface MilestoneDefinition {
  dayOffset: 1 | 3 | 7;
  title: string;
  generateMessage: (univName: string) => string;
}

export const MILESTONES: MilestoneDefinition[] = [
  {
    dayOffset: 1,
    title: 'Day +1 Follow-Up',
    generateMessage: (name) =>
      `Day 1 Follow-up for ${name}: Confirm receipt of portal login credentials and verify that your initial PDF transcripts and documents uploaded successfully.`,
  },
  {
    dayOffset: 3,
    title: 'Day +3 Verification',
    generateMessage: (name) =>
      `Day 3 Verification for ${name}: Check that your academic recommendation letters (LORs) and official test score reports (IELTS/TOEFL/GRE) are marked received.`,
  },
  {
    dayOffset: 7,
    title: 'Day +7 Status Audit',
    generateMessage: (name) =>
      `Day 7 Portal Check for ${name}: Log in to the official admission portal to audit processing status and address any flagged or incomplete checklist items.`,
  },
];

/**
 * Generates a deterministic document ID for a milestone notification.
 * Format: notif_{sanitizedAppId}_day{dayOffset}
 */
export function getNotificationId(applicationId: string, dayOffset: number): string {
  const sanitized = applicationId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `notif_${sanitized}_day${dayOffset}`;
}

/**
 * Pure evaluation function calculating all due milestone notifications.
 *
 * Requirements:
 * - In-app only, generated from appliedAt (+1, +3, +7 days).
 * - Deterministic IDs prevent duplicate records across multiple logins or refreshes.
 * - If user logs in 10 days later, all due milestones are generated simultaneously.
 * - Only applications in 'applied' (or with a valid appliedAt timestamp) are evaluated.
 */
export function calculateDueNotifications(
  applications: Application[],
  universities: University[],
  existingNotifications: InAppNotification[],
  referenceTime: Date = new Date()
): InAppNotification[] {
  const existingIds = new Set(existingNotifications.map((n) => n.id));
  const univMap = new Map<string, University>(universities.map((u) => [u.id, u]));
  const dueNotifications: InAppNotification[] = [];

  for (const app of applications) {
    // Only applied applications with a valid timestamp are eligible
    if (!app.appliedAt) continue;

    const appliedTime = new Date(app.appliedAt).getTime();
    if (isNaN(appliedTime)) continue;

    const univ = univMap.get(app.universityId);
    const univName = univ ? univ.name : app.universityId;

    for (const milestone of MILESTONES) {
      const notifId = getNotificationId(app.id, milestone.dayOffset);

      // Deduplication: skip if notification document already exists
      if (existingIds.has(notifId)) continue;

      const triggerTimestamp = appliedTime + milestone.dayOffset * MS_PER_DAY;

      if (referenceTime.getTime() >= triggerTimestamp) {
        dueNotifications.push({
          id: notifId,
          applicationId: app.id,
          message: milestone.generateMessage(univName),
          createdAt: referenceTime.toISOString(),
          dueAt: new Date(triggerTimestamp).toISOString(),
          read: false,
          dayInterval: milestone.dayOffset,
        });
      }
    }
  }

  return dueNotifications;
}
