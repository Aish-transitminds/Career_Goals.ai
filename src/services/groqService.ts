/**
 * Groq LPU Ultra-Fast LLM Service for Atlas AI
 * File: src/services/groqService.ts
 *
 * Provides sub-second inference using Groq LPU Cloud (Llama 3.3 70B / 3.1 8B)
 * with structured JSON enforcement, automatic model fallback, and timeouts.
 */

import { GROQ_MODEL, GROQ_FALLBACK_MODEL, GROQ_API_URL } from '../config/modelConfig';
import { AtlasStructuredResponse } from '../types/atlas';

export async function generateWithGroq(
  systemPrompt: string,
  userPrompt: string,
  apiKey?: string
): Promise<AtlasStructuredResponse> {
  const envKey =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_GROQ_API_KEY
      : typeof process !== 'undefined'
      ? process.env.VITE_GROQ_API_KEY
      : undefined;
  const key = apiKey || envKey;
  if (!key) {
    throw new Error('No Groq API key configured');
  }

  const callGroq = async (model: string) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 600,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Groq returned empty content');
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as AtlasStructuredResponse;
      }
      return JSON.parse(content) as AtlasStructuredResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    return await callGroq(GROQ_MODEL);
  } catch (err) {
    console.warn(`[Groq] Primary model ${GROQ_MODEL} failed, trying fallback ${GROQ_FALLBACK_MODEL}:`, err);
    return await callGroq(GROQ_FALLBACK_MODEL);
  }
}
