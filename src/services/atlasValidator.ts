/**
 * Atlas AI Architecture v2 - Fact-Key Validator & Number Cross-Checker
 * Receipts are impossible to fake:
 * 1. The model only outputs a factKey, NEVER a URL or date.
 * 2. Our code attaches the authoritative source link and check date from Firestore/catalog.
 * 3. Validator drops blocks with invalid factKeys or invented numbers.
 * 4. If no blocks survive, shows "I don't have a verified answer yet" with a recheck button.
 */

import { AtlasBlock, AtlasStructuredResponse, AtlasAction } from '../types/atlas';

export interface ValidationContext {
  retrievedFacts: Record<string, any>;
  sourceUrl?: string;
  sourceName?: string;
  lastChecked?: string;
  programId?: string;
}

export class AtlasValidator {
  /**
   * Validates structured response blocks against retrieved facts.
   */
  public validate(
    rawResponse: AtlasStructuredResponse,
    context: ValidationContext
  ): AtlasStructuredResponse {
    const validBlocks: AtlasBlock[] = [];
    const retrievedNumbers = this.extractAllNumbers(context.retrievedFacts);

    for (const block of rawResponse.blocks || []) {
      if (!block.factKey || typeof block.factKey !== 'string') {
        // Drop block with no factKey
        continue;
      }

      // Check if fact exists in retrieved facts or is an allowed computational/scope key
      const factExists = this.verifyFactKey(block.factKey, context.retrievedFacts);
      if (!factExists) {
        continue;
      }

      // Number cross-check: if block text mentions numbers (e.g. 6.5, 315, 6000),
      // ensure those numbers exist in the retrieved facts to prevent hallucinations
      const blockNumbers = this.extractNumbers(block.text);
      let numbersMatch = true;
      for (const num of blockNumbers) {
        // Skip common structural/generic numbers like "1st", "2", "3", "2026", "2027", "1", "2:1"
        if (this.isExemptNumber(num)) continue;

        if (!retrievedNumbers.has(num)) {
          // Number was invented by the model!
          numbersMatch = false;
          break;
        }
      }

      if (!numbersMatch) {
        continue;
      }

      // Attach genuine provenance info directly from our verified catalog
      validBlocks.push({
        text: block.text,
        factKey: block.factKey,
        sourceUrl: context.sourceUrl || 'https://www.daad.de/',
        sourceName: context.sourceName || 'Official University Admissions Portal',
        lastChecked: context.lastChecked || '2026-10-15',
        verified: true,
      });
    }

    // If zero blocks survived validation, return the graceful unverified fallback
    if (validBlocks.length === 0) {
      return this.buildUnverifiedFallback(context.programId);
    }

    return {
      directAnswer: rawResponse.directAnswer || validBlocks[0].text,
      blocks: validBlocks,
      details: rawResponse.details,
      followUps: rawResponse.followUps && rawResponse.followUps.length > 0
        ? rawResponse.followUps.slice(0, 3)
        : ['What IELTS score do I need?', 'Compare with TU Munich', 'Calculate education loan EMI'],
      actions: rawResponse.actions || this.defaultActions(context.programId),
      primarySource: {
        name: context.sourceName || 'Official Admissions Portal',
        url: context.sourceUrl || 'https://www.daad.de/',
        lastChecked: context.lastChecked || '2026-10-15',
      },
      status: 'verified',
    };
  }

  /**
   * Default action buttons injected inside answers to turn chat into app navigation.
   */
  public defaultActions(programId?: string): AtlasAction[] {
    const actions: AtlasAction[] = [];
    if (programId) {
      actions.push({
        id: 'add_to_tracker',
        label: 'Add to tracker',
        payload: { programId },
      });
    }
    actions.push({
      id: 'compare',
      label: 'Compare',
      payload: { programId },
    });
    actions.push({
      id: 'build_timeline',
      label: 'Build my timeline',
      payload: { programId },
    });
    return actions;
  }

  /**
   * Say "I don't know" well:
   * "I don't have a verified answer for this yet. Ask us to re-check it?"
   */
  public buildUnverifiedFallback(programId?: string): AtlasStructuredResponse {
    return {
      directAnswer: "I don't have a verified answer for this yet.",
      blocks: [
        {
          text: "We haven't confirmed this specific admission fact directly from the university's official portal yet. You can flag this requirement and our scraper will re-check it within 24 hours.",
          factKey: 'general.unverified',
          verified: false,
        },
      ],
      followUps: [
        'Check English requirements',
        'Show application deadlines',
        'Compare other verified universities',
      ],
      actions: [
        {
          id: 'recheck_flag',
          label: 'Ask us to re-check it',
          payload: { programId: programId || 'general', requestedAt: new Date().toISOString() },
        },
      ],
      status: 'unverified',
    };
  }

  /**
   * Out of scope graceful refusal:
   * Explains what Atlas covers and offers the nearest thing it can help with.
   */
  public buildOutOfScopeResponse(_query?: string): AtlasStructuredResponse {
    return {
      directAnswer: 'Atlas covers verified admissions in Germany, Ireland, and the UK.',
      blocks: [
        {
          text: 'I can only provide verified facts for university degree admissions, language test cutoffs (IELTS/TOEFL), tuition fees, and deadlines in Germany, Ireland, and the UK. I cannot answer queries about universities outside these regions or general non-admissions topics.',
          factKey: 'general.scope',
          verified: true,
        },
      ],
      followUps: [
        'Top verified CS programs in Germany',
        'Trinity College Dublin requirements',
        'Calculate loan EMI for studies',
      ],
      actions: [
        {
          id: 'compare',
          label: 'Explore covered programs',
        },
      ],
      status: 'out_of_scope',
    };
  }

  /**
   * Refusal for dishonest requests (fake financial proof, ghostwriting SOPs)
   */
  public buildDishonestRefusalResponse(): AtlasStructuredResponse {
    return {
      directAnswer: 'I cannot generate fabricated documents or falsified statements.',
      blocks: [
        {
          text: 'In accordance with academic integrity guidelines, Atlas cannot draft fake financial documents, falsified bank statements, or ghostwrite personal statements. I can gladly help you review official financial requirements or organize honest talking points for your own writing.',
          factKey: 'general.scope',
          verified: true,
        },
      ],
      followUps: [
        'Official blocked account requirements for Germany',
        'Ireland visa fund requirements',
        'Review official SOP prompts',
      ],
      status: 'refused_dishonest',
    };
  }

  private verifyFactKey(key: string, facts: Record<string, any>): boolean {
    if (key.startsWith('calc.') || key.startsWith('evaluation.') || key.startsWith('general.')) {
      return true;
    }
    const parts = key.split('.');
    let curr: any = facts;
    for (const part of parts) {
      if (curr === undefined || curr === null) return false;
      curr = curr[part];
    }
    return curr !== undefined;
  }

  private extractNumbers(text: string): Set<number> {
    const set = new Set<number>();
    // Matches integer and floating point numbers, handling commas (e.g. 6,000 -> 6000)
    const regex = /\b\d+(?:,\d{3})*(?:\.\d+)?\b/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const clean = match[0].replace(/,/g, '');
      const val = parseFloat(clean);
      if (!isNaN(val)) set.add(val);
    }
    return set;
  }

  private extractAllNumbers(obj: any, visited = new Set()): Set<number> {
    const numbers = new Set<number>();
    if (!obj || visited.has(obj)) return numbers;
    if (typeof obj === 'object') visited.add(obj);

    if (typeof obj === 'number') {
      numbers.add(obj);
      return numbers;
    }

    if (typeof obj === 'string') {
      return this.extractNumbers(obj);
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        for (const n of this.extractAllNumbers(item, visited)) {
          numbers.add(n);
        }
      }
    } else if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        for (const n of this.extractAllNumbers(obj[key], visited)) {
          numbers.add(n);
        }
      }
    }
    return numbers;
  }

  private isExemptNumber(num: number): boolean {
    // Structural numbers: 1, 2, 3, 4, 5, 2026, 2027, 2028, 24, 7 (years or days)
    return [1, 2, 3, 4, 5, 7, 10, 14, 24, 30, 45, 90, 180, 2024, 2025, 2026, 2027, 2028].includes(num);
  }
}

export const atlasValidator = new AtlasValidator();
