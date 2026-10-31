/**
 * AbroadPath AI - Global LLM & Assistant Configuration
 * File: src/config/modelConfig.ts
 *
 * Centralized model configuration replacing retired Gemini 1.5 Flash.
 * Defined once for the entire assistant and client-side pipeline.
 */

// Firebase AI Logic manages Gemini credentials; never place an API key here.
const modelEnv = typeof import.meta !== 'undefined' ? import.meta.env : undefined;

export const GEMINI_MODEL: string =
  modelEnv?.VITE_GEMINI_MODEL || 'gemini-3.8-flash';
export const GEMINI_FALLBACK_MODEL: string =
  modelEnv?.VITE_GEMINI_FALLBACK_MODEL || 'gemini-3.5-flash-lite';
export const GEMINI_TIMEOUT_MS = 45_000;

// Groq Ultra-Fast LPU Inference
export const GROQ_MODEL: string =
  modelEnv?.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';
export const GROQ_FALLBACK_MODEL: string =
  modelEnv?.VITE_GROQ_FALLBACK_MODEL || 'llama-3.1-8b-instant';
export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Retry and backoff constants for rate-limiting (429 / 503)
export const ASSISTANT_MAX_RETRIES = 3;
export const ASSISTANT_BASE_BACKOFF_MS = 1000;

export const ASSISTANT_UNAVAILABLE_MESSAGE =
  'Atlas is temporarily unavailable. Please try again in a moment, or verify requirements directly on the official university portal.';

export const NOT_IN_CATALOG_MESSAGE =
  'This information is not in our verified catalog. Our verified dataset currently covers institutions and guidelines in Germany, Ireland, and the United Kingdom. Please verify directly on the official portal.';
