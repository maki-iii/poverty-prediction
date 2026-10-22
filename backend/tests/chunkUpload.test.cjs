const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const { createChunkUploadRouter, CHUNK_SIZE } = require('../routes/chunkUploadRoute');

test('chunk upload preserves bytes, enforces ownership and size, and saves exactly once', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pps-upload-test-'));
  let saves = 0;
  const original = Buffer.alloc(CHUNK_SIZE + 17, 65);
  original[CHUNK_SIZE] = 13;
  const router = createChunkUploadRouter({ directory,
    verifyToken: (req, res, next) => { req.user = { id: req.get('test-user') || 'one' }; next(); },
    trackOperation: (req, res, next) => next(),
    save: async (file) => { saves++; assert.deepEqual(fs.readFileSync(file), original); return { id: 123 }; },
  });
  const app = express(); app.use(express.json()); app.use('/uploads', router);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/uploads`;
  const request = (suffix, body, headers = {}, method = 'POST') => fetch(url + suffix, { method, body, headers });
  const json = { 'Content-Type': 'application/json' };
  const binary = { 'Content-Type': 'application/octet-stream' };
  try {
    assert.equal((await request('', JSON.stringify({ name: 'bad.csv', size: 0 }), json)).status, 400);
    const { id } = await (await request('', JSON.stringify({ name: 'FIES 2021.CSV', size: original.length }), json)).json();
    assert.equal((await request(`/${id}/chunks/0`, original.subarray(0, 10), { ...binary, 'test-user': 'two' })).status, 404);
    assert.equal((await request(`/${id}/complete`)).status, 409);
    assert.equal((await request(`/${id}/chunks/1`, original.subarray(0, 10), binary)).status, 409);
    assert.equal((await request(`/${id}/chunks/0`, original, binary)).status, 413);
    assert.equal((await request(`/${id}/chunks/0`, original.subarray(0, CHUNK_SIZE), binary)).status, 200);
    assert.equal((await request(`/${id}/chunks/0`, original.subarray(0, CHUNK_SIZE), binary)).status, 200);
    assert.equal((await request(`/${id}/chunks/0`, Buffer.from('wrong'), binary)).status, 409);
    assert.equal((await request(`/${id}/chunks/${CHUNK_SIZE}`, original.subarray(CHUNK_SIZE), binary)).status, 200);
    const results = await Promise.all([request(`/${id}/complete`), request(`/${id}/complete`)]);
    for (const result of results) assert.deepEqual(await result.json(), { id: 123 });
    assert.equal(saves, 1);
    assert.deepEqual(fs.readdirSync(directory), []);
  } finally {
    router.close(); await new Promise(resolve => server.close(resolve));
    fs.rmdirSync(directory);
  }
});
