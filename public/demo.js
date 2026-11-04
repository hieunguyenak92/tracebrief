// Synthetic data only. These deliberately fake markers exercise the omission boundary.
const ORIGIN = 'https://demo-shop.example';
const BASE = Date.parse('2026-10-28T10:00:00.000Z');
const specs = [
  ['GET', '/', 200, 0, 170, 3250, 'text/html'],
  ['GET', '/assets/main.css', 200, 60, 90, 4840, 'text/css'],
  ['GET', '/assets/main.js', 200, 70, 320, 86420, 'application/javascript'],
  ['GET', '/api/session?access_token=FAKE_QUERY_SECRET', 200, 420, 180, 840, 'application/json'],
  ['GET', '/api/products?customer=FAKE_EMAIL@example.test', 200, 600, 1460, 14800, 'application/json'],
  ['GET', '/api/products?page=2', 200, 700, 1540, 12900, 'application/json'],
  ['POST', '/api/checkout/customer-FAKE_PATH_SECRET', 401, 2300, 290, 310, 'application/json'],
  ['POST', '/api/checkout/customer-FAKE_PATH_SECRET', 500, 2800, 1840, 192, 'application/json'],
  ['GET', '/api/orders', 0, 4700, 250, -1, 'application/json'],
  ['GET', 'https://static.example/assets/hero.webp', 200, 650, 1180, 132480, 'image/webp'],
  ['GET', '/api/session?access_token=FAKE_SECOND_QUERY', 200, 5100, 160, 840, 'application/json'],
  ['GET', '/api/health', 200, 5400, 95, 42, 'application/json']
];

export const DEMO_HAR = {
  log: {
    version: '1.2', creator: { name: 'Synthetic Tracebrief demo', version: '1.0' },
    _privateNote: 'FAKE_CUSTOM_SECRET',
    entries: specs.map(([method, path, status, start, time, bytes, mimeType]) => ({
      startedDateTime: new Date(BASE + start).toISOString(), time,
      request: {
        method, url: path.startsWith('https:') ? path : `${ORIGIN}${path}`,
        httpVersion: 'HTTP/2', headers: [{ name: 'Authorization', value: 'Bearer FAKE_HEADER_SECRET' }],
        cookies: [{ name: 'session', value: 'FAKE_COOKIE_SECRET' }], queryString: [],
        ...(method === 'POST' ? { postData: { mimeType: 'application/json', text: '{"password":"FAKE_BODY_SECRET"}' } } : {}),
        headersSize: -1, bodySize: method === 'POST' ? 40 : 0
      },
      response: {
        status, statusText: status >= 400 ? 'Synthetic failure' : 'OK', httpVersion: 'HTTP/2',
        headers: [{ name: 'Set-Cookie', value: 'FAKE_RESPONSE_COOKIE' }], cookies: [],
        content: { size: bytes, mimeType, text: '{"customer":"FAKE_RESPONSE_SECRET"}' },
        bodySize: bytes, headersSize: -1, redirectURL: ''
      },
      cache: {}, timings: { blocked: 0, dns: 0, connect: 0, send: 2, wait: Math.max(0, time - 22), receive: 20 },
      _securityDetails: { note: 'FAKE_EXTENSION_SECRET' }
    }))
  }
};
