import { GEMINI_MODEL } from '../config/modelConfig';

export interface SubjectSuggestion {
  name: string;
  program: string;
  countryId: string;
  officialUrl: string;
  tuition: null;
  deadline: null;
}

const VALID_COUNTRIES = new Set(['usa', 'uk', 'canada', 'germany', 'australia', 'ireland']);

function isSubjectSuggestion(item: unknown): item is SubjectSuggestion {
  if (!item || typeof item !== 'object') return false;
  const suggestion = item as Record<string, unknown>;
  return typeof suggestion.name === 'string' &&
    typeof suggestion.program === 'string' &&
    typeof suggestion.countryId === 'string' &&
    VALID_COUNTRIES.has(suggestion.countryId) &&
    typeof suggestion.officialUrl === 'string' &&
    suggestion.officialUrl.startsWith('https://') &&
    suggestion.tuition === null &&
    suggestion.deadline === null;
}

export async function getSubjectSuggestions(
  field: string,
  country: string,
  budget: number | null
): Promise<SubjectSuggestion[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('AI suggestions are unavailable because the Gemini API key is not configured.');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{
          text: `Suggest up to five real universities and specific real programs for the subject "${field}", country filter "${country}", and budget "${budget ?? 'not specified'}". Return JSON only in this exact shape: {"suggestions":[{"name":"university name","program":"real program name","countryId":"usa|uk|canada|germany|australia|ireland","officialUrl":"https://official-university-domain/program-page","tuition":null,"deadline":null}]}. Use only official university URLs. Never include a tuition amount or deadline; those two values must always be null. If you cannot confidently identify real programs with official URLs, return fewer suggestions or an empty array.`,
        }],
      }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens: 1400 },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini suggestions request failed (${response.status}).`);
  }

  const payload = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
  if (!text) {
    throw new Error('Gemini returned an empty suggestions response.');
  }

  let parsed: { suggestions?: unknown };
  try {
    parsed = JSON.parse(text) as { suggestions?: unknown };
  } catch {
    throw new Error('Gemini returned suggestions in an invalid JSON format.');
  }
  if (!Array.isArray(parsed.suggestions)) {
    throw new Error('Gemini response is missing its suggestions list.');
  }

  return parsed.suggestions.filter(isSubjectSuggestion).slice(0, 5);
}
