import assert from 'node:assert/strict';
import { resolveAtlasProgramId } from '../../src/services/atlasUniversityMatcher';

assert.equal(resolveAtlasProgramId('What IELTS score does TUM require?'), 'tum_informatics');
assert.equal(resolveAtlasProgramId('What is the deadline for Oxford?'), 'oxford_acs');
assert.equal(resolveAtlasProgramId('Tell me about Oxford Brookes University'), null);
assert.equal(resolveAtlasProgramId('IELTS requirement?', 'tum_informatics'), 'tum_informatics');
assert.equal(resolveAtlasProgramId('What IELTS cutoff does Harvard have?', 'tum_informatics'), null);
assert.equal(resolveAtlasProgramId('what IELTS cutoff does harvard have?', 'tum_informatics'), null);
assert.equal(resolveAtlasProgramId('IELTS requirement?', 'tum_informatics'), 'tum_informatics');
assert.equal(resolveAtlasProgramId('What are RWTH Aachen requirements?'), 'rwth_cs');
assert.equal(resolveAtlasProgramId('What are Aachen requirements?'), null);

console.log('All Atlas university-match tests passed.');
