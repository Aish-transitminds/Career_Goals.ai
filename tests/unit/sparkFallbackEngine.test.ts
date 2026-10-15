/**
 * AbroadPath AI - Unit Test Suite for Spark Fallback Engine
 * File: tests/unit/sparkFallbackEngine.test.ts
 * Authoritative Reference: ORIGINAL_REQUEST.md (R5, §Tech Stack) & PROJECT.md
 */

import { SparkFallbackEngine } from '../../src/services/SparkFallbackEngine';

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

const engine = new SparkFallbackEngine();

console.log('--- Spark Fallback Engine Unit Tests ---');

// Test 1: University query for TUM returns verified test requirements and demo rule change
{
  const res = engine.query('What are the GRE and IELTS requirements for TUM?');
  assert(res.content.includes('Technical University of Munich (TUM)'), 'Mentions TUM');
  assert(res.content.includes('IELTS Academic: 6.5'), 'Contains IELTS cutoff 6.5');
  assert(res.content.includes('GRE Requirement: Required'), 'Notes GRE is required');
  assert(res.content.includes('GMAT is now **required**') || res.content.includes('GMAT Requirement: Required'), 'Identifies GMAT rule change');
  assert(Boolean(res.sourceUrl), 'Includes valid sourceUrl');
  assert(Boolean(res.sourceName), 'Includes valid sourceName');
  assert(res.isFallback === true, 'Flagged as fallback engine response');
}

// Test 2: Country query for Germany returns blocked account Sperrkonto amount
{
  const res = engine.query('What are the visa and blocked account rules for Germany?');
  assert(res.content.includes('Germany'), 'Mentions Germany');
  assert(res.content.includes('11,904') || res.content.includes('costRange') || res.content.includes('Sperrkonto'), 'Mentions living costs or blocked account');
  assert(res.sourceUrl.includes('daad.de'), 'Points to DAAD source URL');
}

// Test 3: Country query for Ireland returns visa Stamp 2 and post-study Stamp 1G
{
  const res = engine.query('Tell me about Ireland visa requirements and post-study work');
  assert(res.content.includes('Ireland'), 'Mentions Ireland');
  assert(res.content.includes('Stamp 1G') || res.content.includes('Stamp 2') || res.content.includes('Third Level Graduate Scheme'), 'Mentions post-study work scheme');
  assert(Boolean(res.sourceUrl), 'Source URL present for Ireland');
}

// Test 4: Tuition query for tuition-free universities in Germany
{
  const res = engine.query('Which universities in Germany are free tuition?');
  assert(res.content.includes('RWTH Aachen') || res.content.includes('Heidelberg'), 'Lists free German universities');
  assert(res.content.includes('€0'), 'Displays €0 tuition');
  assert(Boolean(res.sourceUrl), 'Includes source link');
}

// Test 5: Out-of-scope query: Reject SOP generation
{
  const res = engine.query('Can you write an SOP for my computer science application?');
  assert(res.content.includes('strictly operates on verified admission facts and does NOT generate'), 'Rejects SOP generation');
  assert(res.content.includes('/letter-helper'), 'Directs user to Letter Helper');
}

// Test 6: Default query when no keywords match
{
  const res = engine.query('random gibberish string xyz123');
  assert(res.content.includes('AbroadPath factual guide'), 'Returns guidance response');
  assert(res.content.includes('TUM'), 'Provides example prompts');
  assert(Boolean(res.sourceUrl), 'Includes default source URL');
}

// Test 7: UK University query (Oxford)
{
  const res = engine.query('What is the deadline and fee for Oxford?');
  assert(res.content.includes('University of Oxford'), 'Resolves Oxford');
  assert(Boolean(res.sourceUrl), 'Oxford source URL present');
}

// Test 8: Empty query
{
  const res = engine.query('');
  assert(res.content.includes('AbroadPath factual guide'), 'Handles empty query gracefully');
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Spark Fallback Engine tests passed successfully!');
}
