/**
 * Atlas AI Architecture v2 - Test Suite Runner
 * Runs 32 automated test questions covering easy lookups, calculators,
 * trick/out-of-scope questions, academic honesty refusals, and profile-based checks.
 * Tracks the 4 product quality metrics: correct, correctly refused, wrong, and unsourced.
 */

import fs from 'fs';
import path from 'path';
import { atlasService } from '../src/services/atlasService';

interface TestCase {
  id: string;
  category: string;
  prompt: string;
  expectedType: 'verified' | 'out_of_scope' | 'refused_dishonest' | 'unverified';
  mustContain?: string[];
  mustHaveSource?: boolean;
  profile?: any;
}

async function runTestSuite() {
  const suitePath = path.resolve(process.cwd(), 'tests/atlas-test-suite.json');
  const rawData = fs.readFileSync(suitePath, 'utf8');
  const testCases: TestCase[] = JSON.parse(rawData);

  console.log('='.repeat(70));
  console.log(`Running Atlas v2 Test Suite (${testCases.length} Test Cases)`);
  console.log('='.repeat(70));

  let correct = 0;
  let correctlyRefused = 0;
  let wrong = 0;
  let unsourced = 0;

  for (const tc of testCases) {
    try {
      const res = await atlasService.askAtlas(tc.prompt, {
        userProfile: tc.profile || null,
        useProfile: Boolean(tc.profile),
        bypassCache: true,
        bypassRateLimit: true,
      });

      const fullOutputText = [
        res.directAnswer || '',
        ...res.blocks.map((b) => b.text),
        ...(res.details?.map((d) => `${d.label} ${d.value}`) || []),
      ]
        .join(' ')
        .toLowerCase();

      let passed = true;
      let failureReason = '';

      // Check category match
      if (tc.expectedType === 'verified') {
        if (res.status !== 'verified') {
          passed = false;
          failureReason = `Expected status 'verified', got '${res.status}'`;
        }

        // Check source provenance
        if (tc.mustHaveSource) {
          const hasSource = Boolean(
            res.primarySource?.url || res.blocks.some((b) => b.sourceUrl)
          );
          if (!hasSource) {
            unsourced++;
            passed = false;
            failureReason = 'Missing verified source link';
          }
        }
      } else if (
        tc.expectedType === 'out_of_scope' ||
        tc.expectedType === 'refused_dishonest' ||
        tc.expectedType === 'unverified'
      ) {
        if (res.status !== tc.expectedType) {
          passed = false;
          failureReason = `Expected refusal/fallback status '${tc.expectedType}', got '${res.status}'`;
        }
      }

      // Check mustContain strings
      if (tc.mustContain) {
        for (const str of tc.mustContain) {
          if (!fullOutputText.includes(str.toLowerCase())) {
            passed = false;
            failureReason = `Output missing required keyword: '${str}'`;
            break;
          }
        }
      }

      if (passed) {
        if (tc.expectedType === 'verified') {
          correct++;
          console.log(`  ✓ [${tc.id}] ${tc.category}: ${tc.prompt.slice(0, 42)}... -> CORRECT`);
        } else {
          correctlyRefused++;
          console.log(
            `  ✓ [${tc.id}] ${tc.category}: ${tc.prompt.slice(0, 42)}... -> CORRECTLY REFUSED`
          );
        }
      } else {
        wrong++;
        console.error(`  ✗ [${tc.id}] FAIL: ${tc.prompt}`);
        console.error(`    Reason: ${failureReason}`);
        console.error(`    Got directAnswer: ${res.directAnswer}`);
      }
    } catch (err: any) {
      wrong++;
      console.error(`  ✗ [${tc.id}] CRASH: ${tc.prompt}`);
      console.error(`    Error: ${err.message}`);
    }
  }

  console.log('='.repeat(70));
  console.log('ATLAS v2 PRODUCT QUALITY METRICS SCORECARD');
  console.log('='.repeat(70));
  console.log(`  • Correct:            ${correct}`);
  console.log(`  • Correctly Refused:  ${correctlyRefused}`);
  console.log(`  • Wrong:              ${wrong}  (Target: 0)`);
  console.log(`  • Unsourced:          ${unsourced}  (Target: 0)`);
  console.log(`  • Total Tests:        ${testCases.length}`);
  console.log('='.repeat(70));

  if (wrong > 0 || unsourced > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL TESTS PASSED! ZERO WRONG, ZERO UNSOURCED.');
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
