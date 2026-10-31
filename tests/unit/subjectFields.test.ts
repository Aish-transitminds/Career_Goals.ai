import seedUniversities from '../../src/data/universities.json';
import { SUBJECT_FIELDS } from '../../src/data/subjectFields';
import { SUBJECT_UNIVERSITIES } from '../../src/data/subjectCatalog';
import { University } from '../../src/types';

const catalog = [
  ...(seedUniversities as University[]),
  ...SUBJECT_UNIVERSITIES,
];

for (const field of SUBJECT_FIELDS) {
  const matches = catalog.filter((university) =>
    university.fields?.includes(field) || university.field === field
  );
  console.log(`${field}: ${matches.length}`);
  if (matches.length < 6) {
    throw new Error(`Expected at least 6 programs for "${field}", got ${matches.length}.`);
  }
}

for (const university of catalog) {
  if (!university.field || !university.fields?.includes(university.field)) {
    throw new Error(`Legacy field compatibility is missing for ${university.id}.`);
  }
}

for (const suggestion of SUBJECT_UNIVERSITIES) {
  if (suggestion.tuition !== '' || suggestion.requirements.application_deadline !== null) {
    throw new Error(`Unverified tuition or deadline must remain empty for ${suggestion.id}.`);
  }
}

for (const name of ['Heidelberg University', 'Australian National University']) {
  const university = SUBJECT_UNIVERSITIES.find((item) => item.name === name);
  if (!university?.photoUrl || !university.photoCredit || !university.photoLicense) {
    throw new Error(`Campus photo and attribution are missing for ${name}.`);
  }
}

console.log(`Passed: all ${SUBJECT_FIELDS.length} subject categories return at least 6 programs.`);
