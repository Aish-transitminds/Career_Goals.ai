import subjectUniversities from './subjectUniversities.json';
import seededUniversities from './universities.json';
import { University } from '../types';

interface SubjectUniversityRecord {
  id: string;
  countryId: string;
  name: string;
  program: string;
  field: string;
  fields: string[];
  sourceUrl: string;
}

type CampusPhoto = Pick<
  University,
  'photoUrl' | 'photoCredit' | 'photoLicense' | 'photoSourceUrl' | 'photoLicenseUrl'
>;

const seededPhotos = new Map(
  (seededUniversities as University[])
    .filter((university) => university.photoUrl)
    .map((university) => [
      normalizeInstitutionName(university.name),
      {
        photoUrl: university.photoUrl,
        photoCredit: university.photoCredit,
        photoLicense: university.photoLicense,
        photoSourceUrl: university.photoSourceUrl,
        photoLicenseUrl: university.photoLicenseUrl,
      },
    ])
);

const additionalPhotos: Record<string, CampusPhoto> = {
  'australian national university': {
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Telstra_Tower_from_ANU_campus%2C_Canberra_Australia.jpg/960px-Telstra_Tower_from_ANU_campus%2C_Canberra_Australia.jpg',
    photoCredit: 'Thennicke',
    photoLicense: 'CC BY-SA 4.0',
    photoSourceUrl: 'https://commons.wikimedia.org/wiki/File:Telstra_Tower_from_ANU_campus,_Canberra_Australia.jpg',
    photoLicenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  },
};

function normalizeInstitutionName(name: string): string {
  return name.replace(/^The\s+/i, '').trim().toLocaleLowerCase();
}

export function normalizeSubjectUniversity(record: SubjectUniversityRecord): University {
  const photo = seededPhotos.get(normalizeInstitutionName(record.name))
    || additionalPhotos[normalizeInstitutionName(record.name)];

  return {
    ...record,
    ...photo,
    requirements: {
      gmat_required: null,
      gre_required: null,
      min_ielts: null,
      min_toefl: null,
      min_gre: null,
      min_gmat: null,
      language_requirement: null,
      tuition_fee: null,
      application_deadline: null,
      notes: null,
    },
    tuition: '',
    portalUrl: record.sourceUrl,
    ruleChanged: false,
    verificationNote: 'Admissions details have not been independently verified. Confirm on the official university site.',
    institutionVerificationStatus: 'unverified',
    programVerificationStatus: 'unverified',
    accreditationStatus: 'unverified',
    admissionRequirementVerificationStatus: 'unverified',
    websiteVerificationStatus: 'unverified',
    imageVerificationStatus: 'unverified',
    dataFreshnessStatus: 'never_verified',
    flaggedForReview: false,
  };
}

export const SUBJECT_UNIVERSITIES: University[] = (
  subjectUniversities as SubjectUniversityRecord[]
).map(normalizeSubjectUniversity);
