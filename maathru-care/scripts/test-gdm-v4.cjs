const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const payload = { age: 22, no_of_pregnancy: 1, family_history: 0, unexplained_prenatal_loss: 0, sedentary_lifestyle: 0 };
const result = { success: true, model_version: 'gdm-v4-conservative-rf', research_only: true, model_score: 0.002,
  threshold: 0.3, screen_positive: false, disclaimer: 'Research prototype only. This is not a GDM diagnosis.' };

function load(fetch, env = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/services/gdmV4ResearchService.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  let activeTimers = 0;
  vm.runInNewContext(code, { exports, process: { env }, fetch, AbortController, setTimeout: () => { activeTimers++; return 1; },
    clearTimeout: () => { activeTimers = 0; } });
  return { service: exports.gdmV4ResearchService, timers: () => activeTimers };
}

test('deployed URL, exact payload and key-free response', async () => {
  let sent;
  const app = load(async (url, options) => { sent = { url, options }; return { ok: true, json: async () => result }; });
  assert.deepEqual(await app.service.predictScreening(payload), result);
  assert.equal(sent.url, 'https://food-detector-api.onrender.com/research/gdm/v4/predict');
  assert.equal(sent.options.headers['X-Research-Key'], undefined);
  assert.equal(sent.options.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(sent.options.body), payload);
  assert.equal(app.timers(), 0);
});

test('configured API URL', async () => {
  const app = load(async url => { assert.equal(url, 'https://configured.example/research/gdm/v4/predict'); return { ok: true, json: async () => result }; },
    { EXPO_PUBLIC_GDM_V4_API_URL: 'https://configured.example/research/gdm/v4/predict' });
  await app.service.predictScreening(payload);
});

test('invalid values never submit', async () => {
  const app = load(() => { throw new Error('fetch must not run'); });
  for (const invalid of [{ ...payload, age: Infinity }, { ...payload, no_of_pregnancy: 1.5 }, { ...payload, family_history: 'not_sure' }, { ...payload, family_history: null }]) {
    await assert.rejects(app.service.predictScreening(invalid));
  }
});

for (const status of [401, 403, 404, 422, 500, 503]) {
  test(`HTTP ${status} raises structured error without result`, async () => {
    const app = load(async () => ({ ok: false, status, json: async () => ({ detail: [{ msg: 'invalid' }] }) }));
    await assert.rejects(app.service.predictScreening(payload), err => err.statusCode === status && typeof err.message === 'string');
    assert.equal(app.timers(), 0);
  });
}

test('malformed and inconsistent results are rejected', async () => {
  for (const bad of [{}, { ...result, research_only: false }, { ...result, model_score: 2 }, { ...result, threshold: 0 }, { ...result, screen_positive: true }]) {
    const app = load(async () => ({ ok: true, json: async () => bad }));
    await assert.rejects(app.service.predictScreening(payload), /Malformed/);
    assert.equal(app.timers(), 0);
  }
});

test('timeout and connection failure clean up timers and do not retry automatically', async () => {
  for (const error of [Object.assign(new Error('aborted'), { name: 'AbortError' }), new Error('offline')]) {
    let calls = 0;
    const app = load(async () => { calls++; throw error; });
    await assert.rejects(app.service.predictScreening(payload));
    assert.equal(calls, 1);
    assert.equal(app.timers(), 0);
  }
});
