import assert from 'node:assert/strict';
import { generateWithGroq } from '../../src/services/groqService';

async function testGroqNoKey() {
  try {
    await generateWithGroq('system', 'user', '');
    assert.fail('Expected error when no key provided');
  } catch (err: any) {
    assert.match(err.message, /No Groq API key configured/);
  }
}

async function run() {
  await testGroqNoKey();
  console.log('All Atlas Groq service tests passed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

