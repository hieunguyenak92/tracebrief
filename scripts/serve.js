import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/core.js', ['core.js', 'text/javascript; charset=utf-8']],
  ['/demo.js', ['demo.js', 'text/javascript; charset=utf-8']],
  ['/samples/demo.har', ['samples/demo.har', 'application/json; charset=utf-8']]
]);
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid port number.');
const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
  const asset = assets.get(request.url?.split('?')[0]);
  if (!asset) { response.writeHead(404); response.end('Not found'); return; }
  try {
    const body = await readFile(resolve(root, asset[0]));
    response.writeHead(200, {
      'Content-Type': asset[1], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; worker-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch { response.writeHead(500); response.end('Could not load application asset'); }
});
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? 'Port is in use. Set PORT to another port.' : 'Could not start local server.'); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`Tracebrief: http://127.0.0.1:${port} (loopback only)`));
