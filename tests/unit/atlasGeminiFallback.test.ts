import assert from 'node:assert/strict';
import { generateWithModelFallback } from '../../src/services/atlasGeminiFallback';

async function runTests() {
  let fallbackCalls = 0;
  const notFound = new Error('Request failed with status 404');
  const after404 = await generateWithModelFallback(
    async () => { throw notFound; },
    async () => { fallbackCalls += 1; return 'fallback'; },
    async () => {}
  );
  assert.equal(after404, 'fallback');
  assert.equal(fallbackCalls, 1);

  let primaryCalls = 0;
  const waits: number[] = [];
  const overloaded = new Error('Request failed with status 503');
  const after503 = await generateWithModelFallback(
    async () => { primaryCalls += 1; throw overloaded; },
    async () => { fallbackCalls += 1; return 'fallback after retries'; },
    async (delayMs) => { waits.push(delayMs); }
  );
  assert.equal(after503, 'fallback after retries');
  assert.equal(primaryCalls, 3);
  assert.deepEqual(waits, [1_000, 2_000]);
  assert.equal(fallbackCalls, 2);

  const serverError = new Error('Request failed with status 500');
  await assert.rejects(
    generateWithModelFallback(
      async () => { throw serverError; },
      async () => { throw new Error('should not call fallback'); },
      async () => {}
    ),
    (error) => error === serverError
  );

  console.log('All Atlas Gemini fallback tests passed.');
}

runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
