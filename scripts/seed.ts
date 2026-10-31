/**
 * scripts/seed.ts
 * 
 * Standalone Firestore Seeding Script for AbroadPath AI.
 * Validates seed payloads, enforces null policies, verifies country nuances,
 * and populates Firestore (Emulator or Production via Admin SDK).
 * 
 * Usage:
 *   npx tsx scripts/seed.ts               # Run against live or emulator (auto-detect)
 *   npx tsx scripts/seed.ts --dry-run     # Validate schemas and exit (no network)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import type { Country, University, UniversityRequirements } from '../src/types/index.js';
import { SUBJECT_UNIVERSITIES } from '../src/data/subjectCatalog.js';
import { SUBJECT_FIELDS } from '../src/data/subjectFields.js';

// Handle ESM path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths to authoritative seed data
const COUNTRIES_PATH = resolve(__dirname, '../src/data/countries.json');
const UNIVERSITIES_PATH = resolve(__dirname, '../src/data/universities.json');

// -----------------------------------------------------------------------------
// Validation Utilities
// -----------------------------------------------------------------------------

function validateScore(val: number | null | undefined, min: number, max: number, fieldName: string, id: string): void {
  if (val === null || val === undefined) return;
  if (typeof val !== 'number' || isNaN(val) || val < min || val > max) {
    throw new Error(`Validation Error in ${id}: ${fieldName} must be null or between ${min} and ${max}. Got: ${val}`);
  }
}

function validateUrl(urlStr: string, fieldName: string, id: string): void {
  if (!urlStr || typeof urlStr !== 'string' || (!urlStr.startsWith('http://') && !urlStr.startsWith('https://'))) {
    throw new Error(`Validation Error in ${id}: ${fieldName} must be a valid HTTP(S) URL. Got: ${urlStr}`);
  }
}

function validateDate(dateStr: string | null | undefined, fieldName: string, id: string): void {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    throw new Error(`Validation Error in ${id}: ${fieldName} must match YYYY-MM-DD. Got: ${dateStr}`);
  }
}

export function validateSeedData(countries: Country[], universities: University[]): void {
  console.log('🔍 Executing pre-flight seed data verification...');

  // 1. Countries Validation
  if (!Array.isArray(countries) || countries.length < 3) {
    throw new Error(`Countries dataset must contain at least 3 countries. Got: ${countries?.length}`);
  }

  const countryIds = new Set<string>();
  for (const c of countries) {
    if (!c.id || countryIds.has(c.id)) {
      throw new Error(`Duplicate or missing country id: "${c.id}"`);
    }
    countryIds.add(c.id);

    validateUrl(c.portalUrl, 'portalUrl', c.id);
    validateUrl(c.sourceUrl, 'sourceUrl', c.id);
    validateDate(c.lastChecked, 'lastChecked', c.id);

    if (!Array.isArray(c.documents) || c.documents.length === 0) {
      throw new Error(`Country ${c.id} must include a non-empty documents checklist.`);
    }
    if (!c.verificationNote || !c.verificationNote.toLowerCase().includes('official site')) {
      throw new Error(`Country ${c.id} missing mandatory verificationNote mentioning official site.`);
    }
  }

  // 2. Universities Validation
  if (!Array.isArray(universities) || universities.length < 10) {
    throw new Error(`Universities dataset must contain at least 10 universities. Got: ${universities?.length}`);
  }

  const universityIds = new Set<string>();
  let demoSeededCount = 0;

  for (const u of universities) {
    if (!u.id || universityIds.has(u.id)) {
      throw new Error(`Duplicate or missing university id: "${u.id}"`);
    }
    universityIds.add(u.id);

    // Foreign key check
    if (!countryIds.has(u.countryId)) {
      throw new Error(`University ${u.id} references non-existent countryId: "${u.countryId}"`);
    }

    validateUrl(u.portalUrl, 'portalUrl', u.id);
    validateUrl(u.sourceUrl, 'sourceUrl', u.id);
    if (u.lastChecked) {
      validateDate(u.lastChecked, 'lastChecked', u.id);
    }
    if (u.lastChanged) {
      validateDate(u.lastChanged, 'lastChanged', u.id);
    }
    if (!u.field || !Array.isArray(u.fields) || !u.fields.includes(u.field)) {
      throw new Error(`University ${u.id} must include a legacy field and a fields array containing that field.`);
    }
    if (u.fields.some((field) => !SUBJECT_FIELDS.includes(field as (typeof SUBJECT_FIELDS)[number]))) {
      throw new Error(`University ${u.id} contains an unknown subject field.`);
    }

    // Score boundaries
    const req: UniversityRequirements = u.requirements;
    if (!req) {
      throw new Error(`University ${u.id} missing requirements map.`);
    }
    validateScore(req.min_ielts, 0.0, 9.0, 'min_ielts', u.id);
    validateScore(req.min_toefl, 0, 120, 'min_toefl', u.id);
    validateScore(req.min_gre, 260, 340, 'min_gre', u.id);
    validateScore(req.min_gmat, 200, 800, 'min_gmat', u.id);

    // Strict null policy assertions: unstated fields should be null or valid value, never undefined or empty strings
    for (const [key, value] of Object.entries(req)) {
      if (typeof value === 'string' && value.trim() === '') {
        throw new Error(`Validation Error in ${u.id}: requirements.${key} must be null or non-empty string.`);
      }
    }

    for (const field of SUBJECT_FIELDS) {
      const count = universities.filter((university) => university.fields?.includes(field)).length;
      if (count < 6) {
        throw new Error(`Subject "${field}" must have at least 6 programs. Found ${count}.`);
      }
    }

    // Demo-seeded check
    if (u.demoSeeded) {
      demoSeededCount++;
      if (u.id !== 'tum_informatics') {
        throw new Error(`demoSeeded must only be set for "tum_informatics". Got: ${u.id}`);
      }
      if (!u.ruleChanged || !u.changedFields?.includes('gmat_required') || u.previousValues?.gmat_required !== null) {
        throw new Error(`Demo-seeded record ${u.id} must have ruleChanged: true, changedFields: ['gmat_required'], previousValues: { gmat_required: null }`);
      }
    }

    // Country nuance check (Irish Master's courses must NOT use CAO)
    if (u.countryId === 'ireland') {
      if (u.portalUrl.includes('cao.ie')) {
        throw new Error(`Nuance Violation: Irish Master's course ${u.id} MUST NOT use CAO portal!`);
      }
    }
  }

  if (demoSeededCount !== 1) {
    throw new Error(`Expected exactly 1 demoSeeded university, found ${demoSeededCount}.`);
  }

  console.log(`✅ Pre-flight verification passed: ${countries.length} countries, ${universities.length} universities verified.`);
}

// -----------------------------------------------------------------------------
// Database Connection
// -----------------------------------------------------------------------------

function initFirestore(): Firestore {
  if (getApps().length > 0) {
    return getFirestore();
  }

  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'abroadpath-ai';

  if (emulatorHost) {
    console.log(`🔌 Connecting to Firestore Emulator at ${emulatorHost} (Project: ${projectId})`);
    const app = initializeApp({ projectId });
    return getFirestore(app);
  }

  if (serviceAccountPath && existsSync(serviceAccountPath)) {
    console.log(`🔑 Initializing Firebase Admin with service account: ${serviceAccountPath}`);
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId,
    });
    return getFirestore(app);
  }

  console.log(`⚡ Initializing Firebase Admin with Application Default Credentials (Project: ${projectId})`);
  const app = initializeApp({ projectId });
  return getFirestore(app);
}

// -----------------------------------------------------------------------------
// Main Execution Engine
// -----------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('=================================================================');
  console.log(' AbroadPath AI - Firestore Seed Script');
  console.log('=================================================================');

  const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('--validate-only');

  // Load JSON Files
  if (!existsSync(COUNTRIES_PATH) || !existsSync(UNIVERSITIES_PATH)) {
    throw new Error(`Seed JSON files missing! Looked for:\n  ${COUNTRIES_PATH}\n  ${UNIVERSITIES_PATH}`);
  }

  const countries: Country[] = JSON.parse(readFileSync(COUNTRIES_PATH, 'utf8'));
  const universities: University[] = [
    ...(JSON.parse(readFileSync(UNIVERSITIES_PATH, 'utf8')) as University[]),
    ...SUBJECT_UNIVERSITIES,
  ];

  // Validate
  validateSeedData(countries, universities);

  if (isDryRun) {
    console.log('✨ Dry-run mode completed successfully. All records validated. No database writes performed.');
    process.exit(0);
  }

  // Initialize DB
  const db = initFirestore();
  const batch = db.batch();

  console.log('📦 Staging atomic batch writes...');

  // Stage Countries
  for (const country of countries) {
    const docRef = db.collection('countries').doc(country.id);
    batch.set(docRef, country, { merge: true });
    console.log(`  + Country: ${country.id} (${country.name})`);
  }

  // Stage Universities
  for (const univ of universities) {
    const docRef = db.collection('universities').doc(univ.id);
    batch.set(docRef, univ, { merge: true });
    console.log(`  + University: ${univ.id} (${univ.name} - ${univ.program})`);
  }

  console.log(`🚀 Committing batch (${countries.length + universities.length} operations)...`);
  await batch.commit();

  console.log('=================================================================');
  console.log('🎉 Seeding successfully completed!');
  console.log(`   Countries seeded:    ${countries.length}`);
  console.log(`   Universities seeded: ${universities.length}`);
  console.log(`   Demo Record:         tum_informatics (ruleChanged: true)`);
  console.log('=================================================================');
}

main().catch((err) => {
  console.error('❌ Seeding failed with error:', err.message);
  process.exit(1);
});
