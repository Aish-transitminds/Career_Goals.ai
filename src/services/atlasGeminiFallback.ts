import { ASSISTANT_BASE_BACKOFF_MS, ASSISTANT_MAX_RETRIES } from '../config/modelConfig';

function getHttpStatus(error: unknown): number | undefined {
  const message = error instanceof Error ? error.message : String(error);
  const match = message.match(/\b(404|429|503)\b/);
  return match ? Number(match[1]) : undefined;
}

export async function generateWithModelFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  wait: (delayMs: number) => Promise<void> = (delayMs) =>
    new Promise((resolve) => setTimeout(resolve, delayMs))
): Promise<T> {
  let delayMs = ASSISTANT_BASE_BACKOFF_MS;

  for (let attempt = 1; attempt <= ASSISTANT_MAX_RETRIES; attempt += 1) {
    try {
      return await primary();
    } catch (error) {
      const status = getHttpStatus(error);
      if (status === 404) return fallback();
      if (status !== 429 && status !== 503) throw error;
      if (attempt === ASSISTANT_MAX_RETRIES) return fallback();
      await wait(delayMs);
      delayMs *= 2;
    }
  }
  throw new Error('Gemini fallback was not reached.');
}
