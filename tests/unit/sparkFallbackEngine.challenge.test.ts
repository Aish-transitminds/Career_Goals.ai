/**
 * AbroadPath AI - Adversarial Empirical Challenge Suite for Spark Fallback Engine
 * File: tests/unit/sparkFallbackEngine.challenge.test.ts
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1 §Screens #8, R5) & PROJECT.md
 * Executed by: Challenger 1 (M3-R2 Test & Engine Challenger)
 */

import { SparkFallbackEngine } from '../../src/services/SparkFallbackEngine';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

const engine = new SparkFallbackEngine();

console.log('================================================================');
console.log('AbroadPath AI - Spark Fallback Engine Adversarial Challenge Suite');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: Entity Aliasing Coverage for all 11 Universities
// -----------------------------------------------------------------------------
console.log('[SECTION 1] Challenging Entity Aliasing for All 11 Seed Universities');

// 1.1 tum_informatics
{
  const res = engine.query('Tell me about TUM Informatics admission requirements');
  assert(res.content.includes('Technical University of Munich (TUM)'), '1.1 TUM resolves via "TUM Informatics"');
  assert(res.sourceUrl.includes('tum.de'), '1.1 TUM sourceUrl is valid');
}

// 1.2 rwth_cs
{
  const res = engine.query('What is the deadline for RWTH Aachen computer science?');
  assert(res.content.includes('RWTH Aachen University'), '1.2 RWTH resolves via "RWTH Aachen"');
  assert(res.content.includes('€0 (Tuition-free'), '1.2 RWTH tuition is €0');
}

// 1.3 heidelberg_dcs
{
  const res = engine.query('Does Heidelberg University require IELTS?');
  assert(res.content.includes('Heidelberg University'), '1.3 Heidelberg resolves via "Heidelberg University"');
  assert(res.content.includes('IELTS Academic: 6.5'), '1.3 Heidelberg IELTS cutoff is 6.5');
}

// 1.4 lmu_datascience
{
  const res = engine.query('What are the entry criteria for LMU Munich data science?');
  assert(res.content.includes('Ludwig-Maximilians-Universität München (LMU)'), '1.4 LMU resolves via "LMU Munich"');
  assert(res.content.includes('IELTS Academic: 7'), '1.4 LMU IELTS cutoff is 7.0');
}

// 1.5 tcd_cs
{
  const res = engine.query('How much is tuition at Trinity College Dublin?');
  assert(res.content.includes('Trinity College Dublin (TCD)'), '1.5 TCD resolves via "Trinity College Dublin"');
  assert(res.content.includes('€27,500'), '1.5 TCD tuition is €27,500');
}

// 1.6 ucd_cs
{
  const res = engine.query('What are the deadlines for UCD computer science?');
  assert(res.content.includes('University College Dublin (UCD)'), '1.6 UCD resolves via "UCD"');
  assert(res.content.includes('July 1'), '1.6 UCD deadline is July 1');
}

// 1.7 galway_cs
{
  const res = engine.query('Tell me about admissions at University of Galway');
  assert(res.content.includes('University of Galway'), '1.7 Galway resolves via "University of Galway"');
  assert(res.content.includes('€28,640'), '1.7 Galway tuition is €28,640');
}

// 1.8 ucc_cs
{
  const res = engine.query('What are the requirements for UCC Cork computing?');
  assert(res.content.includes('University College Cork (UCC)'), '1.8 UCC resolves via "UCC Cork"');
  assert(res.content.includes('June 15'), '1.8 UCC deadline is June 15');
}

// 1.9 imperial_computing
{
  const res = engine.query('What is the IELTS requirement for Imperial College London?');
  assert(res.content.includes('Imperial College London'), '1.9 Imperial resolves via "Imperial College London"');
  assert(res.content.includes('IELTS Academic: 7'), '1.9 Imperial IELTS cutoff is 7.0');
}

// 1.10 oxford_acs
{
  const res = engine.query('What is the deadline for Oxford Advanced Computer Science?');
  assert(res.content.includes('University of Oxford'), '1.10 Oxford resolves via "Oxford Advanced Computer Science"');
  assert(res.content.includes('March 7'), '1.10 Oxford deadline is March 7');
}

// 1.11 manchester_acs
{
  const res = engine.query('What are the tuition fees at University of Manchester?');
  assert(res.content.includes('University of Manchester'), '1.11 Manchester resolves via "University of Manchester"');
  assert(res.content.includes('£41,400'), '1.11 Manchester tuition is £41,400');
}

// -----------------------------------------------------------------------------
// SECTION 2: Substring False Positive Resistance (Regex Word Boundaries)
// -----------------------------------------------------------------------------
console.log('\n[SECTION 2] Challenging Substring False Positives with Word Boundaries');

// 2.1 "autumn" must not trigger "tum"
{
  const res = engine.query('When do autumn semester admissions open?');
  assert(!res.content.includes('Technical University of Munich (TUM)'), '2.1 "autumn" does NOT trigger TUM');
  assert(res.content.includes('AbroadPath factual guide'), '2.1 Fallback guidance returned for generic autumn query');
}

// 2.2 "succinct" must not trigger "ucc"
{
  const res = engine.query('Give me a succinct overview of European study');
  assert(!res.content.includes('University College Cork (UCC)'), '2.2 "succinct" does NOT trigger UCC');
  assert(res.content.includes('AbroadPath factual guide'), '2.2 Fallback guidance returned for generic succinct query');
}

// 2.3 "costume" must not trigger "tum"
{
  const res = engine.query('Tell me about costume design history');
  assert(!res.content.includes('Technical University of Munich (TUM)'), '2.3 "costume" does NOT trigger TUM');
}

// 2.4 "success" must not trigger "ucc"
{
  const res = engine.query('What is the success rate for master admissions?');
  assert(!res.content.includes('University College Cork (UCC)'), '2.4 "success" does NOT trigger UCC');
}

// 2.5 "fluke" must not trigger "uk"
{
  const res = engine.query('Is admission a fluke or merit based?');
  assert(!res.content.includes('United Kingdom'), '2.5 "fluke" does NOT trigger UK');
}

// 2.6 Isolated acronym tokens MUST trigger correctly
{
  const resTum = engine.query('What are the fees for TUM?');
  assert(resTum.content.includes('Technical University of Munich (TUM)'), '2.6 Isolated "TUM" triggers tum_informatics');

  const resUcc = engine.query('What is the deadline for UCC?');
  assert(resUcc.content.includes('University College Cork (UCC)'), '2.6 Isolated "UCC" triggers ucc_cs');
}

// -----------------------------------------------------------------------------
// SECTION 3: Query Precedence (Free Tuition vs Country Match vs University Match)
// -----------------------------------------------------------------------------
console.log('\n[SECTION 3] Challenging Query Precedence Hierarchy');

// 3.1 Discovery query: "Which universities in Germany are free tuition?"
// Must return free universities (RWTH, LMU), NOT generic Germany country guide!
{
  const res = engine.query('Which universities in Germany are free tuition?');
  assert(res.content.includes('RWTH Aachen University'), '3.1 Free tuition query lists RWTH Aachen');
  assert(res.content.includes('Ludwig-Maximilians-Universität München (LMU)'), '3.1 Free tuition query lists LMU Munich');
  assert(res.content.includes('€0'), '3.1 Free tuition query contains €0');
  assert(!res.content.includes('Official Country Guidelines for **Germany**'), '3.1 Precedence: Does NOT return generic Germany country guide');
}

// 3.2 Discovery query: "Where can I study for zero tuition?"
{
  const res = engine.query('Where can I study for zero tuition?');
  assert(res.content.includes('RWTH Aachen University'), '3.2 Zero tuition query lists RWTH Aachen');
  assert(res.content.includes('€0'), '3.2 Zero tuition query notes €0 tuition');
}

// 3.3 Specific country query: "What are the visa and blocked account rules for Germany?"
// Must return Germany country guide!
{
  const res = engine.query('What are the visa and blocked account rules for Germany?');
  assert(res.content.includes('Official Country Guidelines for **Germany**'), '3.3 Returns Germany country guide');
  assert(res.content.includes('11,904') || res.content.includes('Sperrkonto'), '3.3 Mentions blocked account');
}

// 3.4 Specific institution query takes highest precedence: "Is TUM free tuition?"
// Must return TUM specific fees (€6,000), NOT the generic free universities list!
{
  const res = engine.query('Is TUM free tuition?');
  assert(res.content.includes('Technical University of Munich (TUM)'), '3.4 Specific university takes precedence over free list');
  assert(res.content.includes('€6,000'), '3.4 Reflects TUM non-EU tuition of €6,000');
}

// -----------------------------------------------------------------------------
// SECTION 4: Adversarial SOP Refusal & Academic Ethics Guardrails
// -----------------------------------------------------------------------------
console.log('\n[SECTION 4] Challenging SOP Refusal with Adversarial Prompts');

const adversarialSopPrompts = [
  'Draft a statement of purpose',
  'Write an SOP for TUM',
  'Create a motivation letter for Oxford',
  'Can you write an SOP for my computer science application?',
  'Compose a motivation letter for Heidelberg',
  'I want you to write my personal statement for Imperial',
  'Produce an admission essay for Galway',
  'Help me write an SOP for Trinity College Dublin',
  'SOP generator for German universities',
  'Rewrite my motivation letter',
  'Edit my statement of purpose',
  'Can you draft an SOP for UCD?',
];

for (const prompt of adversarialSopPrompts) {
  const res = engine.query(prompt);
  assert(
    res.content.includes('AbroadPath AI strictly operates on verified admission facts and does NOT generate') &&
    res.content.includes('/letter-helper'),
    `4. SOP refusal intercepted: "${prompt}"`
  );
}

// -----------------------------------------------------------------------------
// SECTION 5: Preservation of Legitimate Admissions Requirements Queries
// -----------------------------------------------------------------------------
console.log('\n[SECTION 5] Preserving Legitimate Admissions Queries Mentioning Documents');

// 5.1 Asking whether TUM requires an SOP should NOT be refused
{
  const res = engine.query('Does TUM require an SOP or letter of motivation?');
  assert(!res.content.includes('AbroadPath AI strictly operates on verified admission facts and does NOT generate'), '5.1 TUM requirement check is not falsely refused');
  assert(res.content.includes('Technical University of Munich (TUM)'), '5.1 Resolves to TUM admission details');
}

// 5.2 Country document checklist query mentioning SOP
{
  const res = engine.query('What documents are required for Ireland student visa?');
  assert(res.content.includes('Official Country Guidelines for **Ireland**'), '5.2 Returns Ireland guidelines');
  assert(!res.content.includes('strictly operates on verified admission facts and does NOT generate'), '5.2 Ireland document inquiry not refused');
}

// -----------------------------------------------------------------------------
// SECTION 6: Baseline Verification and Mandatory Footer
// -----------------------------------------------------------------------------
console.log('\n[SECTION 6] Checking Mandatory "Verify on the official site" Footer');

const sampleQueries = [
  'Tell me about TUM',
  'Which universities in Germany are free tuition?',
  'Germany visa requirements',
  'Draft a statement of purpose',
  'random non-matching query',
];

for (const q of sampleQueries) {
  const res = engine.query(q);
  assert(
    res.content.includes('Verify on the official site') || res.content.includes('verify on the official site'),
    `6. Mandatory verification footer present for: "${q}"`
  );
  assert(Boolean(res.sourceUrl), `6. Valid sourceUrl present for: "${q}"`);
  assert(res.isFallback === true, `6. Flagged isFallback: true for: "${q}"`);
}

console.log(`\n================================================================`);
console.log(`Challenge Results: ${passed} passed, ${failed} failed`);
console.log(`================================================================`);
