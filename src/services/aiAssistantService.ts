/**
 * AbroadPath AI - AI Assistant Service (Atlas Architecture v2)
 * File: src/services/aiAssistantService.ts
 * Integrates AtlasService with retrieval-first tools, factKey validation, and profile awareness.
 */

import { atlasService } from './atlasService';
import { atlasToolRegistry } from './atlasTools';
import { AtlasStructuredResponse, AtlasAction } from '../types/atlas';
import { University, Country, UserProfile } from '../types';
import { ASSISTANT_UNAVAILABLE_MESSAGE } from '../config/modelConfig';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  structured?: AtlasStructuredResponse;
  sourceUrl?: string;
  sourceName?: string;
  lastChecked?: string;
  isFallback?: boolean;
  isDemo?: boolean;
  isSystem?: boolean;
  followUps?: string[];
  actions?: AtlasAction[];
  usedProfile?: boolean;
}

export class AIAssistantService {
  /**
   * Dispatches a user query to Atlas v2 service.
   */
  public async askQuestion(
    prompt: string,
    catalog?: { universities: University[]; countries: Country[] },
    context?: { id?: string; university?: string; programme?: string; profile?: UserProfile | null; useProfile?: boolean }
  ): Promise<ChatMessage> {
    const sanitizedPrompt = (prompt || '').slice(0, 500).trim();

    if (catalog) {
      atlasToolRegistry.setCatalog(catalog.universities, catalog.countries);
    }

    try {
      const structured = await atlasService.askAtlas(sanitizedPrompt, {
        userProfile: context?.profile,
        useProfile: context?.useProfile !== false,
        contextProgramId: context?.id,
      });

      // Construct readable plain-text fallback content for legacy consumers
      const textParts = [
        structured.directAnswer || '',
        ...structured.blocks.map((b) => `• ${b.text}`),
      ].filter(Boolean);

      return {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: textParts.join('\n\n'),
        structured,
        sourceUrl: structured.primarySource?.url,
        sourceName: structured.primarySource?.name,
        lastChecked: structured.primarySource?.lastChecked,
        followUps: structured.followUps,
        actions: structured.actions,
        usedProfile: structured.usedProfile,
        isFallback: structured.status !== 'verified',
      };
    } catch (err) {
      console.warn('[AIAssistantService] Atlas error, returning safe verified fallback:', err);
      return {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: ASSISTANT_UNAVAILABLE_MESSAGE,
        followUps: [
          'IELTS for Manchester CS?',
          'Cheapest verified Germany MS?',
          'Calculate education loan EMI',
        ],
        isFallback: true,
      };
    }
  }
}

export const aiAssistantService = new AIAssistantService();
