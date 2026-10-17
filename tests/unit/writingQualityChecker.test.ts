/**
 * AbroadPath AI - Writing Quality Checker & Anti-Rewrite Guarantee Unit Tests
 * File: tests/unit/writingQualityChecker.test.ts
 *
 * Verifies:
 * 1. Word count boundaries & empty/long input stability.
 * 2. Specificity detection (numbers, named entities, tools, course codes).
 * 3. Vague-claim & cliché detection (case-insensitive, multi-match).
 * 4. Long-sentence detection (> 35 words) and average calculation.
 * 5. Repetition detection (repeated openers, "I" ratio, consecutive openers).
 * 6. PROOF that NO local function returns replacement or rewritten text.
 * 7. LLM response validator rejects rewrite suggestions.
 */

import {
  analyzeDraft,
  countConcreteAnchors,
  detectVagueClaims,
  detectCliches,
  analyzeSentenceReadability,
  analyzeRepetition,
  checkStructureCoverage,
  getParagraphs,
  getSentences,
} from '../../src/utils/writingQualityChecker';
import { validateNoRewrites } from '../../src/services/aiCoachingService';

console.log('================================================================');
console.log('TEST SUITE: SOP WRITING QUALITY CHECKER & ANTI-REWRITE GUARANTEE');
console.log('================================================================\n');

let failedTests = 0;
function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failedTests++;
  }
}

// -------------------------------------------------------------
// Test 1: Empty and Extreme Input Boundaries
// -------------------------------------------------------------
console.log('--- TEST 1: Empty and Boundary Inputs ---');
const emptyResult = analyzeDraft('');
assert(emptyResult.wordCount === 0, 'Empty string yields 0 words');
assert(emptyResult.sentenceCount === 0, 'Empty string yields 0 sentences');
assert(emptyResult.issues.length === 0, 'Empty string yields 0 issues');

const whitespaceResult = analyzeDraft('   \n\n\t  ');
assert(whitespaceResult.wordCount === 0, 'Whitespace string yields 0 words');

// Paragraph and sentence splitters
assert(getParagraphs('Para 1\n\nPara 2').length === 2, 'getParagraphs returns 2 paragraphs');
assert(getSentences('Sentence one. Sentence two!').length === 2, 'getSentences returns 2 sentences');

// Very long input test (3,000 words without crash or infinite loops)
const longParagraph = 'In this laboratory experiment we benchmarked PyTorch models on 25000 images. '.repeat(200);
const longResult = analyzeDraft(longParagraph);
assert(longResult.wordCount > 2000, 'Handled long 2,000+ word input without degradation');
assert(longResult.concreteAnchorsCount > 100, 'Counted repeated concrete anchors in large input');

// -------------------------------------------------------------
// Test 2: Specificity & Concrete Anchor Detection
// -------------------------------------------------------------
console.log('\n--- TEST 2: Specificity & Concrete Anchor Detection ---');
const specificText =
  'While testing our pipeline on PyTorch and Kafka, I achieved a 40% accuracy improvement and handled 25,000 records with CS224N principles under Prof. Weber at the Institute of Technology.';

const { count, anchorsFound } = countConcreteAnchors(specificText);
assert(count >= 5, `Identified multiple anchors (found: ${count})`);
assert(anchorsFound.some((a) => a.includes('40%')), 'Captured percentage anchor "40%"');
assert(anchorsFound.some((a) => a.includes('pytorch')), 'Captured framework anchor "pytorch"');
assert(anchorsFound.some((a) => a.includes('kafka')), 'Captured tool anchor "kafka"');
assert(anchorsFound.some((a) => a.includes('CS224N')), 'Captured course code anchor "CS224N"');
assert(anchorsFound.some((a) => a.includes('Prof. Weber')), 'Captured faculty anchor "Prof. Weber"');

// Paragraph with 0 anchors detection
const vagueParagraph =
  'I have always had a strong work ethic and truly believe that learning is a wonderful journey where one can grow as a person and gain deep maturity over time.';
const vagueParagraphResult = analyzeDraft(vagueParagraph);
assert(
  vagueParagraphResult.issues.some((i) => i.category === 'specificity'),
  'Flagged paragraph lacking concrete details with a question'
);

// -------------------------------------------------------------
// Test 3: Vague-Claim & Cliché Detection (Case-Insensitive & Multi-Match)
// -------------------------------------------------------------
console.log('\n--- TEST 3: Vague-Claim & Cliché Detection ---');
const clicheSample =
  'Ever since I was ten, I have been VERY PASSIONATE about computers. In today’s fast-paced world, artificial intelligence is a testament to human progress, and I am a quick learner.';

const vagueIssues = detectVagueClaims(clicheSample);
assert(vagueIssues.length >= 2, `Detected multiple vague claims (found: ${vagueIssues.length})`);
assert(
  vagueIssues.some((i) => i.quote?.toLowerCase() === 'very passionate'),
  'Detected uppercase/mixed "VERY PASSIONATE"'
);
assert(
  vagueIssues.some((i) => i.quote?.toLowerCase() === 'quick learner'),
  'Detected "quick learner"'
);

const clicheIssues = detectCliches(clicheSample);
assert(clicheIssues.length >= 3, `Detected multiple clichés (found: ${clicheIssues.length})`);
assert(
  clicheIssues.some((i) => i.quote?.toLowerCase().includes('ever since i was')),
  'Detected cliché "ever since i was"'
);
assert(
  clicheIssues.some((i) => i.quote?.toLowerCase().includes('testament to')),
  'Detected AI boilerplate "testament to"'
);
assert(
  clicheIssues.some((i) => i.quote?.replace(/[\u2018\u2019]/g, "'").toLowerCase().includes("in today's fast-paced world")),
  'Detected formulaic opener "in today’s fast-paced world"'
);

// -------------------------------------------------------------
// Test 4: Sentence Length & Readability Analysis
// -------------------------------------------------------------
console.log('\n--- TEST 4: Sentence Length & Readability ---');
const sentences = [
  'This is a crisp technical sentence with twelve words that gets directly to the point.',
  'During my final year project when we were investigating various aspects of machine learning architectures and comparing them across different hardware configurations while testing multiple neural models under constrained bandwidth conditions with insufficient memory buffers, our team encountered severe throughput degradation that caused significant pipeline bottlenecks.',
];

const { issues: lengthIssues, avgSentenceLength } = analyzeSentenceReadability(sentences);
assert(avgSentenceLength > 20, `Computed avg sentence length (${avgSentenceLength} w/s)`);
assert(lengthIssues.length === 1, 'Flagged sentence > 35 words');
assert(lengthIssues[0].observation.includes('46 words'), 'Reported accurate word count in over-long sentence');
assert(lengthIssues[0].question.endsWith('?'), 'Prompted with question ending in ?');

// -------------------------------------------------------------
// Test 5: Repetition Analysis (Sentence Openers & "I" frequency)
// -------------------------------------------------------------
console.log('\n--- TEST 5: Repetition Analysis ---');
const repetitiveOpeners = [
  'I started by preparing the training dataset.',
  'I then trained the baseline model using Python.',
  'I evaluated the test accuracy on the validation split.',
];
const repIssues = analyzeRepetition(repetitiveOpeners.join(' '), repetitiveOpeners);
assert(
  repIssues.some((i) => i.id === 'rep_i_openers'),
  'Flagged 3 consecutive sentences opening with "I"'
);

// Consecutive opener repetition
const consecutiveOpeners = [
  'Furthermore, the architecture provides distributed fault tolerance.',
  'Furthermore, the memory footprint was reduced by 15 percent.',
];
const consecIssues = analyzeRepetition(consecutiveOpeners.join(' '), consecutiveOpeners);
assert(
  consecIssues.some((i) => i.id.startsWith('rep_consecutive')),
  'Flagged consecutive sentences opening with identical transition "Furthermore"'
);

// -------------------------------------------------------------
// Test 6: Structure Check Coverage
// -------------------------------------------------------------
console.log('\n--- TEST 6: Structure Check Coverage ---');
const incompleteDraft = 'I wrote some code for data processing in Python.';
const { checklist: check1, issues: structIssues1 } = checkStructureCoverage(
  incompleteDraft,
  'Technical University of Munich',
  'M.Sc. Informatics'
);
assert(!check1.targetUniversityDetected, 'Correctly flagged target university not detected');
assert(!check1.courseModulesDetected, 'Correctly flagged course modules not detected');
assert(!check1.careerTrajectoryDetected, 'Correctly flagged career trajectory not detected');
assert(structIssues1.length === 3, 'Returned 3 advisory structure observations');
assert(
  structIssues1.every((i) => i.observation.startsWith('Not detected')),
  'Observations are formatted as "Not detected" rather than punitive verdicts'
);

// -------------------------------------------------------------
// Test 7: ABSOLUTE INVARIANT - Local Functions NEVER Return Rewrites
// -------------------------------------------------------------
console.log('\n--- TEST 7: Anti-Rewrite Invariant Verification (Local Functions) ---');
const sampleDraft =
  'Ever since childhood I have been very passionate about technology. I built an app with Python and 25000 records. In today’s fast-paced world, I am a quick learner.';

const fullAnalysis = analyzeDraft(sampleDraft);
let producedAnyRewrite = false;

for (const issue of fullAnalysis.issues) {
  // Check if any issue observation or question offers replacement text
  const text = `${issue.observation} ${issue.question}`.toLowerCase();
  if (
    text.includes('instead write') ||
    text.includes('consider writing:') ||
    text.includes('try writing:') ||
    text.includes('replace with:') ||
    text.includes('better version:')
  ) {
    producedAnyRewrite = true;
    break;
  }

  // Must always end with a question mark
  assert(
    issue.question.trim().endsWith('?'),
    `Issue question ends with question mark: "${issue.question.slice(0, 40)}..."`
  );
}

assert(!producedAnyRewrite, 'Zero rewrite suggestions produced across all local analysis checks');

// -------------------------------------------------------------
// Test 8: LLM Response Validator - Rejection of Rewrites
// -------------------------------------------------------------
console.log('\n--- TEST 8: Anti-Rewrite Invariant Verification (LLM Response Validator) ---');

// Clean coach responses that ask questions and quote student words
const cleanResponse1 = `
Strengths:
1. "handled 25,000 sensor readings per second" shows concrete engineering scale.
2. "temporal convolutional blocks" demonstrates specific architectural knowledge.

Areas for Improvement:
1. You wrote "I am very passionate". What project from your Evidence Bank demonstrates this dedication?
2. You mentioned "your university". Which specific laboratory chair at TUM are you targeting?

Structural Observation:
Your transition from undergraduate capstone to career goals is logical and well-grounded.
`;
assert(validateNoRewrites(cleanResponse1) === true, 'Accepted clean Socratic coach response');

// Ghostwriting / Rewrite attempts that must be REJECTED
const rewriteAttempt1 = `
You wrote: "Ever since I was ten years old assembling my first toy circuits".
Try: "During my second year embedded systems laboratory, I implemented..."
`;
assert(validateNoRewrites(rewriteAttempt1) === false, 'Rejected response containing "Try:"');

const rewriteAttempt2 = `
Consider writing: "My research at State Tech University focused on quantized neural networks."
`;
assert(validateNoRewrites(rewriteAttempt2) === false, 'Rejected response containing "Consider writing:"');

const rewriteAttempt3 = `
Instead, write: "By implementing Kafka buffers, latency dropped by 18%."
`;
assert(validateNoRewrites(rewriteAttempt3) === false, 'Rejected response containing "Instead, write:"');

const rewriteAttempt4 = `
Replacement sentence: "I aim to specialize in distributed database systems."
`;
assert(validateNoRewrites(rewriteAttempt4) === false, 'Rejected response containing "Replacement sentence:"');

const rewriteAttempt5 = `
Here is a better version: "Working with PyTorch enabled our team to improve the F1-score."
`;
assert(validateNoRewrites(rewriteAttempt5) === false, 'Rejected response containing "Here is a better version:"');

// -------------------------------------------------------------
// Final Summary
// -------------------------------------------------------------
console.log('\n================================================================');
if (failedTests === 0) {
  console.log('✓ ALL WRITING QUALITY CHECKER & ANTI-REWRITE TESTS PASSED');
  console.log('================================================================');
} else {
  console.error(`✗ ${failedTests} TESTS FAILED`);
  console.log('================================================================');
  process.exit(1);
}
