/**
 * AbroadPath AI - Global LLM & Assistant Configuration
 * File: src/config/modelConfig.ts
 *
 * Centralized model configuration replacing retired Gemini 1.5 Flash.
 * Defined once for the entire assistant and client-side pipeline.
 */

// Authoritative modern Gemini Flash model identifier
export const GEMINI_MODEL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_MODEL) ||
  'gemini-2.5-flash';

// Retry and backoff constants for rate-limiting (429 / 503)
export const ASSISTANT_MAX_RETRIES = 3;
export const ASSISTANT_BASE_BACKOFF_MS = 1000;

export const ASSISTANT_UNAVAILABLE_MESSAGE =
  'The AI assistant is temporarily unavailable. Please try again in a moment, or verify requirements directly on the official university portal.';

export const NOT_IN_CATALOG_MESSAGE =
  'This information is not in our verified catalog. Our verified dataset currently covers institutions and guidelines in Germany, Ireland, and the United Kingdom. Please verify directly on the official portal.';
