const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadApi(profile) {
  const exports = {};
  let signupArgs;
  const supabase = {
    auth: { signUp: async (args) => { signupArgs = args; return { data: { session: { access_token: 'test-token' }, user: { id: 'auth-id', email: args.email } }, error: null }; } },
    from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: profile, error: null }) }),
  };
  const gdmModule = {};
  const helperSource = fs.readFileSync(path.join(__dirname, '../src/types/gdmV4.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: gdmModule });
  const source = fs.readFileSync(path.join(__dirname, '../src/services/api.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mockedRequire = (id) => id === 'react-native' ? { Platform: { select: (options) => options.web } }
    : id === '../lib/supabase' ? { supabase }
      : id === '../types/gdmV4' ? gdmModule
        : {};
  vm.runInNewContext(code, { exports, require: mockedRequire, process: { env: {} }, setTimeout: () => 1, clearTimeout() {} });
  return { api: exports.api, getSignupArgs: () => signupArgs, toGdmV4Binary: gdmModule.toGdmV4Binary };
}

const profile = { id: 'profile-id', email: 'mother@example.test', role: 'mother', full_name: 'Test Mother', phone: '0710000000', age: 31, gestational_week: 20, blood_group: 'A+', approval_status: 'not_required' };

test('GDM V4 Yes/No encoding preserves unknown and maps explicit answers', () => {
  const { toGdmV4Binary } = loadApi(profile);
  assert.equal(toGdmV4Binary(true), 1);
  assert.equal(toGdmV4Binary(false), 0);
  assert.equal(toGdmV4Binary(null), null);
  assert.equal(toGdmV4Binary('yes'), 1);
  assert.equal(toGdmV4Binary('no'), 0);
  assert.equal(toGdmV4Binary('not_sure'), null);
});

test('mother signup metadata contains the five GDM V4 profile values and no old questionnaire values', async () => {
  const loaded = loadApi(profile);
  await loaded.api.register({ role: 'mother', fullName: 'Test Mother', email: 'mother@example.test', password: 'test-password', phone: '0710000000', age: '31', bloodGroup: 'A+', gestationalWeek: '20', gravida: '2', familyHistory: true, unexplainedPrenatalLoss: false, sedentaryLifestyle: true });
  const metadata = loaded.getSignupArgs().options.data;
  assert.deepEqual({ age: metadata.age, no_of_pregnancy: metadata.no_of_pregnancy, family_history: metadata.family_history, unexplained_prenatal_loss: metadata.unexplained_prenatal_loss, sedentary_lifestyle: metadata.sedentary_lifestyle }, { age: 31, no_of_pregnancy: 2, family_history: 1, unexplained_prenatal_loss: 0, sedentary_lifestyle: 1 });
  for (const oldField of ['bmi', 'hdl', 'gestation_in_previous_pregnancy', 'sys_bp', 'dia_bp', 'ogtt', 'hemoglobin', 'large_child_or_birth_default', 'pcos', 'prediabetes']) assert.equal(oldField in metadata, false);
});

test('doctor signup payload stays unchanged by the mother GDM fields', async () => {
  const loaded = loadApi({ ...profile, role: 'doctor', full_name: 'Test Doctor', approval_status: 'pending' });
  await loaded.api.register({ role: 'doctor', fullName: 'Test Doctor', email: 'doctor@example.test', password: 'test-password', phone: '0710000000', medicalLicense: 'TEST-1', specialty: 'Gynaecology', hospital: 'Test Hospital' });
  const metadata = loaded.getSignupArgs().options.data;
  assert.equal(metadata.role, 'doctor');
  assert.equal(metadata.medical_license, 'TEST-1');
  assert.equal('no_of_pregnancy' in metadata, false);
  assert.equal('family_history' in metadata, false);
});
