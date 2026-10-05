const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function evaluate(filename, dependencies) {
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  runInNewContext(code, {
    exports,
    require: (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name]();
    },
    __DEV__: true,
    console,
  }, { filename });
  return exports;
}

function loadAdapter({ expoGo = true, platform = 'android', granted = true } = {}) {
  const calls = { imports: 0, handlers: 0, channels: [], prompts: 0, scheduled: [], alerts: [] };
  const expo = { isRunningInExpoGo: () => expoGo };
  const guard = evaluate(path.join(process.cwd(), 'node_modules/expo-notifications/src/warnOfExpoGoPushUsage.ts'), {
    expo: () => expo,
    'expo-modules-core': () => ({ Platform: { OS: platform } }),
  });
  const adapter = evaluate(path.join(process.cwd(), 'src/data/notifications.native.ts'), {
    expo: () => expo,
    'react-native': () => ({
      Platform: { OS: platform },
      Alert: { alert: (...args) => calls.alerts.push(args) },
    }),
    'expo-notifications': () => {
      calls.imports++;
      guard.warnOfExpoGoPushUsage();
      return {
        setNotificationHandler: () => { calls.handlers++; },
        AndroidImportance: { HIGH: 4 },
        setNotificationChannelAsync: async (...args) => calls.channels.push(args),
        requestPermissionsAsync: async () => { calls.prompts++; return { granted }; },
        getPermissionsAsync: async () => ({ granted }),
        scheduleNotificationAsync: async (notification) => calls.scheduled.push(notification),
      };
    },
  });
  return { adapter, calls };
}

test('loading queue notifications in Android Expo Go avoids the unsupported push import', () => {
  const { adapter, calls } = loadAdapter();
  assert.equal(typeof adapter.notifyTurn, 'function');
  assert.equal(calls.imports, 0);
});

for (const platform of ['android', 'ios']) {
  test(`${platform} Expo Go can enable and deliver a turn alert without loading push code`, async () => {
    const { adapter, calls } = loadAdapter({ platform });
    assert.equal(await adapter.requestTurnAlerts(), true);
    await adapter.notifyTurn('Your turn', 'Go to Window 1.');
    assert.deepEqual(calls.alerts, [['Your turn', 'Go to Window 1.']]);
    assert.equal(calls.imports, 0);
    assert.equal(calls.prompts, 0);
  });
}

test('a restored alert preference can deliver in Expo Go without requesting permission again', async () => {
  const { adapter, calls } = loadAdapter();
  await adapter.notifyTurn('Almost your turn', 'Please stay nearby.');
  assert.equal(calls.alerts.length, 1);
  assert.equal(calls.imports, 0);
});

test('Android development builds initialize once on demand and use the queue channel', async () => {
  const { adapter, calls } = loadAdapter({ expoGo: false });
  assert.equal(calls.imports, 0);
  assert.equal(await adapter.requestTurnAlerts(), true);
  await Promise.all([adapter.notifyTurn('Your turn', 'Window 1'), adapter.notifyTurn('Your turn', 'Window 2')]);
  assert.equal(calls.imports, 1);
  assert.equal(calls.handlers, 1);
  assert.equal(calls.channels.length, 1);
  assert.equal(calls.channels[0][0], 'queue-turns');
  assert.equal(calls.scheduled.length, 2);
  assert.equal(calls.scheduled[0].trigger.channelId, 'queue-turns');
  assert.equal(calls.alerts.length, 0);
});

test('denied system permission prevents notification delivery in a development build', async () => {
  const { adapter, calls } = loadAdapter({ expoGo: false, granted: false });
  assert.equal(await adapter.requestTurnAlerts(), false);
  await adapter.notifyTurn('Your turn', 'Window 1');
  assert.equal(calls.scheduled.length, 0);
});

test('iOS development builds deliver without an Android channel', async () => {
  const { adapter, calls } = loadAdapter({ expoGo: false, platform: 'ios' });
  await adapter.notifyTurn('Your turn', 'Window 1');
  assert.equal(calls.channels.length, 0);
  assert.equal(calls.scheduled.length, 1);
  assert.equal(calls.scheduled[0].trigger, null);
});
