export const SUBJECT_FIELDS = [
  'Computer Science & Informatics',
  'Data Science & Artificial Intelligence',
  'Fashion Design & Textile Arts',
  'Theatre & Performing Arts',
  'Business, Management & Economics',
  'Engineering (Mechanical / Electrical / Civil)',
  'Arts, Humanities & Social Sciences',
  'Natural & Life Sciences',
  'Other / Interdisciplinary Studies',
] as const;

export type SubjectField = (typeof SUBJECT_FIELDS)[number];
