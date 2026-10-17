/**
 * AbroadPath AI - Statement of Purpose Writing Quality Checker (Pure Deterministic)
 * File: src/utils/writingQualityChecker.ts
 *
 * ZERO AI / 100% LOCAL BROWSER INVARIANT:
 * - This checker runs purely client-side with regex and token heuristics.
 * - NEVER generates, rewrites, paraphrases, or suggests replacement wording.
 * - Allowed outputs: observations that quote or point at the student's own words,
 *   counts/metrics, and questions that prompt the student to improve their own text.
 */

import {
  AI_BOILERPLATE_PATTERNS,
  VAGUE_INTENSIFIER_PATTERNS,
  STOP_WORDS,
} from '../config/clicheConstants';

export interface QualityIssue {
  id: string;
  category: 'specificity' | 'vague_claim' | 'readability' | 'repetition' | 'cliche' | 'structure';
  severity: 'flag' | 'warning' | 'info';
  quote?: string;
  observation: string;
  question: string;
}

export interface StructureCheckResult {
  targetUniversityDetected: boolean;
  courseModulesDetected: boolean;
  careerTrajectoryDetected: boolean;
}

export interface WritingAnalysisResult {
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  paragraphCount: number;
  concreteAnchorsCount: number;
  issues: QualityIssue[];
  structureChecklist: StructureCheckResult;
}

// Known technical frameworks, tools, languages, and methodologies
const TECHNICAL_ANCHORS = new Set<string>([
  'python', 'pytorch', 'tensorflow', 'keras', 'c++', 'c#', 'java', 'rust',
  'golang', 'go', 'javascript', 'typescript', 'react', 'node', 'nodejs',
  'docker', 'kubernetes', 'kafka', 'spark', 'hadoop', 'sql', 'postgresql',
  'mysql', 'mongodb', 'redis', 'cassandra', 'linux', 'git', 'fpga', 'verilog',
  'matlab', 'simulink', 'opencv', 'ros', 'numpy', 'scipy', 'pandas',
  'scikit-learn', 'graphql', 'rest', 'aws', 'gcp', 'azure', 'tableau',
  'powerbi', 'r', 'latex', 'lstm', 'cnn', 'transformer', 'bert', 'gpt',
  'f1-score', 'f1', 'auc', 'roc', 'latency', 'throughput', 'bandwidth',
]);

/**
 * Split text into individual paragraphs, ignoring purely blank lines.
 */
export function getParagraphs(text: string): string[] {
  if (!text || !text.trim()) return [];
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Split text into sentences using standard punctuation boundaries.
 */
export function getSentences(text: string): string[] {
  if (!text || !text.trim()) return [];
  // Split on '.', '!', '?' followed by whitespace or end of line
  const raw = text.split(/(?<=[.!?])\s+|\n+/);
  return raw.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Counts concrete anchors in a segment of text:
 * - Numeric metrics (percentages, numbers, years, benchmarks)
 * - Known named technical tools/libraries
 * - Course/module markers (e.g., "Module", "Course", "CS101", "IN2000")
 * - Laboratory, Faculty, or Institution citations (e.g. "Prof.", "Dr.", "Lab", "Institute")
 */
export function countConcreteAnchors(text: string): { count: number; anchorsFound: string[] } {
  if (!text || !text.trim()) return { count: 0, anchorsFound: [] };

  const anchors: string[] = [];
  const lower = text.toLowerCase();

  // 1. Numbers with units, percentages, or multi-digit metrics (e.g. "40%", "15,000", "0.89", "25ms")
  const numberMatches = text.match(/\b\d+(?:[.,]\d+)?(?:\s*(?:%|ms|fps|gb|mb|ghz|mhz|k|x))?|\b\d+(?:[.,]\d+)?%/gi) || [];
  for (const m of numberMatches) {
    if (m.trim().length > 0) anchors.push(m.trim());
  }

  // 2. Technical tools & frameworks
  const tokens = lower.match(/[a-z0-9+#.-]+/g) || [];
  for (const token of tokens) {
    if (TECHNICAL_ANCHORS.has(token)) {
      anchors.push(token);
    }
  }

  // 3. Course codes and named modules (e.g., CS224N, IN2315, "Module CS-401")
  const courseCodeMatches = text.match(/\b(?:[A-Z]{2,4}\s*[-_]?\s*\d{3,4}[A-Z]?)\b/g) || [];
  for (const code of courseCodeMatches) {
    anchors.push(code);
  }

  // 4. Lab / Faculty / Chair markers
  const facultyMatches = text.match(/\b(?:Prof\.|Dr\.|Chair for|Department of|Laboratory|Lab|Institute of|Center for)\s+[A-Z][a-zA-Z]+/g) || [];
  for (const f of facultyMatches) {
    anchors.push(f);
  }

  // De-duplicate for cleaner reporting
  const uniqueAnchors = Array.from(new Set(anchors));
  return {
    count: anchors.length,
    anchorsFound: uniqueAnchors,
  };
}

/**
 * Detect vague intensifiers and self-proclamations.
 * ALWAYS pairs each finding with a question, never a rewrite.
 */
export function detectVagueClaims(text: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const normalized = text.replace(/[\u2018\u2019]/g, "'");
  const lower = normalized.toLowerCase();

  for (const pattern of VAGUE_INTENSIFIER_PATTERNS) {
    const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(lower)) !== null) {
      const originalQuote = text.substring(match.index, match.index + pattern.length);
      issues.push({
        id: `vague_${match.index}`,
        category: 'vague_claim',
        severity: 'warning',
        quote: originalQuote,
        observation: `Contains unsupported generic claim or intensifier "${originalQuote}".`,
        question: `You wrote "${originalQuote}". What concrete project or measurable result from your Evidence Bank demonstrates this without needing self-praise?`,
      });
    }
  }

  return issues;
}

/**
 * Detect formulaic AI boilerplate and application clichés.
 * Quotes the student's phrase and asks a reflective question.
 */
export function detectCliches(text: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const normalized = text.replace(/[\u2018\u2019]/g, "'");
  const lower = normalized.toLowerCase();

  for (const pattern of AI_BOILERPLATE_PATTERNS) {
    const regex = new RegExp(`\\b${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(lower)) !== null) {
      const originalQuote = text.substring(match.index, match.index + pattern.length);
      issues.push({
        id: `cliche_${match.index}`,
        category: 'cliche',
        severity: 'flag',
        quote: originalQuote,
        observation: `Matches formulaic cliché or AI boilerplate "${originalQuote}".`,
        question: `Admissions committees read thousands of essays and screen out formulaic phrases like "${originalQuote}". What specific intellectual catalyst or technical experience can you describe instead?`,
      });
    }
  }

  return issues;
}

/**
 * Analyze sentence lengths and readability.
 * Flags sentences over 35 words.
 */
export function analyzeSentenceReadability(sentences: string[]): {
  issues: QualityIssue[];
  avgSentenceLength: number;
} {
  const issues: QualityIssue[] = [];
  if (sentences.length === 0) return { issues, avgSentenceLength: 0 };

  let totalWords = 0;

  sentences.forEach((sentence, idx) => {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    const count = words.length;
    totalWords += count;

    if (count > 35) {
      const preview = sentence.length > 70 ? `${sentence.slice(0, 70)}...` : sentence;
      issues.push({
        id: `sentence_length_${idx}`,
        category: 'readability',
        severity: 'warning',
        quote: preview,
        observation: `Sentence ${idx + 1} is ${count} words long (exceeds recommended ~35 words).`,
        question: `This sentence is ${count} words long. Could you split it into two focused sentences so committee reviewers absorb your point faster?`,
      });
    }
  });

  const avgSentenceLength = Math.round(totalWords / sentences.length);
  return { issues, avgSentenceLength };
}

/**
 * Check for repetitive sentence openers, overuse of 'I', and word repetition.
 */
export function analyzeRepetition(text: string, sentences: string[]): QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (!text || sentences.length === 0) return issues;

  // 1. Repeated openers
  let iOpenerCount = 0;
  const openers: { word: string; index: number }[] = [];

  sentences.forEach((sentence, idx) => {
    const firstWordMatch = sentence.trim().match(/^[A-Za-z]+/);
    if (firstWordMatch) {
      const opener = firstWordMatch[0].toLowerCase();
      openers.push({ word: opener, index: idx });
      if (opener === 'i') {
        iOpenerCount++;
      }
    }
  });

  // Flag if 3 or more sentences open with "I"
  if (iOpenerCount >= 3) {
    issues.push({
      id: 'rep_i_openers',
      category: 'repetition',
      severity: 'warning',
      observation: `${iOpenerCount} sentences in your draft begin with the pronoun "I".`,
      question: `Multiple sentences begin with "I". Can you invert one or two to open with the technical problem, project context, or outcome instead?`,
    });
  }

  // Consecutive same opener (e.g. 2 sentences in a row starting with the exact same transition)
  for (let i = 0; i < openers.length - 1; i++) {
    if (openers[i].word === openers[i + 1].word && openers[i].word !== 'i') {
      issues.push({
        id: `rep_consecutive_${i}`,
        category: 'repetition',
        severity: 'info',
        observation: `Consecutive sentences ${i + 1} and ${i + 2} both begin with "${openers[i].word}".`,
        question: `Can you vary the sentence opener or combine these ideas to create smoother rhythm?`,
      });
    }
  }

  // 2. Overuse of "I" in total word count
  const allWords = text.trim().split(/\s+/).filter(Boolean);
  const totalWords = allWords.length;
  if (totalWords > 40) {
    const singleICount = (text.match(/\bI\b/g) || []).length;
    const ratio = singleICount / totalWords;
    if (ratio > 0.06 && singleICount >= 5) {
      issues.push({
        id: 'rep_i_ratio',
        category: 'repetition',
        severity: 'warning',
        observation: `Draft contains "${singleICount}" occurrences of "I" (~${Math.round(ratio * 100)}% of all words).`,
        question: `How might you reframe some statements around the technical architecture, project data, or team outcomes rather than personal pronouns?`,
      });
    }
  }

  // 3. Repeated non-stop words
  const wordFreq: Record<string, number> = {};
  for (const rawWord of allWords) {
    const clean = rawWord.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (clean.length > 3 && !STOP_WORDS.has(clean)) {
      wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    }
  }

  const threshold = totalWords > 400 ? 7 : 5;
  for (const [word, count] of Object.entries(wordFreq)) {
    if (count >= threshold) {
      issues.push({
        id: `rep_word_${word}`,
        category: 'repetition',
        severity: 'info',
        quote: word,
        observation: `The word "${word}" appears ${count} times in your draft.`,
        question: `Could you check if repeating "${word}" (${count} times) is necessary, or could more specific technical terms be used?`,
      });
    }
  }

  return issues;
}

/**
 * Check structural elements (coursework, target institution, career trajectory).
 * ALWAYS reported as "Not detected, check whether you covered this" - NEVER as a verdict!
 */
export function checkStructureCoverage(
  text: string,
  targetUniversity?: string,
  targetProgram?: string
): { checklist: StructureCheckResult; issues: QualityIssue[] } {
  const issues: QualityIssue[] = [];
  const lower = text.toLowerCase();

  // 1. Target University
  let univDetected = false;
  if (targetUniversity && targetUniversity.trim().length > 2) {
    univDetected = lower.includes(targetUniversity.toLowerCase().trim());
  } else {
    // Generic check for institution citations
    univDetected = /\b(?:university|universit[a-z]+|tum|rwth|tcd|ucd|college|polytechnic|institute of technology)\b/i.test(text);
  }

  if (!univDetected) {
    issues.push({
      id: 'struct_univ',
      category: 'structure',
      severity: 'info',
      observation: 'Not detected: specific reference to the target university name.',
      question: 'Have you explicitly stated which university you are applying to and why their specific faculty or environment matches your goals?',
    });
  }

  // 2. Course / Module / Program
  let courseDetected =
    /\b(?:module|course|curriculum|syllabus|seminar|elective|specialization|laboratory course)\b/i.test(text) ||
    /\b[A-Z]{2,4}\s*[-_]?\s*\d{3,4}\b/.test(text);

  if (targetProgram && targetProgram.trim().length > 2) {
    if (lower.includes(targetProgram.toLowerCase().trim())) {
      courseDetected = true;
    }
  }

  if (!courseDetected) {
    issues.push({
      id: 'struct_course',
      category: 'structure',
      severity: 'info',
      observation: 'Not detected: specific course or module names from the curriculum handbook.',
      question: 'Have you cited at least two exact modules or seminar topics from the program handbook to prove syllabus research?',
    });
  }

  // 3. Career trajectory
  const careerDetected =
    /\b(?:career|goal|trajectory|aspire|industry|role|engineer|researcher|scientist|lead|architect|post-graduation|long-term)\b/i.test(text);

  if (!careerDetected) {
    issues.push({
      id: 'struct_career',
      category: 'structure',
      severity: 'info',
      observation: 'Not detected: clear post-graduation career milestone or trajectory statement.',
      question: 'Have you articulated what specific engineering or research role you aim to step into after graduating from this master’s program?',
    });
  }

  return {
    checklist: {
      targetUniversityDetected: univDetected,
      courseModulesDetected: courseDetected,
      careerTrajectoryDetected: careerDetected,
    },
    issues,
  };
}

/**
 * Main Deterministic Quality Analysis Entrypoint.
 * Evaluates the entire draft purely locally and produces metrics + question-based guidance.
 */
export function analyzeDraft(
  text: string,
  targetUniversity?: string,
  targetProgram?: string
): WritingAnalysisResult {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      wordCount: 0,
      charCount: 0,
      sentenceCount: 0,
      avgSentenceLength: 0,
      paragraphCount: 0,
      concreteAnchorsCount: 0,
      issues: [],
      structureChecklist: {
        targetUniversityDetected: false,
        courseModulesDetected: false,
        careerTrajectoryDetected: false,
      },
    };
  }

  const paragraphs = getParagraphs(trimmed);
  const sentences = getSentences(trimmed);
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = trimmed.length;

  const { count: concreteAnchorsCount } = countConcreteAnchors(trimmed);

  const issues: QualityIssue[] = [];

  // Paragraph-level specificity checks
  paragraphs.forEach((p, idx) => {
    const { count } = countConcreteAnchors(p);
    if (count === 0 && p.split(/\s+/).length >= 25) {
      issues.push({
        id: `spec_p_${idx}`,
        category: 'specificity',
        severity: 'flag',
        observation: `Paragraph ${idx + 1} has no concrete detail (numbers, named tools, courses, or labs).`,
        question: `Paragraph ${idx + 1} has no concrete detail. What exactly did you do, build, or learn here that can be supported with facts from your Evidence Bank?`,
      });
    }
  });

  // Vague claims
  const vagueIssues = detectVagueClaims(trimmed);
  issues.push(...vagueIssues);

  // Clichés
  const clicheIssues = detectCliches(trimmed);
  issues.push(...clicheIssues);

  // Readability
  const { issues: readabilityIssues, avgSentenceLength } = analyzeSentenceReadability(sentences);
  issues.push(...readabilityIssues);

  // Repetition
  const repetitionIssues = analyzeRepetition(trimmed, sentences);
  issues.push(...repetitionIssues);

  // Structure coverage
  const { checklist: structureChecklist, issues: structureIssues } = checkStructureCoverage(
    trimmed,
    targetUniversity,
    targetProgram
  );
  issues.push(...structureIssues);

  return {
    wordCount,
    charCount,
    sentenceCount: sentences.length,
    avgSentenceLength,
    paragraphCount: paragraphs.length,
    concreteAnchorsCount,
    issues,
    structureChecklist,
  };
}
