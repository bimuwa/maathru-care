const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const payload = Object.fromEntries(['age', 'no_of_pregnancy', 'gestation_in_previous_pregnancy', 'bmi',
  'hdl', 'family_history', 'unexplained_prenatal_loss', 'large_child_or_birth_default', 'pcos',
  'sys_bp', 'dia_bp', 'ogtt', 'hemoglobin', 'sedentary_lifestyle', 'prediabetes'].map(name => [name, 1]));
function load(fetch) {
  const exports = {};
  let timer = 0;
  let timeout;
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/gdmRiskService.ts'), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { exports, require: () => ({ supabase: {} }), process: { env: {} }, fetch,
    AbortController, TypeError, console: { error() {} },
    setTimeout: (_, ms) => { timer++; timeout = ms; return 1; }, clearTimeout: () => { timer = 0; } });
  return { service: exports.gdmRiskService, timer: () => timer, timeout: () => timeout };
}
test('legacy payload, real response probability and cold-start timeout', async () => {
  const app = load(async (url, options) => {
    assert.equal(url, 'https://food-detector-api.onrender.com/predict-diabetes');
    assert.deepEqual(JSON.parse(options.body), payload);
    return { ok: true, json: async () => ({ success: true, diabetes_risk: false, risk_percentage: 8, risk_level: 'Low Risk' }) };
  });
  assert.equal((await app.service.assessRisk(payload)).probability, 0.08);
  assert.equal(app.timeout(), 90000);
  assert.equal(app.timer(), 0);
});
test('malformed results never fabricate probabilities', async () => {
  for (const result of [{ success: false }, { success: true, diabetes_risk: false }, {}, { prediction: 0 }]) {
    const app = load(async () => ({ ok: true, json: async () => result }));
    await assert.rejects(app.service.assessRisk(payload), /invalid result/);
    assert.equal(app.timer(), 0);
  }
});
test('incomplete or invalid clinical profiles stop before inference', async () => {
  let calls = 0;
  const app = load(async () => { calls++; return { ok: true, json: async () => ({}) }; });
  const missingBmi = { ...payload, bmi: null };
  await assert.rejects(app.service.assessRisk(missingBmi), /Incomplete clinical profile.*bmi/);
  await assert.rejects(app.service.assessRisk({ ...payload, age: Number.NaN }), /Incomplete clinical profile.*age/);
  await assert.rejects(app.service.assessRisk({ ...payload, pcos: 2 }), /Invalid clinical profile values.*pcos/);
  assert.equal(calls, 0);
});
test('HTTP failures keep useful messages and clear timeout', async () => {
  for (const status of [422, 500, 503]) {
    const app = load(async () => ({ ok: false, status }));
    await assert.rejects(app.service.assessRisk(payload));
    assert.equal(app.timer(), 0);
  }
});
test('connection failure clears timeout', async () => {
  const app = load(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(app.service.assessRisk(payload), /Unable to connect/);
  assert.equal(app.timer(), 0);
});
