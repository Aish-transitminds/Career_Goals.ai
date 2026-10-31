import assert from 'node:assert/strict';
import { matchExternalInstitutions } from '../../src/services/atlasUniversityMatcher';

const items = [
  {
    id: 'https://ror.org/052gg0110',
    types: ['education', 'funder'],
    names: [
      { value: 'Oxford University', types: ['alias'] },
      { value: 'University of Oxford', types: ['label', 'ror_display'] },
    ],
    locations: [{ geonames_details: { name: 'Oxford', country_name: 'United Kingdom' } }],
    links: [{ type: 'website', value: 'https://www.ox.ac.uk' }],
  },
  {
    id: 'https://ror.org/oxford-brookes',
    types: ['education'],
    names: [{ value: 'Oxford Brookes University', types: ['label', 'ror_display'] }],
  },
  {
    id: 'https://ror.org/another-oxford',
    types: ['education'],
    names: [{ value: 'Oxford Institute of Something', types: ['label', 'ror_display'] }],
  },
];

const exactMatch = matchExternalInstitutions('What are Oxford admission requirements?', items);
assert.equal(exactMatch.length, 1);
assert.equal(exactMatch[0].name, 'University of Oxford');
assert.equal(exactMatch[0].website, 'https://www.ox.ac.uk');

const distinctName = matchExternalInstitutions('Oxford Brookes University admissions', items);
assert.equal(distinctName.length, 1);
assert.equal(distinctName[0].name, 'Oxford Brookes University');

assert.equal(matchExternalInstitutions('Oxford admissions', items).length, 1);
assert.equal(matchExternalInstitutions('Harvard tuition fees', items).length, 0);

console.log('All Atlas external university-match tests passed.');
