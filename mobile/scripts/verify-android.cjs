const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
const env = { ...process.env };
env.JAVA_HOME ||= 'C:/Program Files/Android/Android Studio/jbr';
if (!env.ANDROID_HOME && env.LOCALAPPDATA) env.ANDROID_HOME = join(env.LOCALAPPDATA, 'Android', 'Sdk');
const result = spawnSync(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['connectedDebugAndroidTest'], {
  cwd: join(__dirname, '..', 'android'), env, stdio: 'inherit', shell: process.platform === 'win32',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
