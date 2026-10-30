/**
 * Atlas AI Architecture v2 - In-Memory Answer Cache & Rate Limiter
 * Ensures high speed and zero redundant token cost on the free tier.
 */

import { AtlasStructuredResponse } from '../types/atlas';

interface CacheEntry {
  response: AtlasStructuredResponse;
  timestamp: number;
}

export class AtlasCache {
  private cache = new Map<string, CacheEntry>();
  // 1 hour cache TTL for verified answers
  private ttlMs = 60 * 60 * 1000;

  // Rate limiter: max 15 queries per rolling 60 seconds per user
  private rateLimits = new Map<string, number[]>();
  private readonly MAX_QUERIES_PER_MINUTE = 15;

  /**
   * Classify user query into standardized question categories.
   */
  public classifyQuestionType(query: string): string {
    const q = query.toLowerCase();
    if (/ielts|english|toefl|language|pte|duolingo/i.test(q)) return 'language_requirements';
    if (/deadline|apply date|when to apply|intake|last date/i.test(q)) return 'application_deadline';
    if (/fee|tuition|cost|price|how much|scholarship/i.test(q)) return 'tuition_fee';
    if (/gre|gmat|gate|test/i.test(q)) return 'standardized_tests';
    if (/emi|loan|interest|monthly repayment|bank loan/i.test(q)) return 'loan_emi';
    if (/timeline|milestone|schedule|roadmap/i.test(q)) return 'admission_timeline';
    if (/do i meet|eligible|my profile|qualify|can i get in/i.test(q)) return 'profile_evaluation';
    if (/compare|versus|vs/i.test(q)) return 'compare_programs';
    return 'general_inquiry';
  }

  public getCacheKey(programId: string, questionType: string, profileHash?: string): string {
    return `${programId || 'any'}:${questionType}:${profileHash || 'none'}`;
  }

  public get(key: string): AtlasStructuredResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.response;
  }

  public set(key: string, response: AtlasStructuredResponse): void {
    // Only cache verified responses
    if (response.status === 'verified') {
      this.cache.set(key, {
        response,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Enforces rolling window rate limit per user.
   * Returns true if allowed, false if rate limited.
   */
  public checkRateLimit(userId = 'default_user'): boolean {
    const now = Date.now();
    const timestamps = this.rateLimits.get(userId) || [];
    // Filter timestamps within the last 60 seconds
    const validTimestamps = timestamps.filter((t) => now - t < 60000);

    if (validTimestamps.length >= this.MAX_QUERIES_PER_MINUTE) {
      return false; // Rate limit exceeded
    }

    validTimestamps.push(now);
    this.rateLimits.set(userId, validTimestamps);
    return true;
  }

  public clear(): void {
    this.cache.clear();
    this.rateLimits.clear();
  }
}

export const atlasCache = new AtlasCache();
