const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const root = join(__dirname, '..');
const frontend = join(root, '..', 'Frontend');
execFileSync(process.execPath, [join(frontend, 'node_modules/typescript/bin/tsc'), '-b'], { cwd: frontend, stdio: 'inherit' });
execFileSync(process.execPath, [join(frontend, 'node_modules/vite/bin/vite.js'), 'build', '--mode', 'production', '--outDir', 'dist-mobile'], { cwd: frontend, stdio: 'inherit' });
execFileSync(process.execPath, [join(root, 'node_modules/@capacitor/cli/bin/capacitor'), 'sync', 'android'], { cwd: root, stdio: 'inherit' });
