/**
 * AbroadPath AI - AI Assistant Service with Free Spark Plan Fallback & Modern Gemini Flash
 * File: src/services/aiAssistantService.ts
 * Authoritative Reference: ORIGINAL_REQUEST.md (R4, R5, §Tech Stack) & PROJECT.md
 */

import { sparkFallbackEngine, AssistantResponse } from './SparkFallbackEngine';
import { University, Country } from '../types';
import {
  GEMINI_MODEL,
  ASSISTANT_MAX_RETRIES,
  ASSISTANT_BASE_BACKOFF_MS,
  ASSISTANT_UNAVAILABLE_MESSAGE,
  NOT_IN_CATALOG_MESSAGE,
} from '../config/modelConfig';

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
   * Privacy Invariant (R4, Task 3):
   * Strictly NO student personal data (name, email, exam scores, budget, GPA, application notes)
   * is transmitted. Only the student's question and verified public Firestore catalog facts are processed.
   *
   * Zero-Hallucination Invariant (Task 3):
   * Answers ONLY from the verified Firestore catalog. If query is out-of-catalog, explicitly
   * states that the data is not in the verified catalog and points to the official portal.
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

    // 2. Check for optional live Gemini API key
    const apiKey =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) ||
      (typeof process !== 'undefined' && (process.env?.VITE_GEMINI_API_KEY || process.env?.GEMINI_API_KEY));

    if (apiKey) {
      try {
        return await this.callGeminiWithRetry(sanitizedPrompt, catalog, apiKey);
      } catch (err) {
        console.warn(
          '[AIAssistantService] Live Gemini API error, falling back to deterministic catalog engine:',
          err
        );
      }
    }

    // 3. Deterministic catalog retrieval engine (Zero Token Cost, Guaranteed Zero Hallucination)
    try {
      return sparkFallbackEngine.query(sanitizedPrompt);
    } catch (err) {
      console.warn('[AIAssistantService] Engine error, falling back to default:', err);
      return {
        content: ASSISTANT_UNAVAILABLE_MESSAGE,
        sourceUrl: 'https://www.daad.de/en/study-and-research-in-germany/',
        sourceName: 'Official DAAD Portal',
        lastChecked: '2026-10-15',
        isFallback: true,
      };
    }
  }

  /**
   * Calls Gemini Flash with exponential backoff on 429 / 503 rate limits.
   */
  private async callGeminiWithRetry(
    prompt: string,
    catalog: { universities: University[]; countries: Country[] } | undefined,
    apiKey: string
  ): Promise<AssistantResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    // Construct privacy-preserving catalog context (NO personal student data)
    const catalogContext = (catalog?.universities || []).map((u) => ({
      name: u.name,
      country: u.countryId,
      program: u.program,
      tuition: u.tuition,
      deadline: u.requirements.application_deadline,
      ielts: u.requirements.min_ielts,
      toefl: u.requirements.min_toefl,
      gre_required: u.requirements.gre_required,
      min_gre: u.requirements.min_gre,
      gmat_required: u.requirements.gmat_required,
      portal: u.portalUrl,
    }));

    const systemInstruction = `You are AbroadPath AI Assistant.
You must answer questions ONLY using the verified catalog data provided below.
If the question is about an institution (e.g. MIT, Stanford, Harvard), country, or metric (such as unverified acceptance rates) NOT present in this catalog, you MUST reply:
"${NOT_IN_CATALOG_MESSAGE}"
Never hallucinate or assume unconfirmed requirements. Include the official portal URL in your response.`;

    const requestPayload = {
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Verified Catalog Data:\n${JSON.stringify(catalogContext)}\n\nUser Question:\n${prompt}`,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 600,
      },
    };

    // Audit log demonstrating zero personal data in payload
    console.info('[AIAssistantService] Outbound payload audit: zero personal data, catalog items:', catalogContext.length);

    let lastError: unknown = null;
    for (let attempt = 1; attempt <= ASSISTANT_MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });

        if (response.status === 429 || response.status === 503) {
          const backoff = ASSISTANT_BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          console.warn(`[AIAssistantService] Rate limited (${response.status}). Retrying in ${backoff}ms...`);
          await new Promise((r) => setTimeout(r, backoff));
          continue;
        }

        if (!response.ok) {
          throw new Error(`Gemini API HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return {
            content: text,
            sourceUrl: 'https://www.daad.de/en/study-and-research-in-germany/',
            sourceName: 'Official University & DAAD Portals',
            lastChecked: '2026-10-15',
            isFallback: false,
          };
        }
      } catch (err) {
        lastError = err;
        if (attempt < ASSISTANT_MAX_RETRIES) {
          const backoff = ASSISTANT_BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }

    throw lastError || new Error(ASSISTANT_UNAVAILABLE_MESSAGE);
  }
}

export const aiAssistantService = new AIAssistantService();
