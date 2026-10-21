// Profile sign-out behavior in the in-app popup; auth and navigation are mocked.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/app/(mother)/profile.tsx'), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText;

function load({ logoutError = null } = {}) {
  const calls = { logout: 0, replace: [] };
  const hookState = [];
  let hookIndex = 0;
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.length > 1 ? children : children[0] } }),
    useState(initial) {
      const index = hookIndex++;
      if (!(index in hookState)) hookState[index] = initial;
      return [hookState[index], (value) => { hookState[index] = typeof value === 'function' ? value(hookState[index]) : value; }];
    },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === 'react') return React;
      if (name === 'react-native') return { View: 'View', Text: 'Text', ScrollView: 'ScrollView', TouchableOpacity: 'TouchableOpacity', Modal: 'Modal' };
      if (name === 'expo-router') return { useRouter: () => ({ replace: (route) => calls.replace.push(route) }) };
      if (name === 'lucide-react-native') return new Proxy({}, { get: () => 'Icon' });
      if (name === '../../context/AuthContext') return { useAuth: () => ({ user: null, logout: async () => { calls.logout++; if (logoutError) throw logoutError; } }) };
      throw new Error(`Unexpected import: ${name}`);
    },
  }, { filename: 'profile.js' });
  const render = () => { hookIndex = 0; return exports.default(); };
  const childrenOf = (node) => {
    const children = node?.props?.children;
    return Array.isArray(children) ? children : [children];
  };
  const find = (node, predicate) => {
    if (!node || typeof node !== 'object') return null;
    if (predicate(node)) return node;
    for (const child of childrenOf(node)) {
      const result = find(child, predicate);
      if (result) return result;
    }
    return null;
  };
  const textOf = (node) => {
    if (node == null || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    return childrenOf(node).map(textOf).join('');
  };
  const findAction = (root, label) => find(root, (node) => node.type === 'TouchableOpacity' && textOf(node) === label);
  return {
    calls,
    render,
    find,
    findAction,
    pressSignOut: () => {
      const tree = render();
      const profileButton = findAction(tree, 'Sign Out');
      assert.ok(profileButton, 'profile sign-out button exists');
      profileButton.props.onPress();
      const popup = render();
      const modal = find(popup, (node) => node.type === 'Modal');
      assert.ok(modal?.props.visible, 'in-app popup is visible');
      return modal;
    },
  };
}

test('profile sign-out opens an in-app popup and confirmation routes to login', async () => {
  const app = load();
  const modal = app.pressSignOut();
  assert.ok(app.findAction(modal, 'Cancel'));
  app.findAction(modal, 'Sign Out').props.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(app.calls.logout, 1);
  assert.deepEqual(app.calls.replace, ['/login']);
});

test('canceling the in-app popup keeps the session active', () => {
  const app = load();
  const modal = app.pressSignOut();
  app.findAction(modal, 'Cancel').props.onPress();
  assert.equal(app.calls.logout, 0);
  assert.deepEqual(app.calls.replace, []);
  assert.doesNotMatch(source, /window\.(confirm|alert)/, 'logout must not use browser-native prompts');
});

test('failed sign-out displays an in-app error popup and does not navigate', async () => {
  const app = load({ logoutError: 'Sign-out request failed' });
  const modal = app.pressSignOut();
  app.findAction(modal, 'Sign Out').props.onPress();
  await new Promise((resolve) => setImmediate(resolve));
  const errorModal = app.render();
  assert.equal(app.calls.logout, 1);
  assert.deepEqual(app.calls.replace, []);
  assert.match(JSON.stringify(errorModal, (_key, value) => typeof value === 'function' ? '[function]' : value), /Could not sign out/);
  assert.ok(app.findAction(errorModal, 'Close'));
});
