import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
let checked = 0;
for (const folder of ['bin', 'scripts', 'public', 'test']) {
  for (const file of await readdir(resolve(root, folder))) {
    if (!file.endsWith('.js')) continue;
    const check = spawnSync(process.execPath, ['--check', resolve(root, folder, file)], { encoding: 'utf8' });
    if (check.status !== 0) { process.stderr.write(check.stderr); process.exit(1); }
    checked++;
  }
}
const html = await readFile(resolve(root, 'public/index.html'), 'utf8');
if (/(?:src|href)=["'](?:https?:)?\/\//i.test(html)) throw new Error('Remote asset/link added; verify offline privacy policy before changing this check.');
for (const file of ['public/app.js', 'public/core.js']) {
  const text = await readFile(resolve(root, file), 'utf8');
  if (/\b(?:fetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage)\b/.test(text)) throw new Error(`Network/persistence API in ${file}; requires explicit review.`);
}
console.log(`Syntax checked ${checked} JavaScript files; offline asset and persistence policy passed.`);
