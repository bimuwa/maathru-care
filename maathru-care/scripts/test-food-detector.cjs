const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const ts = require('typescript');

const response = { success: true, count: 1, detections: [{ food_id: 'rice', confidence: 0.9, box: [1, 2, 3, 4] }] };
const source = fs.readFileSync(path.join(__dirname, '../src/services/api/foodDetector.ts'), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function load({ platform = 'web', fetchImpl = fetch, upload, env = {}, immediateAbort = false } = {}) {
  const exports = {};
  let files = 0, timers = 0;
  class NativeFile {
    constructor(uri) {
      assert.notEqual(platform, 'web', 'web must never construct an Expo native File');
      files++;
      this.uri = uri;
    }
    upload(url, options) { return upload(this.uri, url, options); }
  }
  vm.runInNewContext(code, { exports, process: { env }, Blob, FormData, AbortController,
    fetch: fetchImpl, console: { error() {} },
    setTimeout(fn) { timers++; if (immediateAbort) fn(); return 1; },
    clearTimeout() { timers = 0; },
    require(name) {
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === 'expo-file-system') return { File: NativeFile, UploadType: { MULTIPART: 'multipart' } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { analyze: exports.analyzeMealImage, files: () => files, timers: () => timers };
}

test('web uploads actual multipart image bytes without constructing a native File', async () => {
  let uploaded;
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    uploaded = { url: req.url, type: req.headers['content-type'], body: Buffer.concat(chunks).toString() };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const app = load({ env: { EXPO_PUBLIC_FOOD_DETECTOR_API_URL: `http://127.0.0.1:${server.address().port}/predict` } });
    assert.deepEqual(await app.analyze('data:image/jpeg;base64,aW1hZ2UtYnl0ZXM='), response);
    assert.equal(uploaded.url, '/predict');
    assert.match(uploaded.type, /^multipart\/form-data; boundary=/);
    assert.match(uploaded.body, /name="file"; filename="meal.jpg"/);
    assert.match(uploaded.body, /image-bytes/);
    assert.equal(app.files(), 0);
    assert.equal(app.timers(), 0);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('web blob URI and default Render endpoint preserve detection response', async () => {
  let requests = 0;
  const app = load({ fetchImpl: async (url, options) => {
    requests++;
    if (requests === 1) {
      assert.equal(url, 'blob:http://localhost:8081/selected-image');
      return { ok: true, blob: async () => new Blob(['image'], { type: 'image/jpeg' }) };
    }
    assert.equal(url, 'https://food-detector-api.onrender.com/predict');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers, undefined);
    assert.ok(options.body instanceof FormData);
    return { ok: true, json: async () => response };
  } });
  assert.deepEqual(await app.analyze('blob:http://localhost:8081/selected-image'), response);
  assert.equal(app.files(), 0);
});

for (const platform of ['android', 'ios']) {
  test(`${platform} preserves native multipart File upload`, async () => {
    const app = load({ platform, fetchImpl: () => assert.fail('native path must use File.upload'),
      upload: async (uri, url, options) => {
        assert.equal(uri, 'file:///cache/meal.jpg');
        assert.equal(url, 'https://food-detector-api.onrender.com/predict');
        assert.equal(options.fieldName, 'file');
        assert.equal(options.uploadType, 'multipart');
        return { status: 200, body: JSON.stringify(response) };
      } });
    assert.deepEqual(JSON.parse(JSON.stringify(await app.analyze('file:///cache/meal.jpg'))), response);
    assert.equal(app.files(), 1);
  });
}

test('failed image read, HTTP failure and malformed result never produce detections', async () => {
  for (const kind of ['read', 'http', 'malformed']) {
    let requests = 0;
    const app = load({ fetchImpl: async () => {
      if (++requests === 1) return { ok: kind !== 'read', blob: async () => new Blob(['image']) };
      return { ok: kind !== 'http', status: 503, json: async () => ({ success: true }) };
    } });
    const result = await app.analyze('blob:example');
    assert.equal(result.success, false);
    assert.equal(result.detections.length, 0);
    assert.equal(app.timers(), 0);
  }
});

test('web timeout returns a useful error and clears its timer', async () => {
  const app = load({ immediateAbort: true, fetchImpl: async (_, options) => {
    assert.equal(options.signal.aborted, true);
    throw Object.assign(new Error('aborted'), { name: 'AbortError' });
  } });
  const result = await app.analyze('blob:example');
  assert.equal(result.success, false);
  assert.match(result.error, /too long/);
  assert.equal(app.timers(), 0);
});
