const entityAliases: Record<string, string[]> = {
  tum_informatics: ['tum', 'technical university of munich', 'tu munich', 'tu münchen'],
  rwth_cs: ['rwth', 'rwth aachen'],
  heidelberg_dcs: ['heidelberg university', 'university of heidelberg', 'ruprecht karls'],
  lmu_datascience: ['lmu', 'ludwig maximilian', 'lmu munich'],
  tcd_cs: ['tcd', 'trinity college dublin'],
  ucd_cs: ['ucd', 'university college dublin'],
  galway_cs: ['university of galway', 'nuig'],
  ucc_cs: ['university college cork'],
  imperial_computing: ['imperial college london', 'imperial college'],
  oxford_acs: ['oxford', 'university of oxford'],
  manchester_acs: ['manchester', 'university of manchester'],
};

const COMMON_WORDS = new Set([
  'Can', 'Could', 'Does', 'How', 'Is', 'Tell', 'What', 'When', 'Where', 'Which', 'Who',
  'Why', 'Would', 'Are', 'Do', 'The', 'My', 'I', 'You', 'Please', 'Show', 'Find', 'Search',
  'Compare', 'List', 'At', 'For', 'To', 'About', 'From', 'In', 'On', 'And', 'Or',
  'IELTS', 'TOEFL', 'GRE', 'GMAT', 'GPA', 'Deadline', 'Requirements', 'Requirement',
  'Fees', 'Fee', 'Tuition', 'Scholarship', 'Scholarships', 'Study', 'Data', 'Science',
  'Computer', 'Engineering', 'Masters', 'Master', 'Programme', 'Program', 'Eligibility',
  'Eligible', 'Qualify', 'Admissions', 'Admission', 'Germany', 'Ireland', 'UK', 'United',
  'Kingdom', 'US', 'USA', 'Canada', 'Australia', 'Winter', 'Summer', 'It', 'They', 'We',
  'He', 'She', 'Have', 'Has', 'Should', 'Will',
]);

const QUERY_STOP_WORDS = new Set([
  'a', 'about', 'admission', 'admissions', 'an', 'and', 'at', 'bachelor', 'bachelors',
  'can', 'college', 'computer', 'deadline', 'degree', 'does', 'for', 'from', 'gre', 'gmat',
  'how', 'i', 'in', 'informatics', 'institute', 'is', 'it', 'masters', 'of', 'on', 'or',
  'requirements', 'science', 'the', 'to', 'university', 'what', 'where', 'which', 'who',
  'with', 'ielts', 'toefl', 'tuition', 'scholarship', 'tell', 'me', 'please', 'about',
  'offer', 'offers', 'apply', 'application', 'cutoff', 'cutoffs', 'score', 'scores',
  'require', 'requires', 'required', 'need', 'needs', 'minimum', 's', 'm', 'sc', 'msc',
  'qualify', 'eligible', 'eligibility', 'meet', 'study', 'studying', 'accept', 'acceptance',
  'rate', 'do', 'you', 'know', 'if', 'program', 'programme', 'cs', 'acs', 'computing',
  'datascience', 'for', 'at', 'in', 'are',
]);

export function normalizeInstitutionTokens(value: string): string[] {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu)
    ?.filter((token) => !QUERY_STOP_WORDS.has(token)) || [];
}

export interface ExternalInstitutionMatch {
  id: string;
  name: string;
  types: string[];
  location: {
    name?: string;
    country_name?: string;
  } | null;
  website: string | null;
}

export function matchExternalInstitutions(
  query: string,
  items: Array<Record<string, any>>
): ExternalInstitutionMatch[] {
  const queryTokens = new Set(normalizeInstitutionTokens(query));
  if (!queryTokens.size) return [];

  const matches = new Map<string, ExternalInstitutionMatch>();
  for (const item of items) {
    if (!Array.isArray(item.types) || !item.types.includes('education')) continue;
    const names = Array.isArray(item.names) ? item.names : [];
    const exactNameMatch = names.some((name) => {
      const nameTokens = normalizeInstitutionTokens(name.value || '');
      const overlap = [...queryTokens].filter((token) => nameTokens.includes(token)).length;
      return nameTokens.length > 0
        && overlap / Math.max(queryTokens.size, nameTokens.length) >= 0.85;
    });
    if (!exactNameMatch) continue;

    const displayName =
      names.find((name) => name.types?.includes('ror_display'))?.value ||
      names.find((name) => name.types?.includes('label'))?.value ||
      names[0]?.value;
    if (!displayName || !item.id) continue;

    const types = item.types.filter((type: unknown): type is string => typeof type === 'string');
    const links: Array<{ type?: string; value?: string }> = Array.isArray(item.links)
      ? item.links
      : [];
    matches.set(item.id, {
      id: item.id,
      name: displayName,
      types,
      location: item.locations?.[0]?.geonames_details || null,
      website: links.find((link) => link.type === 'website')?.value || null,
    });
  }
  return [...matches.values()];
}

export function resolveAtlasProgramId(query: string, contextId?: string): string | null {
  const matches = Object.entries(entityAliases)
    .filter(([id, aliases]) => aliases.some((alias) => {
      const conflictingName =
        (id === 'oxford_acs' && /\boxford\s+brookes\b/i.test(query)) ||
        (id === 'manchester_acs' && /\bmanchester\s+metropolitan\b/i.test(query));
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return !conflictingName
        && new RegExp(`(^|[^\\p{L}\\p{N}])${escapedAlias}(?=$|[^\\p{L}\\p{N}])`, 'iu').test(query);
    }))
    .map(([id]) => id);

  if (matches.length === 1) return matches[0];
  if (matches.length > 1 || hasUnmatchedInstitutionName(query)) return null;
  return contextId || null;
}

export function hasUnmatchedInstitutionName(prompt: string): boolean {
  if (/\b(universit\w*|college|institute|polytechnic)\b/i.test(prompt)) return true;

  const capitalizedWords = prompt.match(/\b[A-Z][\p{L}\d&.'-]{2,}\b/gu) || [];
  if (capitalizedWords.some((word) => !isCommonWord(word))) return true;

  const withoutQuestionLead = prompt.trim().replace(
    /^(?:(?:please|tell me|show me|find|search for|compare|list|what|when|where|which|who|why|how|do|does|can|could|is|are|the|my|i|you)\s+)+/i,
    '',
  );
  const firstWord = withoutQuestionLead.match(/^[\p{L}]+/u)?.[0];
  if (firstWord && !isCommonWord(firstWord)) return true;

  const auxiliaryTarget = prompt.match(
    /\b(?:does|do|is|are|has|have|can|could|will|would|should)\s+(?:the\s+)?([\p{L}][\p{L}'-]*)/iu,
  )?.[1];
  if (auxiliaryTarget && !isCommonWord(auxiliaryTarget)) return true;

  const prepositionTarget = prompt.match(
    /\b(?:at|for|to|about|from)\s+([A-Za-z][\p{L}'-]*)/iu,
  )?.[1];
  return Boolean(prepositionTarget && !isCommonWord(prepositionTarget));
}

function isCommonWord(word: string): boolean {
  const normalized = word.toLowerCase();
  return [...COMMON_WORDS].some((commonWord) => commonWord.toLowerCase() === normalized);
}
