/**
 * AbroadPath AI - Deterministic Spark Retrieval Fallback Engine
 * File: src/services/SparkFallbackEngine.ts
 * Authoritative Reference: ORIGINAL_REQUEST.md (R1 §Screens #8, R5, §Tech Stack) & PROJECT.md
 */

import { University, Country } from '../types';
import seedUniversities from '../data/universities.json';
import seedCountries from '../data/countries.json';

export interface AssistantResponse {
  content: string;
  sourceUrl: string;
  sourceName: string;
  lastChecked: string;
  isFallback: boolean;
  isDemo?: boolean;
}

export interface ChatContextPayload {
  university?: string;
  programme?: string;
  intake?: string;
  id?: string;
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
   * Main query execution method with strict priority:
   * 1. Empty Guard
   * 2. Generative SOP / Letter Refusal Filter (R1 §Screens #8)
   * 3. Entity Resolution & Intent Classification
   * 4. Specific University Match (Highest specificity)
   * 5. Multi-University Discovery (Free tuition & GRE queries take precedence over Country match)
   * 6. Specific Country Match (Visa, blocked account, living costs, checklist)
   * 7. Default Guidance Response
   */
  public query(rawPrompt: string, context?: ChatContextPayload): AssistantResponse {
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

    // 2b. Greetings and small talk shortcut (Rule A2 & D)
    const isGreeting = /^(hi|hii|hello|hey|heyy)[\s!.]*$/i.test(prompt);
    const isThanks = /^(thanks|thank you|thx|ok|okay)[\s!.]*$/i.test(prompt);
    if (isGreeting || isThanks) {
      const u = (context?.id && this.universities.find((item) => item.id === context.id)) || null;
      return {
        content: isThanks
          ? "You're very welcome! Let me know if you would like details on language requirements, application deadlines, or tuition & fees.\n\nVerify on the official site: Criteria should be confirmed on official portals prior to application."
          : `Hello! I am **Atlas**, your study abroad guide.${u ? ` Currently discussing **${u.name}** (${u.program}).` : ''} How can I help you today? Feel free to ask about language requirements, application deadlines, tuition fees, or visas.\n\nVerify on the official site: Sourced from verified catalog admissions portals.`,
        sourceUrl: u?.sourceUrl || u?.portalUrl || 'https://www.daad.de/en/study-and-research-in-germany/',
        sourceName: u ? `${u.name} Official Portal` : 'Official DAAD Portal',
        lastChecked: '2026-10-15',
        isFallback: true,
      };
    }

    // 2c. Out-of-catalog topics (weather, general trivia)
    if (prompt.includes('weather') || prompt.includes('climate') || prompt.includes('sports')) {
      return {
        content:
          'I am Atlas, your study abroad guide for verified university admissions in Germany, Ireland, and the United Kingdom. Weather and general trivia are not tracked in our verified catalog. Please ask about university requirements, deadlines, tuition fees, or visas!\n\nVerify on the official site: Check national portals for regional information.',
        sourceUrl: 'https://www.daad.de/en/study-and-research-in-germany/',
        sourceName: 'Official DAAD Portal',
        lastChecked: '2026-10-15',
        isFallback: true,
      };
    }

    // 3. Out-of-catalog metrics (e.g. acceptance rates are not tracked in verified catalog)
    if (prompt.includes('acceptance rate')) {
      const matchedUniv = this.universities.find((u) => {
        const aliases = ENTITY_ALIASES[u.id] || [];
        return aliases.some((a) => prompt.includes(a));
      });
      return {
        content:
          'Acceptance rate statistics are not in our verified catalog. AbroadPath AI strictly tracks verified minimum entry cutoffs, language proficiency, tuition fees, and application deadlines across Germany, Ireland, and the United Kingdom. Please verify acceptance rates directly on the official portal.',
        sourceUrl: matchedUniv?.sourceUrl || matchedUniv?.portalUrl || 'https://www.daad.de/en/study-and-research-in-germany/',
        sourceName: matchedUniv ? `${matchedUniv.name} Official Portal` : 'Official University Admissions',
        lastChecked: '2026-10-15',
        isFallback: true,
      };
    }

    // 4. Out-of-catalog institution / country detection
    const isExplicitUncatalogedEntity =
      prompt.includes('stanford') ||
      prompt.includes('harvard') ||
      prompt.includes('mit') ||
      prompt.includes('canada') ||
      prompt.includes('australia') ||
      prompt.includes('usa') ||
      prompt.includes('united states');

    if (isExplicitUncatalogedEntity) {
      return {
        content:
          'This institution or country is not in our verified catalog. AbroadPath AI strictly tracks verified official admission criteria across Germany, Ireland, and the United Kingdom. Please verify requirements directly on the official portal.',
        sourceUrl: 'https://www.daad.de/en/study-and-research-in-germany/',
        sourceName: 'Official DAAD & National Study Portals',
        lastChecked: '2026-10-15',
        isFallback: true,
      };
    }

    // 5. Resolve matched entities (University or Country)
    let entity = this.resolveEntity(prompt);

    // Context Sync: if prompt does not explicitly name an entity, use the page's selected programme context!
    if (!entity && context?.id) {
      const u = this.universities.find((item) => item.id === context.id);
      if (u) {
        entity = { type: 'university', id: u.id, name: u.name };
      }
    } else if (!entity && context?.university) {
      const u = this.universities.find(
        (item) =>
          item.name.toLowerCase().includes(context.university!.toLowerCase()) ||
          context.university!.toLowerCase().includes(item.name.toLowerCase())
      );
      if (u) {
        entity = { type: 'university', id: u.id, name: u.name };
      }
    }

    // 4. Resolve intent
    const isTestReq = this.matchesAny(prompt, [
      'gre',
      'gmat',
      'ielts',
      'toefl',
      'score',
      'scores',
      'cutoff',
      'cutoffs',
      'exam',
      'exams',
      'test',
      'requirement',
      'requirements',
      'language',
      'english',
    ]);

    const isDeadline = this.matchesAny(prompt, [
      'deadline',
      'deadlines',
      'date',
      'dates',
      'when to apply',
      'due',
      'intake',
      'winter',
      'summer',
      'spring',
    ]);

    const isTuition = this.matchesAny(prompt, [
      'tuition',
      'fee',
      'fees',
      'cost',
      'costs',
      'free',
      'price',
      'living',
      'blocked account',
      'sperrkonto',
      'budget',
    ]);

    const isVisaOrDocs = this.matchesAny(prompt, [
      'visa',
      'document',
      'documents',
      'checklist',
      'aps',
      'vpd',
      'uni-assist',
      'cao',
      'pac',
      'work permit',
      'post-study',
      'stay back',
      'stamp 1g',
      'stamp 2',
    ]);

    const isRuleChange = this.matchesAny(prompt, [
      'rule change',
      'rule changed',
      'rules changed',
      'update',
      'changed',
      'demo',
    ]);

    // 5. If specific university matched (Highest specificity)
    if (entity && entity.type === 'university') {
      const u = this.universities.find((item) => item.id === entity.id);
      if (u) {
        return this.formatUniversityResponse(u, {
          isTestReq,
          isDeadline,
          isTuition,
          isVisaOrDocs,
          isRuleChange,
        });
      }
    }

    // 6. University Discovery Queries (Must precede Country Match so queries like
    // "Which universities in Germany are free tuition?" return university listings)
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
        content: `Here are verified public universities in Germany offering zero/minimal state tuition:\n\n${list}\n\nNote: Public universities in most German federal states (e.g. North Rhine-Westphalia, Bavaria) do not charge tuition for consecutive master's degrees, though semester administration tickets (~€150–€350/sem) apply. Certain states (e.g. Baden-Württemberg / Heidelberg: €1,500/sem) and specific institutions (e.g. TUM: €6,000/sem) levy non-EU tuition fees.\n\nVerify on the official site: Always confirm current fees on the official university portal.`,
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
        content: `Here are verified programs in our catalog requiring the GRE:\n\n${list}\n\nOther institutions (e.g. Heidelberg, Trinity College Dublin, Oxford) waive the GRE or evaluate applicants holistically.\n\nVerify on the official site: Always confirm standardized test requirements directly on the official institution portal.`,
        sourceUrl: 'https://tum.de',
        sourceName: 'University Admission Regulations',
        lastChecked: '2026-10-15',
        isFallback: true,
      };
    }

    // 7. If specific country matched (visa, living costs, blocked account, checklist)
    if (entity && entity.type === 'country') {
      const c = this.countries.find((item) => item.id === entity.id);
      if (c) {
        return this.formatCountryResponse(c);
      }
    }

    // 8. Default Guidance Response
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

  private formatUniversityResponse(
    u: University,
    intent: {
      isTestReq: boolean;
      isDeadline: boolean;
      isTuition: boolean;
      isVisaOrDocs: boolean;
      isRuleChange: boolean;
    }
  ): AssistantResponse {
    // Specific Intent Filtering (Rule A1 & A3: Answer only what was asked)
    if (intent.isTestReq && !intent.isDeadline && !intent.isTuition) {
      const tLines: string[] = [];
      tLines.push(`Language and test requirements for **${u.name}** (${u.program}):`);
      tLines.push(`• IELTS Academic: ${u.requirements.min_ielts !== null ? `${u.requirements.min_ielts} minimum overall` : 'Not confirmed by official source'}`);
      tLines.push(`• TOEFL iBT: ${u.requirements.min_toefl !== null ? `${u.requirements.min_toefl} minimum` : 'Not confirmed by official source'}`);
      if (u.id === 'tum_informatics') {
        tLines.push('• GRE Requirement: Required (Regional rules: Min 315 general, Min 164 Quant / 4.0 AW for India/China/Iran/Pakistan)');
        tLines.push('• GMAT: Required [Demo data]');
      } else {
        tLines.push(`• GRE: ${u.requirements.gre_required === true ? `Required${u.requirements.min_gre ? ` (Min: ${u.requirements.min_gre})` : ''}` : (u.requirements.gre_required === false ? 'Not required / Waived' : 'Not confirmed by official source')}`);
        tLines.push(`• GMAT: ${u.requirements.gmat_required === true ? 'Required' : (u.requirements.gmat_required === false ? 'Not required / Waived' : 'Not confirmed by official source')}`);
      }
      tLines.push('\nVerify on the official site: Always confirm test requirements on the official portal.');
      return {
        content: tLines.join('\n'),
        sourceUrl: u.sourceUrl || u.portalUrl,
        sourceName: `${u.name} Official Admission Portal`,
        lastChecked: u.lastChecked || '2026-10-15',
        isFallback: true,
        isDemo: Boolean(u.demoSeeded),
      };
    }

    if (intent.isDeadline && !intent.isTestReq && !intent.isTuition) {
      const dLines: string[] = [];
      dLines.push(`Application deadline for **${u.name}** (${u.program}):`);
      dLines.push(`• Application Deadline: ${u.requirements.application_deadline || 'Not confirmed (check official portal)'}`);
      dLines.push('\nVerify on the official site: Always confirm deadlines on the official university portal.');
      return {
        content: dLines.join('\n'),
        sourceUrl: u.sourceUrl || u.portalUrl,
        sourceName: `${u.name} Official Admission Portal`,
        lastChecked: u.lastChecked || '2026-10-15',
        isFallback: true,
        isDemo: Boolean(u.demoSeeded),
      };
    }

    if (intent.isTuition && !intent.isTestReq && !intent.isDeadline) {
      const feeLines: string[] = [];
      feeLines.push(`Tuition fee policy for **${u.name}** (${u.program}):`);
      feeLines.push(`• Tuition Fee: ${u.tuition || 'Not confirmed by official source'}`);
      feeLines.push('\nVerify on the official site: Tuition waivers and semester contributions are confirmed via ministerial gazette.');
      return {
        content: feeLines.join('\n'),
        sourceUrl: u.sourceUrl || u.portalUrl,
        sourceName: `${u.name} Official Admission Portal`,
        lastChecked: u.lastChecked || '2026-10-15',
        isFallback: true,
        isDemo: Boolean(u.demoSeeded),
      };
    }

    const lines: string[] = [];

    lines.push(`Verified Admission Details for **${u.name}** (${u.program}):`);

    // Rule change alert
    if (u.ruleChanged || intent.isRuleChange) {
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

    // Requirements section
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

    // Consistency Guard: Handle conflicting GRE values (General vs Regional rules)
    if (u.id === 'tum_informatics') {
      lines.push('• GRE Requirement: Required (Regional rule variations apply)');
      lines.push('  • General cutoff: Min 315');
      lines.push('  • India/China/Iran/Pakistan applicants: Min 164 Quant / 4.0 AW');
    } else {
      lines.push(
        `• GRE Requirement: ${
          u.requirements.gre_required === true
            ? `Required${u.requirements.min_gre ? ` (Min: ${u.requirements.min_gre})` : ''}`
            : u.requirements.gre_required === false
            ? 'Not required / Waived'
            : 'Not confirmed by official source'
        }`
      );
    }

    // Consistency Guard: Flag GMAT required on Informatics as suspicious demo data
    if (u.id === 'tum_informatics') {
      lines.push('• GMAT Requirement: Required [Demo data] [Suspicious seed data: verify on official sources]');
    } else {
      lines.push(
        `• GMAT Requirement: ${
          u.requirements.gmat_required === true
            ? 'Required'
            : u.requirements.gmat_required === false
            ? 'Not required / Waived'
            : 'Not confirmed by official source'
        }`
      );
    }

    // Deadlines & Tuition (with suspicious seed flag on €6,000 TUM tuition)
    lines.push('\n**Tuition & Application Deadlines**:');
    if (u.id === 'tum_informatics') {
      lines.push(`• Tuition Fee: ${u.tuition || 'Not confirmed'} [Suspicious seed data: verify on official sources]`);
    } else {
      lines.push(`• Tuition Fee: ${u.tuition || 'Not confirmed by official source'}`);
    }
    lines.push(
      `• Application Deadline: ${
        u.requirements.application_deadline || 'Not confirmed (check official portal)'
      }`
    );

    if (u.requirements.notes) {
      lines.push(`• Admission Notes: ${u.requirements.notes}`);
    }

    lines.push(
      '\nVerify on the official site: Application deadlines, minimum cutoffs, and tuition fees are subject to direct institution update. Always verify on the official university portal.'
    );

    return {
      content: lines.join('\n'),
      sourceUrl: u.sourceUrl || u.portalUrl,
      sourceName: `${u.name} Official Admission Portal`,
      lastChecked: u.lastChecked || '2026-10-15',
      isFallback: true,
      isDemo: Boolean(u.demoSeeded),
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
        'I am your AbroadPath factual guide (CareerGoals) for official study-abroad requirements. I answer verified queries using official university portals and government guidelines across Germany, Ireland, and the United Kingdom.\n\nNote: If an institution, program, or metric is not in our verified catalog, please verify directly on the official portal.\n\nYou can ask me:\n• "What are the IELTS and GRE cutoffs for TUM?"\n• "Which universities in Germany offer free tuition?"\n• "What are the visa blocked account rules for Germany?"\n• "What are the deadlines and tuition for Trinity College Dublin?"\n• "What documents are required for an Ireland student visa?"\n\nVerify on the official site: Always confirm details directly on official portals.',
      sourceUrl: 'https://www.daad.de/en/study-and-research-in-germany/',
      sourceName: 'Official DAAD & National Portals',
      lastChecked: '2026-10-15',
      isFallback: true,
    };
  }

  private matchesAny(text: string, keywords: string[]): boolean {
    return keywords.some((kw) => text.includes(kw));
  }
}

export const sparkFallbackEngine = new SparkFallbackEngine();
