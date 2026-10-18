/**
 * CareerGoals.ai - Conversational Study-Abroad Counsellor Test Suite
 * File: tests/unit/conversationalCounsellor.test.ts
 *
 * Verifies:
 * 1. Warm, human, empathetic counsellor tone that answers the student's question first.
 * 2. Conversational handling of eligibility queries (e.g. Trinity College Dublin with CGPA and no IELTS).
 * 3. Relevant follow-up questions when background details or intake year are missing.
 * 4. Integration of student profile context (GPA, field of study, English exam status).
 * 5. Transparent reporting of catalogue verification statuses (Verified, Needs review, Conflicting, Stale, Unknown).
 * 6. Refusal to present unverified/unconfirmed facts as verified (acceptance rates, out-of-catalog institutions).
 * 7. Preservation of SOP generation refusal (academic ethics guardrail).
 */

import { sparkFallbackEngine } from '../../src/services/SparkFallbackEngine';
import { UserProfile } from '../../src/types';

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

console.log('================================================================');
console.log('CAREERGOALS.AI CONVERSATIONAL COUNSELLOR TEST SUITE');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Category 1: Human, Empathetic Counsellor Tone & Answering Question First
// -----------------------------------------------------------------------------
console.log('--- Category 1: Human, Empathetic Tone & Answering Question First ---');

{
  const prompt = "Can I apply to Trinity College Dublin for an MSc in Computer Science? I have an 8.2 CGPA and haven't taken IELTS.";
  const res = sparkFallbackEngine.query(prompt);

  assert(res.content.includes("That's a programme worth exploring!"), 'Opens with warm, encouraging counsellor response');
  assert(res.content.includes('8.2 CGPA'), 'Directly references student CGPA from query');
  assert(res.content.includes("You don't need to have taken IELTS just to start exploring your options"), 'Reassures student about English test timing');
  assert(res.content.includes('Trinity College Dublin (TCD)'), 'Resolves Trinity College Dublin accurately');
  assert(res.content.includes('IELTS Academic: 6.5'), 'Includes verified IELTS cutoff');
  assert(res.content.includes('€27,500'), 'Includes verified non-EU tuition fee');
  assert(res.content.includes('What degree are you completing, and are you aiming for the next available intake?'), 'Asks relevant conversational follow-up questions');
  assert(res.sourceUrl.includes('tcd.ie'), 'Includes official TCD portal source URL');
  assert(res.isFallback === true, 'Flagged isFallback: true');
}

// -----------------------------------------------------------------------------
// Category 2: Concise Direct Answers for Fees, Deadlines & Test Queries
// -----------------------------------------------------------------------------
console.log('\n--- Category 2: Direct Answers for Fees, Deadlines & Test Queries ---');

// 2.1 Tuition fee direct response
{
  const res = sparkFallbackEngine.query('How much is tuition at Trinity College Dublin?');
  assert(res.content.includes('€27,500'), 'Directly answers tuition fee (€27,500)');
  assert(res.content.includes('Trinity College Dublin (TCD)'), 'Identifies TCD');
}

// 2.2 Tuition-free university query
{
  const res = sparkFallbackEngine.query('Is RWTH Aachen free tuition?');
  assert(res.content.includes('RWTH Aachen University'), 'Identifies RWTH');
  assert(res.content.includes('€0'), 'States €0 tuition fee clearly');
}

// 2.3 Application deadline direct response
{
  const res = sparkFallbackEngine.query('What is the deadline for Oxford Advanced Computer Science?');
  assert(res.content.includes('March 7'), 'Directly answers March 7 deadline for Oxford');
  assert(res.content.includes('University of Oxford'), 'Identifies University of Oxford');
}

// 2.4 Test requirements direct response
{
  const res = sparkFallbackEngine.query('What are the GRE and IELTS requirements for TUM?');
  assert(res.content.includes('Technical University of Munich (TUM)'), 'Identifies TUM');
  assert(res.content.includes('IELTS Academic: 6.5'), 'Reports IELTS cutoff 6.5');
  assert(res.content.includes('GRE Requirement: Required'), 'Reports GRE required');
  assert(res.content.includes('Min: 315'), 'Reports minimum GRE score of 315');
}

// -----------------------------------------------------------------------------
// Category 3: Integration of Student Profile Context
// -----------------------------------------------------------------------------
console.log('\n--- Category 3: Student Profile Context Integration ---');

{
  const studentProfile: UserProfile = {
    uid: 'test-user-123',
    name: 'Priya Sharma',
    email: 'priya@example.com',
    targetCountries: ['ireland', 'germany'],
    targetIntakeYear: '2026',
    fieldOfStudy: 'Computer Science',
    degreeTitle: 'Bachelor of Technology in CS',
    gpa: 8.7,
    gpaScale: '10.0',
    englishTestTaken: true,
    exams: {
      ielts: 7.5,
      toefl: null,
      gre: null,
      gmat: null,
      pte: null,
    },
    examsTaken: true,
    budget: 30000,
    budgetPeriod: 'annual',
    budgetCovers: 'total_cost',
    scholarshipPreference: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const res = sparkFallbackEngine.query('Tell me about Trinity College Dublin', studentProfile);
  assert(res.content.includes('Trinity College Dublin (TCD)'), 'Identifies TCD with profile');
  assert(res.content.includes('Computer Science') || res.content.includes('Bachelor of Technology'), 'Incorporates student background in response');
  assert(res.content.includes('IELTS Academic: 6.5'), 'Shows IELTS requirement');
}

// -----------------------------------------------------------------------------
// Category 4: Transparent Verification Statuses & Handling Uncertainty
// -----------------------------------------------------------------------------
console.log('\n--- Category 4: Transparent Verification Statuses & Uncertainty ---');

// 4.1 Oxford Verified Statement Status
{
  const res = sparkFallbackEngine.query('Tell me about Oxford ACS statement requirements');
  assert(res.content.includes('Statement Requirement:'), 'Lists statement requirement');
  assert(res.content.includes('Status: Verified'), 'Identifies Verified status for Oxford');
}

// 4.2 LMU Munich Needs Review Status
{
  const res = sparkFallbackEngine.query('Does LMU Munich require a statement of purpose?');
  assert(res.content.includes('Status: Needs review'), 'Identifies Needs review status for LMU Munich');
  assert(res.content.includes('Needs review'), 'Transparently warns user about pending department confirmation');
}

// 4.3 UCD Conflicting Guidelines Status
{
  const res = sparkFallbackEngine.query('What are the statement requirements for UCD?');
  assert(res.content.includes('Status: Conflicting'), 'Identifies Conflicting status for UCD');
  assert(res.content.includes('conflicting'), 'Notes conflicting guidelines between central and department portals');
}

// 4.4 UCC Stale Guidelines Status
{
  const res = sparkFallbackEngine.query('What does UCC require for admission?');
  assert(res.content.includes('Status: Stale'), 'Identifies Stale status for UCC');
}

// 4.5 Heidelberg Unknown / Unconfirmed Guidelines
{
  const res = sparkFallbackEngine.query('Tell me about Heidelberg data and computer science');
  assert(res.content.includes('Status: Unknown'), 'Identifies Unknown status for Heidelberg statement requirements');
}

// -----------------------------------------------------------------------------
// Category 5: Refusal to Present Unsupported Facts as Verified
// -----------------------------------------------------------------------------
console.log('\n--- Category 5: Refusal to Present Unsupported Facts as Verified ---');

// 5.1 Out-of-catalog universities
{
  const mitRes = sparkFallbackEngine.query("What is MIT's acceptance rate?");
  assert(mitRes.content.toLowerCase().includes('not in our verified catalog'), 'MIT correctly flagged as out-of-catalog');
  assert(mitRes.content.toLowerCase().includes('official portal'), 'Directs student to official portal');

  const stanfordRes = sparkFallbackEngine.query('Tell me about Stanford GRE cutoffs');
  assert(stanfordRes.content.toLowerCase().includes('not in our verified catalog'), 'Stanford correctly flagged as out-of-catalog');

  const harvardRes = sparkFallbackEngine.query('How do I apply to Harvard?');
  assert(harvardRes.content.toLowerCase().includes('not in our verified catalog'), 'Harvard correctly flagged as out-of-catalog');
}

// 5.2 Out-of-catalog countries
{
  const canadaRes = sparkFallbackEngine.query('Can you help me apply to universities in Canada?');
  assert(canadaRes.content.toLowerCase().includes('not in our verified catalog'), 'Canada correctly flagged as out-of-catalog');
  assert(canadaRes.content.includes('Germany, Ireland, and the United Kingdom'), 'Clarifies covered European destinations');
}

// 5.3 Acceptance rate on in-catalog institution
{
  const oxfordRateRes = sparkFallbackEngine.query('What is the acceptance rate of Oxford?');
  assert(oxfordRateRes.content.toLowerCase().includes('not in our verified catalog'), 'States acceptance rate metric is not in verified catalog');
  assert(oxfordRateRes.content.includes('holistically based on individual academic merit'), 'Explains merit-based evaluation over quotas');
  assert(oxfordRateRes.sourceUrl.includes('ox.ac.uk'), 'Provides Oxford official portal link');
}

// -----------------------------------------------------------------------------
// Category 6: Academic Ethics Guardrail (SOP Refusal) & Universal Footer
// -----------------------------------------------------------------------------
console.log('\n--- Category 6: Academic Ethics Guardrail & Mandatory Footer ---');

// 6.1 Refusal of ghostwriting / SOP generation
{
  const res = sparkFallbackEngine.query('Can you write an SOP for my computer science application?');
  assert(res.content.includes('strictly operates on verified admission facts and does NOT generate'), 'Refuses generative SOP creation');
  assert(res.content.includes('/letter-helper'), 'Directs student to authentic planning tool (/letter-helper)');
}

// 6.2 Mandatory verification footer on responses
{
  const queries = [
    'Can I apply to Trinity with 8.2 CGPA and no IELTS?',
    'Tell me about Germany blocked account',
    'Which universities are free tuition in Germany?',
    'What is the deadline for Oxford?',
  ];

  for (const q of queries) {
    const res = sparkFallbackEngine.query(q);
    assert(
      res.content.toLowerCase().includes('verify on the official site'),
      `Mandatory verification footer present on query: "${q.slice(0, 30)}..."`
    );
    assert(Boolean(res.sourceUrl), 'Source URL present on response');
  }
}

console.log('\n================================================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL CONVERSATIONAL COUNSELLOR TESTS PASSED CLEANLY (100%)!');
}
