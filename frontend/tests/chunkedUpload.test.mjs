import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkedUpload } from '../src/services/chunkedUpload.js';
import { getOperations, cancelOperations } from '../src/services/operationTracker.js';

test('large file is transferred byte for byte in ordered chunks before completion', async () => {
  const file = new File(['abcdefghi'], 'fies.csv');
  const chunks = [];
  const progress = [];
  const client = { async post(url, body, config) {
    if (url.endsWith('/uploads')) return { data: { id: 'session', chunkSize: 4 } };
    if (url.endsWith('/complete')) { assert.equal(chunks.join(''), 'abcdefghi'); return { data: { id: 3 } }; }
    assert.equal(config.headers['Content-Type'], 'application/octet-stream');
    chunks.push(await body.text());
    config.onUploadProgress({ loaded: body.size });
    return { data: {} };
  }, delete() { assert.fail('Must not delete completed session'); } };
  assert.deepEqual(await chunkedUpload(client, file, p => progress.push(p)), { data: { id: 3 } });
  assert.deepEqual(chunks, ['abcd', 'efgh', 'i']);
  assert.equal(progress.at(-1), 100);
  assert.equal(getOperations().length, 0);
});

test('cancellation stops between chunks and cleans up partial session', async () => {
  let sent = 0; let deleted = false;
  const client = { async post(url) {
    if (url.endsWith('/uploads')) return { data: { id: 'session', chunkSize: 2 } };
    assert.ok(!url.endsWith('/complete'));
    sent++;
    await cancelOperations(client);
    return { data: {} };
  }, async delete() { deleted = true; } };
  await assert.rejects(chunkedUpload(client, new File(['abcdef'], 'fies.csv')));
  assert.equal(sent, 1); assert.equal(deleted, true); assert.equal(getOperations().length, 0);
});
