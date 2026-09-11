const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT ||
  (process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'Android', 'Sdk'));
const adb = sdk ? join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb') : 'adb';
for (const port of [8082, 5175]) {
  execFileSync(adb, ['reverse', `tcp:${port}`, `tcp:${port}`], { stdio: 'inherit' });
}
console.log('Android connecté à Metro (8082) et à Sticker Studio (5175).');
