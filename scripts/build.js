import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFile(resolve(root, path), 'utf8');
const [html, css, app, core, demo] = await Promise.all([
  read('public/index.html'), read('public/styles.css'), read('public/app.js'), read('public/core.js'), read('public/demo.js')
]);

// Deliberately tiny bundler for these three dependency-free modules. Reject imports left over.
const appBody = app.replace(/^import\s+[\s\S]*?\s+from\s+['"]\.\/(core|demo)\.js['"];?\s*/gm, '');
if (/^\s*import\s/m.test(appBody)) throw new Error('Unexpected app import; update the offline bundler explicitly.');
const script = [core, demo, appBody].join('\n\n').replace(/<\/script/gi, '<\\/script');
let output = html.replace(/<link\b[^>]*href=["']\.\/?styles\.css["'][^>]*>/, `<style>${css}</style>`);
output = output.replace(/<script\b[^>]*src=["']\.\/?app\.js["'][^>]*><\/script>/, `<script type="module">${script}</script>`);
if (output === html || /(?:src|href)=["']\.\/?(?:app\.js|styles\.css)["']/.test(output)) throw new Error('Failed to inline application assets.');
await mkdir(resolve(root, 'dist'), { recursive: true });
await writeFile(resolve(root, 'dist/index.html'), output);
// A generated root copy also supports GitHub Pages' branch/root publishing mode.
await writeFile(resolve(root, 'index.html'), output);
console.log(`Built dist/index.html and index.html (${Buffer.byteLength(output)} bytes each). Open either file directly to use offline.`);
