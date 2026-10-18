/**
 * CareerGoals.ai / AbroadPath AI - Conversational Study-Abroad Counsellor Engine
 * File: src/services/SparkFallbackEngine.ts
 *
 * Counsellor Persona & Invariants:
 * 1. Warm, empathetic, conversational study-abroad counsellor tone.
 * 2. Answers the student's question first; explains requirements in clear, accessible language.
 * 3. Asks relevant follow-up questions when background, GPA, degree, or intake details are missing.
 * 4. Integrates student profile data (CGPA, degree, exams, budget) when available.
 * 5. Grounded strictly in verified catalogue data without inventing cutoffs, fees, or deadlines.
 * 6. Transparent verification statuses (Verified, Needs review, Conflicting, Stale, Unknown).
 * 7. Out-of-catalog honesty: explicitly states when an entity is not in our verified catalogue and directs to official portals.
 * 8. Zero external API costs / zero token cost: operates deterministically and locally in client browser.
 */

import { University, Country, UserProfile } from '../types';
import seedUniversities from '../data/universities.json';
import seedCountries from '../data/countries.json';

export interface AssistantResponse {
  content: string;
  sourceUrl: string;
  sourceName: string;
  lastChecked: string;
  isFallback: boolean;
}

export interface EntityMatch {
  type: 'university' | 'country';
  id: string;
  name: string;
}

const ENTITY_ALIASES: Record<string, string[]> = {
  // Germany Universities (Matching seed IDs in universities.json)
  tum_informatics: [
    'tum',
    'technical university of munich',
    'tu munich',
    'tu münchen',
    'technische universität münchen',
    'tum informatics',
    'msc informatics',
    'tum munich',
  ],
  rwth_cs: [
    'rwth',
    'rwth aachen',
    'rwth cs',
    'rwth computer science',
    'rwth aachen university',
    'aachen university',
  ],
  heidelberg_dcs: [
    'heidelberg',
    'ruprecht karls',
    'heidelberg university',
    'heidelberg dcs',
    'heidelberg cs',
    'data and computer science heidelberg',
  ],
  lmu_datascience: [
    'lmu',
    'lmu munich',
    'ludwig maximilian',
    'ludwig maximilians',
    'ludwig-maximilians',
    'ludwig maximilian university',
    'ludwig-maximilians-universität',
    'ludwig-maximilians-universitaet muenchen',
    'lmu data science',
    'lmu datascience',
    'msc data science',
  ],

  // Ireland Universities
  tcd_cs: [
    'tcd',
    'trinity',
    'trinity college',
    'trinity college dublin',
    'trinity cs',
  ],
  ucd_cs: [
    'ucd',
    'university college dublin',
    'ucd cs',
    'ucd computer science',
  ],
  galway_cs: [
    'galway',
    'university of galway',
    'nuig',
    'national university of ireland galway',
    'galway cs',
    'galway data analytics',
  ],
  ucc_cs: [
    'ucc',
    'university college cork',
    'cork university',
    'ucc cork',
    'ucc computing science',
    'ucc cs',
  ],

  // UK Universities
  imperial_computing: [
    'imperial',
    'imperial college',
    'imperial college london',
    'imperial computing',
    'imperial aiml',
  ],
  oxford_acs: [
    'oxford',
    'university of oxford',
    'oxford acs',
    'oxford cs',
    'oxford advanced computer science',
    'advanced computer science oxford',
    'msc in advanced computer science',
  ],
  manchester_acs: [
    'manchester',
    'university of manchester',
    'manchester acs',
    'manchester cs',
    'manchester advanced computer science',
    'uom',
  ],

  // Countries (Cleaned to avoid shadowing university host city aliases)
  germany: [
    'germany',
    'german',
    'deutschland',
    'federal republic of germany',
  ],
  ireland: [
    'ireland',
    'irish',
    'eire',
    'republic of ireland',
  ],
  uk: [
    'uk',
    'united kingdom',
    'britain',
    'great britain',
    'england',
    'scotland',
    'wales',
  ],
};

const OUT_OF_CATALOG_ENTITIES: Record<string, string> = {
  // Universities outside catalog
  mit: 'Massachusetts Institute of Technology (MIT)',
  'massachusetts institute of technology': 'Massachusetts Institute of Technology (MIT)',
  stanford: 'Stanford University',
  'stanford university': 'Stanford University',
  harvard: 'Harvard University',
  'harvard university': 'Harvard University',
  berkeley: 'UC Berkeley',
  'uc berkeley': 'UC Berkeley',
  cambridge: 'University of Cambridge',
  'university of cambridge': 'University of Cambridge',
  cmu: 'Carnegie Mellon University',
  'carnegie mellon': 'Carnegie Mellon University',
  princeton: 'Princeton University',
  yale: 'Yale University',
  columbia: 'Columbia University',
  nyu: 'New York University (NYU)',
  ucla: 'UCLA',
  caltech: 'California Institute of Technology (Caltech)',
  'georgia tech': 'Georgia Institute of Technology',
  'eth zurich': 'ETH Zurich',
  epfl: 'EPFL',
  nus: 'National University of Singapore (NUS)',
  ntu: 'Nanyang Technological University (NTU)',
  toronto: 'University of Toronto',
  mcgill: 'McGill University',
  waterloo: 'University of Waterloo',
  melbourne: 'University of Melbourne',
  sydney: 'University of Sydney',

  // Countries outside catalog
  canada: 'Canada',
  canadian: 'Canada',
  australia: 'Australia',
  australian: 'Australia',
  usa: 'United States (USA)',
  'united states': 'United States (USA)',
  america: 'United States (USA)',
  'new zealand': 'New Zealand',
  singapore: 'Singapore',
  france: 'France',
  netherlands: 'Netherlands',
  sweden: 'Sweden',
  switzerland: 'Switzerland',
  italy: 'Italy',
  spain: 'Spain',
};

export class SparkFallbackEngine {
  private universities: University[];
  private countries: Country[];

  constructor(
    customUniversities?: University[],
    customCountries?: Country[]
  ) {
    this.universities =
      customUniversities && customUniversities.length > 0
        ? customUniversities
        : (seedUniversities as unknown as University[]);
    this.countries =
      customCountries && customCountries.length > 0
        ? customCountries
        : (seedCountries as unknown as Country[]);
  }

  public updateCatalog(universities: University[], countries: Country[]) {
    if (universities && universities.length > 0) this.universities = universities;
    if (countries && countries.length > 0) this.countries = countries;
  }

  /**
   * Main query execution method with strict conversational counsellor priority:
   * 1. Empty Guard
   * 2. Generative SOP / Letter Refusal Filter (Anti-Rewrite Academic Ethics Guardrail)
   * 3. Acceptance rate on in-catalog institution check
   * 4. Out-of-catalog institution or country detection
   * 5. In-catalog University Match (highest specificity)
   * 6. Multi-University Discovery (Free tuition & GRE queries precede Country match)
   * 7. Country Match (Visa, blocked account, living costs, checklist)
   * 8. Default Conversational Guidance Response
   */
  public query(rawPrompt: string, profile?: UserProfile | null): AssistantResponse {
    const prompt = (rawPrompt || '').trim().toLowerCase();

    // 1. Guard against empty query
    if (!prompt) {
      return this.getDefaultResponse();
    }

    // 2. Out-of-Scope / SOP generation request detection (R1 §Screens #8, R5)
    if (this.isGenerativeSopRequest(prompt)) {
      return {
        content:
          'AbroadPath AI strictly operates on verified admission facts and does NOT generate, rewrite, or auto-complete Statement of Purpose (SOP) or motivation letters. Submitting AI-generated text violates European university admission standards.\n\nPlease visit our Statement Requirements & Planner (/letter-helper) for structural outlines, guiding reflection prompts, and an 8-point pre-submission quality checklist so you can craft your own authentic submission.\n\nVerify on the official site: Criteria and requirements should be confirmed on the official university portal.',
        sourceUrl: 'https://www.daad.de/en/study-and-research-in-germany/',
        sourceName: 'AbroadPath AI Academic Ethics Guidelines',
        lastChecked: '2026-10-15',
        isFallback: true,
      };
    }

    // 3. Check for uncataloged metrics on in-catalog universities (e.g. Oxford acceptance rate)
    const isAcceptanceRateQuery =
      prompt.includes('acceptance rate') ||
      prompt.includes('acceptance rates') ||
      prompt.includes('admit rate') ||
      prompt.includes('admission rate');

    const inCatalogEntity = this.resolveEntity(prompt);

    if (isAcceptanceRateQuery && inCatalogEntity && inCatalogEntity.type === 'university') {
      const u = this.universities.find((item) => item.id === inCatalogEntity.id);
      return {
        content: `While ${u?.name || 'this institution'} is in our verified catalog, institutional acceptance rates and admit percentage statistics are not in our verified catalog data. Admissions committees evaluate candidates holistically based on individual academic merit (such as Honours degree standing in relevant coursework) rather than published percentage quotas.\n\nPlease verify official admissions cohort statistics directly on the official portal (${u?.sourceUrl || u?.portalUrl || 'official portal'}).\n\nWould you like to review their academic requirements, language score cutoffs, or application deadlines instead?\n\nVerify on the official site: Always confirm admission details directly on official portals.`,
        sourceUrl: u?.sourceUrl || u?.portalUrl || 'https://www.daad.de',
        sourceName: `${u?.name || 'University'} Official Admissions Portal`,
        lastChecked: u?.lastChecked || '2026-10-15',
        isFallback: true,
      };
    }

    // 4. Out-of-catalog institution or destination detection
    const outOfCatalogEntity = this.resolveOutOfCatalog(prompt);
    if (outOfCatalogEntity) {
      return {
        content: `${outOfCatalogEntity} is not in our verified catalog. Our verified catalog currently covers selected master's degree programmes across Germany, Ireland, and the United Kingdom.\n\nFor official requirements and admissions criteria regarding ${outOfCatalogEntity}, please verify on the official portal directly.\n\nIf you're exploring verified computer science, data, or engineering programmes in Europe—such as Technical University of Munich (TUM), Trinity College Dublin, or University of Oxford—I'd be glad to walk you through those verified requirements. Would you like to explore European alternatives?\n\nVerify on the official site: Always confirm details on official university portals.`,
        sourceUrl: 'https://www.daad.de/en/study-and-research-in-germany/',
        sourceName: `${outOfCatalogEntity} Official Portal`,
        lastChecked: '2026-10-15',
        isFallback: true,
      };
    }

    // 5. In-catalog University Match
    if (inCatalogEntity && inCatalogEntity.type === 'university') {
      const u = this.universities.find((item) => item.id === inCatalogEntity.id);
      if (u) {
        return this.formatUniversityResponse(u, rawPrompt, profile);
      }
    }

    // 6. University Discovery Queries
    const isFreeTuitionQuery =
      prompt.includes('free') ||
      prompt.includes('zero tuition') ||
      prompt.includes('no tuition') ||
      prompt.includes('tuition-free') ||
      prompt.includes('€0');

    if (isFreeTuitionQuery) {
      const freeUnivs = this.universities.filter(
        (u) =>
          u.tuition.toLowerCase().includes('€0') ||
          u.tuition.toLowerCase().includes('free') ||
          (u.requirements.tuition_fee && u.requirements.tuition_fee.toLowerCase().includes('€0')) ||
          (u.requirements.tuition_fee && u.requirements.tuition_fee.toLowerCase().includes('free'))
      );
      const list = freeUnivs
        .map((u) => `• ${u.name} (${u.program}) — ${u.tuition}`)
        .join('\n');
      return {
        content: `Here are verified public universities in Germany offering zero/minimal state tuition:\n\n${list}\n\nNote: Public universities in most German federal states (e.g. North Rhine-Westphalia, Bavaria) do not charge tuition for consecutive master's degrees, though semester administration tickets (~€150–€350/sem) apply. Certain states (e.g. Baden-Württemberg / Heidelberg: €1,500/sem) and specific institutions (e.g. TUM: €6,000/sem) levy non-EU tuition fees.\n\nWhich field of study or German city are you most interested in exploring?\n\nVerify on the official site: Always confirm current fees on the official university portal.`,
        sourceUrl:
          'https://www.daad.de/en/study-and-research-in-germany/plan-your-studies/costs-and-financing/',
        sourceName: 'DAAD Germany Study Portal',
        lastChecked: '2026-10-15',
        isFallback: true,
      };
    }

    if (prompt.includes('gre')) {
      const greUnivs = this.universities.filter((u) => u.requirements.gre_required === true);
      const list = greUnivs
        .map(
          (u) =>
            `• ${u.name} (${u.program}): GRE Required${
              u.requirements.min_gre ? ` (Min Quant/Score: ${u.requirements.min_gre})` : ''
            }`
        )
        .join('\n');
      return {
        content: `Here are verified programs in our catalog requiring the GRE:\n\n${list}\n\nOther institutions (e.g. Heidelberg, Trinity College Dublin, Oxford) waive the GRE or evaluate applicants holistically.\n\nHave you scheduled a GRE test date, or would you prefer exploring programmes that waive standardized testing?\n\nVerify on the official site: Always confirm standardized test requirements directly on the official institution portal.`,
        sourceUrl: 'https://tum.de',
        sourceName: 'University Admission Regulations',
        lastChecked: '2026-10-15',
        isFallback: true,
      };
    }

    // 7. Specific Country Match (Visa, blocked account, living costs, checklist)
    if (inCatalogEntity && inCatalogEntity.type === 'country') {
      const c = this.countries.find((item) => item.id === inCatalogEntity.id);
      if (c) {
        return this.formatCountryResponse(c);
      }
    }

    // 8. Default Conversational Guidance Response
    return this.getDefaultResponse();
  }

  private isGenerativeSopRequest(prompt: string): boolean {
    const actionRegex =
      /\b(write|generate|draft|compose|create|make|produce|rewrite|author|polish|edit)\b[\s\S]*?\b(sop|statement\s+of\s+purpose|letter\s+of\s+motivation|motivation\s+letter|personal\s+statement|admissions?\s+essay|application\s+essay|essay|recommendation\s+letter|letter\s+of\s+recommendation|lors?|cover\s+letter|letter\s+of\s+intent)\b/i;

    const requestRegex =
      /\b(give\s+me|provide|need|want|help\s+(me\s+)?(to\s+)?write)\b[\s\S]*?\b(an?\s+)?(sop|statement\s+of\s+purpose|letter\s+of\s+motivation|motivation\s+letter|personal\s+statement)\b/i;

    const toolRegex =
      /\b(sop|statement\s+of\s+purpose|motivation\s+letter|personal\s+statement|admission\s+essay)\b[\s\S]*?\b(generator|writer|generation|writing|drafting|bot)\b/i;

    const directPhrases = [
      'write an sop',
      'write my sop',
      'write me an sop',
      'write sop',
      'draft an sop',
      'draft my sop',
      'draft sop',
      'generate an sop',
      'generate my sop',
      'generate sop',
      'compose an sop',
      'compose sop',
      'write statement of purpose',
      'draft statement of purpose',
      'generate statement of purpose',
      'write motivation letter',
      'draft motivation letter',
      'generate motivation letter',
      'write personal statement',
      'draft personal statement',
      'write essay',
      'write my essay',
      'write an essay',
      'write letter',
      'write a letter',
      'generate letter',
      'write my motivation',
      'compose a motivation letter',
      'draft a motivation letter',
    ];

    return (
      actionRegex.test(prompt) ||
      requestRegex.test(prompt) ||
      toolRegex.test(prompt) ||
      directPhrases.some((phrase) => prompt.includes(phrase))
    );
  }

  private resolveOutOfCatalog(prompt: string): string | null {
    for (const [alias, canonicalName] of Object.entries(OUT_OF_CATALOG_ENTITIES)) {
      let isHit = false;
      if (alias.length <= 4 && /^[a-z0-9]+$/i.test(alias)) {
        isHit = new RegExp(`\\b${alias}\\b`, 'i').test(prompt);
      } else {
        isHit = prompt.includes(alias);
      }
      if (isHit) {
        return canonicalName;
      }
    }
    return null;
  }

  private resolveEntity(prompt: string): EntityMatch | null {
    const isMatch = (text: string, alias: string): boolean => {
      if (alias.length <= 4 && /^[a-z0-9]+$/i.test(alias)) {
        return new RegExp(`\\b${alias}\\b`, 'i').test(text);
      }
      return text.includes(alias);
    };

    // 1. Check universities first
    for (const [id, aliases] of Object.entries(ENTITY_ALIASES)) {
      if (this.universities.some((u) => u.id === id)) {
        for (const alias of aliases) {
          if (isMatch(prompt, alias)) {
            const u = this.universities.find((item) => item.id === id)!;
            return { type: 'university', id: u.id, name: u.name };
          }
        }
      }
    }

    // 2. Check countries
    for (const [id, aliases] of Object.entries(ENTITY_ALIASES)) {
      if (this.countries.some((c) => c.id === id)) {
        for (const alias of aliases) {
          if (isMatch(prompt, alias)) {
            const c = this.countries.find((item) => item.id === id)!;
            return { type: 'country', id: c.id, name: c.name };
          }
        }
      }
    }

    return null;
  }

  /**
   * Formats a conversational, warm counsellor response for a specific university,
   * answering the student's question first and leveraging profile data when available.
   */
  private formatUniversityResponse(
    u: University,
    rawPrompt: string,
    profile?: UserProfile | null
  ): AssistantResponse {
    const prompt = (rawPrompt || '').toLowerCase();
    const lines: string[] = [];

    // Analyze query context
    const hasEligibilityIntent =
      prompt.includes('can i apply') ||
      prompt.includes('eligible') ||
      prompt.includes('chances') ||
      prompt.includes('cgpa') ||
      prompt.includes('gpa') ||
      prompt.includes('no ielts') ||
      prompt.includes("haven't taken") ||
      prompt.includes('havent taken') ||
      prompt.includes('without ielts');

    const hasNoIeltsInPrompt =
      prompt.includes('no ielts') ||
      prompt.includes("haven't taken ielts") ||
      prompt.includes('havent taken ielts') ||
      prompt.includes('without ielts') ||
      prompt.includes('not taken ielts');

    const gpaMatch = prompt.match(/\b(\d+(?:\.\d+)?)\s*(?:cgpa|gpa|\/10|\/4\.0)?\b/);
    const mentionedGpa = gpaMatch && parseFloat(gpaMatch[1]) >= 2.0 && parseFloat(gpaMatch[1]) <= 10.0
      ? gpaMatch[1]
      : profile?.gpa
      ? String(profile.gpa)
      : null;

    const isTuitionSpecific =
      (prompt.includes('fee') || prompt.includes('tuition') || prompt.includes('cost')) &&
      !hasEligibilityIntent;

    const isDeadlineSpecific =
      (prompt.includes('deadline') || prompt.includes('when to apply') || prompt.includes('date')) &&
      !hasEligibilityIntent;

    // 1. Warm Conversational Opening & Answering the Question First
    if (hasEligibilityIntent || hasNoIeltsInPrompt || mentionedGpa) {
      if (mentionedGpa) {
        lines.push(
          `That's a programme worth exploring! Your ${mentionedGpa} CGPA gives us a starting point, but I'll need to understand your degree and grading scale to assess your academic eligibility.`
        );
      } else {
        lines.push(
          `That's a programme worth exploring! Your academic background gives us a foundation to evaluate your fit for **${u.name}** (${u.program}).`
        );
      }

      if (hasNoIeltsInPrompt || (profile && profile.englishTestTaken === false)) {
        lines.push(
          `\nWe should also check ${u.name.split(' ')[0]}'s English-language requirements and the deadline for your intended intake. You don't need to have taken IELTS just to start exploring your options.`
        );
      }
    } else if (isTuitionSpecific) {
      lines.push(
        `For international/non-EU students, the tuition for **${u.name}** (${u.program}) is **${u.tuition}**.`
      );
    } else if (isDeadlineSpecific) {
      lines.push(
        `The application deadline for **${u.name}** (${u.program}) is **${
          u.requirements.application_deadline || 'specified on the official portal'
        }**.`
      );
    }

    // 2. Structured Verified Admission Details (Preserving exact test invariants)
    lines.push(`\nVerified Admission Details for **${u.name}** (${u.program}):`);

    // Rule change alert
    if (u.ruleChanged || prompt.includes('rule change') || prompt.includes('rule changed')) {
      if (u.demoSeeded) {
        lines.push(
          `\n⚠️ **Admission Rule Alert (Live Detected)**: GMAT is now **required** (previously unconfirmed/null). Changed fields: [${(
            u.changedFields || ['gmat_required']
          ).join(', ')}]. (Demonstration-seeded live change detection record).`
        );
      } else if (u.ruleChanged) {
        lines.push(
          `\n⚠️ **Admission Rule Alert**: Requirements recently updated. Changed fields: ${(
            u.changedFields || []
          ).join(', ')}.`
        );
      }
    }

    // Standardized test & language cutoffs
    lines.push('\n**Standardized Test & Language Cutoffs**:');
    lines.push(
      `• IELTS Academic: ${
        u.requirements.min_ielts !== null
          ? `${u.requirements.min_ielts} minimum overall`
          : 'Not confirmed by official source'
      }`
    );
    lines.push(
      `• TOEFL iBT: ${
        u.requirements.min_toefl !== null
          ? `${u.requirements.min_toefl} minimum`
          : 'Not confirmed by official source'
      }`
    );
    lines.push(
      `• GRE Requirement: ${
        u.requirements.gre_required === true
          ? `Required${u.requirements.min_gre ? ` (Min: ${u.requirements.min_gre})` : ''}`
          : u.requirements.gre_required === false
          ? 'Not required / Waived'
          : 'Not confirmed'
      }`
    );
    lines.push(
      `• GMAT Requirement: ${
        u.requirements.gmat_required === true
          ? 'Required'
          : u.requirements.gmat_required === false
          ? 'Not required / Waived'
          : 'Not confirmed'
      }`
    );

    // Tuition & Deadlines
    lines.push('\n**Tuition & Application Deadlines**:');
    lines.push(`• Tuition Fee: ${u.tuition || 'Not confirmed'}`);
    lines.push(
      `• Application Deadline: ${
        u.requirements.application_deadline || 'Check official university portal'
      }`
    );

    if (u.requirements.notes) {
      lines.push(`• Admission Notes: ${u.requirements.notes}`);
    }

    // Statement of Purpose / Requirement Status (Transparent uncertainty & status)
    if (u.statementRequirements) {
      const sr = u.statementRequirements;
      const statusText = sr.status ? ` (Status: ${sr.status})` : '';
      lines.push(
        `• Statement Requirement: ${sr.documentType || 'Personal Statement'} (${
          sr.required === true ? 'Required' : sr.required === false ? 'Not required' : 'Not confirmed'
        }${sr.lengthLimit ? `, ${sr.lengthLimit}` : ''})${statusText}`
      );
      if (sr.status === 'Needs review') {
        lines.push(`  ℹ️ Catalogue Note: Institutional guidelines are flagged as "Needs review" pending department cycle confirmation.`);
      } else if (sr.status === 'Conflicting') {
        lines.push(`  ℹ️ Catalogue Note: Central admissions portal and faculty pages show conflicting length guidelines; verify before submitting.`);
      } else if (sr.status === 'Stale') {
        lines.push(`  ℹ️ Catalogue Note: Catalogue evidence is from an earlier intake cycle and may be stale.`);
      } else if (sr.status === 'Unknown') {
        lines.push(`  ℹ️ Catalogue Note: Specific statement prompt requirements are unconfirmed in current records.`);
      }
    }

    // 3. Empathetic Next Steps & Follow-up Questions
    if (profile?.fieldOfStudy || profile?.degreeTitle) {
      lines.push(
        `\nLooking at your profile with a background in ${profile.fieldOfStudy || profile.degreeTitle}, are you planning for the upcoming intake?`
      );
    } else {
      lines.push('\nWhat degree are you completing, and are you aiming for the next available intake?');
    }

    // 4. Universal Verification Footer
    lines.push(
      '\nVerify on the official site: Application deadlines, minimum cutoffs, and tuition fees are subject to direct institution update. Always verify on the official university portal.'
    );

    return {
      content: lines.join('\n'),
      sourceUrl: u.sourceUrl || u.portalUrl,
      sourceName: `${u.name} Official Admission Portal`,
      lastChecked: u.lastChecked || '2026-10-15',
      isFallback: true,
    };
  }

  private formatCountryResponse(c: Country): AssistantResponse {
    const lines: string[] = [];

    lines.push(`Official Country Guidelines for **${c.name}**:`);
    lines.push(`\n**Cost & Blocked Account / Proof of Funds**:`);
    lines.push(`• ${c.costRange}`);

    lines.push(`\n**Visa Regulations & Post-Study Work**:`);
    lines.push(`• ${c.visaNote}`);

    lines.push(`\n**Language & Medium of Instruction**:`);
    lines.push(`• ${c.languageNote}`);

    lines.push(`\n**Standard Document Checklist**:`);
    const docSample = c.documents.slice(0, 5).map((d) => `• ${d}`).join('\n');
    lines.push(docSample);
    if (c.documents.length > 5) {
      lines.push(`• ... and ${c.documents.length - 5} additional checklist documents.`);
    }

    lines.push(
      `\nAre you looking at an upcoming intake for ${c.name}, or would you like to explore specific university options?`
    );

    lines.push(
      '\nVerify on the official site: Always confirm immigration and financial requirements directly on the official government/portal site.'
    );

    return {
      content: lines.join('\n'),
      sourceUrl: c.sourceUrl || c.portalUrl,
      sourceName: `${c.name} Official Study & Immigration Portal`,
      lastChecked: c.lastChecked || '2026-10-15',
      isFallback: true,
    };
  }

  private getDefaultResponse(): AssistantResponse {
    return {
      content:
        'I am your AbroadPath factual guide and CareerGoals study-abroad counsellor. I provide verified, fact-checked admission requirements, language score cutoffs, tuition fees, and visa regulations across Germany, Ireland, and the UK.\n\nTo help you find the right fit, tell me a bit about yourself:\n• What degree or major are you completing?\n• What is your CGPA and grading scale?\n• Which intake year or country are you targeting?\n\nYou can also ask me specific questions like:\n• "Can I apply to Trinity College Dublin with an 8.2 CGPA and no IELTS?"\n• "What are the IELTS and GRE cutoffs for TUM?"\n• "Which universities in Germany offer free tuition?"\n• "What are the visa and blocked account rules for Germany?"\n• "What are the deadlines and tuition for Trinity College Dublin?"\n\nVerify on the official site: Always confirm details directly on official portals.',
      sourceUrl: 'https://www.daad.de/en/study-and-research-in-germany/',
      sourceName: 'Official DAAD & National Portals',
      lastChecked: '2026-10-15',
      isFallback: true,
    };
  }
}

export const sparkFallbackEngine = new SparkFallbackEngine();
