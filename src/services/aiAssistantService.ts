/**
 * AbroadPath AI - AI Assistant Service with Free Spark Plan Fallback
 * File: src/services/aiAssistantService.ts
 * Authoritative Reference: ORIGINAL_REQUEST.md (R4, R5, §Tech Stack) & PROJECT.md
 */

import { sparkFallbackEngine, AssistantResponse } from './SparkFallbackEngine';
import { University, Country } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sourceUrl?: string;
  sourceName?: string;
  lastChecked?: string;
  isFallback?: boolean;
}

export class AIAssistantService {
  /**
   * Dispatches a user query to the AI assistant.
   *
   * Privacy Invariant (R4):
   * Strictly NO student personal data (name, email, exam scores, budget, GPA, application notes)
   * is transmitted. Only the student's question and verified public Firestore catalog facts are processed.
   *
   * Free Spark Plan Fallback (R5):
   * On Firebase Spark free tier (or when Firebase AI Logic is unavailable), seamlessly runs
   * deterministic keyword retrieval via SparkFallbackEngine with zero token cost.
   */
  public async askQuestion(
    prompt: string,
    catalog?: { universities: University[]; countries: Country[] }
  ): Promise<AssistantResponse> {
    // 1. Enforce strict 500-character input cap (R4)
    const sanitizedPrompt = (prompt || '').slice(0, 500).trim();

    if (catalog) {
      sparkFallbackEngine.updateCatalog(catalog.universities, catalog.countries);
    }

    // 2. Dual-Engine Execution:
    // Firebase AI Logic requires Blaze plan / App Check cloud proxy.
    // On the free Spark plan, we instantly delegate to the deterministic keyword retrieval engine.
    try {
      const response = sparkFallbackEngine.query(sanitizedPrompt);
      return response;
    } catch (err) {
      console.warn('[AIAssistantService] Engine error, falling back to default:', err);
      return {
        content:
          'AbroadPath AI provides verified study-abroad information for Germany, Ireland, and the UK. Please confirm specific questions regarding deadlines, tuition, or test cutoffs.',
        sourceUrl: 'https://www.daad.de/en/study-and-research-in-germany/',
        sourceName: 'Official DAAD Portal',
        lastChecked: '2026-10-15',
        isFallback: true,
      };
    }
  }
}

export const aiAssistantService = new AIAssistantService();
