/** Tracebrief's export boundary. Never copy a HAR object into a report. */
export const VERSION = '0.1.0';
export const MAX_INPUT_BYTES = 50 * 1024 * 1024;
export const MAX_ENTRIES = 20_000;
const MAX_METRIC = 1_000_000_000_000;
const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'CONNECT', 'TRACE']);

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function metric(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_METRIC
    ? Math.round(value * 1000) / 1000 : null;
}

function countArray(value) {
  return Array.isArray(value) ? value.length : 0;
}

function validate(har) {
  if (!record(har) || !record(har.log) || !Array.isArray(har.log.entries)) {
    throw new Error('Expected a HAR object with log.entries.');
  }
  if (har.log.entries.length > MAX_ENTRIES) {
    throw new Error('Capture exceeds the 20,000 request limit.');
  }
  if (har.log.entries.some(entry => !record(entry))) {
    throw new Error('Every HAR entry must be an object.');
  }
  return har.log.entries;
}

export function parseHar(text) {
  if (typeof text !== 'string') throw new Error('HAR input must be JSON text.');
  if (new TextEncoder().encode(text).byteLength > MAX_INPUT_BYTES) {
    throw new Error('Capture exceeds the 50 MiB input limit.');
  }
  let har;
  try { har = JSON.parse(text); }
  catch { throw new Error('Invalid JSON. Choose a HAR file exported from browser DevTools.'); }
  validate(har);
  return har;
}

function timestamp(value) {
  if (typeof value !== 'string') return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!parts) return null;
  const [, year, month, day, hour, minute, second] = parts.map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  // Date.parse normalizes some impossible calendar dates; reject them before parsing.
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mimeCategory(value) {
  if (typeof value !== 'string') return 'unknown';
  const type = value.split(';', 1)[0].trim().toLowerCase();
  if (type === 'application/json' || /^application\/[a-z0-9.+-]+\+json$/.test(type)) return 'application/json';
  if (type === 'text/html' || type === 'application/xhtml+xml') return 'text/html';
  if (type === 'text/css') return 'text/css';
  if (['application/javascript', 'text/javascript', 'application/x-javascript'].includes(type)) return 'application/javascript';
  if (/^image\/[a-z0-9.+-]+$/.test(type)) return 'image/*';
  if (/^font\/[a-z0-9.+-]+$/.test(type)) return 'font/*';
  if (/^audio\/[a-z0-9.+-]+$/.test(type)) return 'audio/*';
  if (/^video\/[a-z0-9.+-]+$/.test(type)) return 'video/*';
  if (type === 'text/plain') return 'text/plain';
  if (['application/xml', 'text/xml'].includes(type)) return 'application/xml';
  if (type === 'application/octet-stream') return 'application/octet-stream';
  return 'unknown';
}

function urlParts(value) {
  if (typeof value !== 'string') return null;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed : null;
  } catch { return null; }
}

function customFieldCount(value) {
  // Iterative traversal handles deeply nested JSON without recursion. Values are not retained.
  let count = 0;
  const stack = [value];
  while (stack.length) {
    const current = stack.pop();
    if (current === null || typeof current !== 'object') continue;
    for (const key of Object.keys(current)) {
      if (key.startsWith('_')) count++;
      if (current[key] !== null && typeof current[key] === 'object') stack.push(current[key]);
    }
  }
  return count;
}

function total(values) {
  // Null means the total cannot be established, rather than a misleading zero.
  if (values.some(value => value === null)) return null;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum > Number.MAX_SAFE_INTEGER ? null : sum;
}

/** Input strings are used only as temporary grouping keys; output contains generated aliases. */
export function analyzeHar(har) {
  const entries = validate(har);
  const reconstructed = har.log.creator?.name === 'Tracebrief' && har.log._tracebriefFormat === 1;
  const times = entries.map(entry => timestamp(entry.startedDateTime));
  let firstStart = null;
  for (const time of times) if (time !== null && (firstStart === null || time < firstStart)) firstStart = time;
  const origins = new Map();
  const routes = new Map();
  const seen = new Set();
  const privacy = {
    headers: 0, cookies: 0, queryParameters: 0, requestBodies: 0, responseBodies: 0,
    urls: 0, absoluteTimestamps: 0, customFields: customFieldCount(har)
  };
  let invalidUrls = 0;
  const requests = entries.map((entry, index) => {
    const request = record(entry.request) ? entry.request : {};
    const response = record(entry.response) ? entry.response : {};
    const timings = record(entry.timings) ? entry.timings : {};
    const content = record(response.content) ? response.content : {};
    const annotations = reconstructed && record(entry._tracebrief) ? entry._tracebrief : null;
    const url = urlParts(request.url);
    if (!url) invalidUrls++;
    // Unparseable/missing URLs are separate routes: their relationship is unknown.
    const originKey = url ? url.origin : `invalid:${index}`;
    if (!origins.has(originKey)) origins.set(originKey, `origin-${origins.size + 1}`);
    const origin = origins.get(originKey);
    const routeKey = JSON.stringify([originKey, url ? url.pathname : index]);
    if (!routes.has(routeKey)) routes.set(routeKey, `route-${routes.size + 1}`);
    const route = routes.get(routeKey);
    const method = typeof request.method === 'string' && METHODS.has(request.method.toUpperCase())
      ? request.method.toUpperCase() : 'OTHER';
    const status = annotations?.statusKnown === false ? null : Number.isInteger(response.status) && (response.status === 0 || (response.status >= 100 && response.status <= 599))
      ? response.status : null;
    const startMs = annotations ? metric(annotations.startMs) : times[index] === null || firstStart === null ? null : metric(times[index] - firstStart);
    const durationMs = metric(annotations ? annotations.durationMs : entry.time);
    // Chrome's _transferSize includes headers when available. HAR bodySize is a fallback, not decoded content.size.
    const bytes = annotations ? metric(annotations.transferredBytes) : metric(response._transferSize) ?? metric(response.bodySize);
    const duplicateKey = JSON.stringify([typeof request.method === 'string' ? request.method : null, route]);
    const duplicate = annotations && typeof annotations.repeated === 'boolean' ? annotations.repeated
      : typeof request.method === 'string' && request.method.length > 0 && seen.has(duplicateKey);
    seen.add(duplicateKey);
    privacy.headers += countArray(request.headers) + countArray(response.headers);
    privacy.cookies += countArray(request.cookies) + countArray(response.cookies);
    privacy.queryParameters += Math.max(countArray(request.queryString), url ? [...url.searchParams].length : 0);
    if (record(request.postData)) privacy.requestBodies++;
    if (typeof content.text === 'string' || typeof content.encoding === 'string') privacy.responseBodies++;
    if (typeof request.url === 'string') privacy.urls++;
    if (Object.hasOwn(entry, 'startedDateTime')) privacy.absoluteTimestamps++;
    return {
      id: index + 1, origin, route, method, status, startMs, durationMs,
      waitMs: metric(annotations ? annotations.waitMs : timings.wait), receiveMs: metric(annotations ? annotations.receiveMs : timings.receive), bytes,
      mime: mimeCategory(content.mimeType), duplicate
    };
  });
  const httpErrorCount = requests.filter(request => request.status !== null && request.status >= 400).length;
  const networkErrorCount = requests.filter(request => request.status === 0).length;
  const unknownStatusCount = requests.filter(request => request.status === null).length;
  let durationMs = requests.length ? 0 : null;
  for (const request of requests) {
    if (request.startMs === null || request.durationMs === null) { durationMs = null; break; }
    durationMs = Math.max(durationMs, request.startMs + request.durationMs);
  }
  const summary = {
    requestCount: requests.length, failedCount: httpErrorCount + networkErrorCount,
    httpErrorCount, networkErrorCount, unknownStatusCount,
    slowCount: requests.filter(request => request.durationMs !== null && request.durationMs >= 1000).length,
    duplicateCount: requests.filter(request => request.duplicate).length,
    originCount: origins.size, routeCount: routes.size, durationMs,
    transferredBytes: total(requests.map(request => request.bytes)),
    unknownSizeCount: requests.filter(request => request.bytes === null).length
  };
  const warnings = [];
  if (reconstructed) warnings.push('This is a reconstructed Tracebrief export. Unknown metrics are restored from its annotations; other HAR viewers may display placeholder values.');
  if (!requests.length) warnings.push('The capture has no requests.');
  if (invalidUrls) warnings.push(`${invalidUrls} requests have unsupported or missing HTTP(S) URLs; separate aliases were assigned.`);
  if (requests.some(request => request.startMs === null)) warnings.push('Some request start times are unknown; the complete capture span cannot be established.');
  if (requests.some(request => request.durationMs === null)) warnings.push('Some request durations are unknown.');
  if (unknownStatusCount) warnings.push(`${unknownStatusCount} requests have unknown HTTP status.`);
  if (summary.unknownSizeCount) warnings.push('Transfer size is incomplete; unknown values are not counted as zero.');
  else if (summary.transferredBytes === null) warnings.push('Aggregate transfer size exceeds the safe numeric range.');
  return { version: VERSION, summary, privacy, requests, warnings };
}

/** Deliberately separate from export data; browser UI must render these using textContent. */
export function localRequestLabels(har) {
  return validate(har).map(entry => typeof entry.request?.url === 'string' ? entry.request.url : '(URL unavailable)');
}

const LIMITATIONS = [
  'Endpoints are opaque aliases. Query differences are ignored when grouping routes; repeated requests are not necessarily redundant.',
  'Headers, cookies, queries, credentials, bodies, original URLs, wall-clock dates and custom fields are omitted. This is a reconstructed metadata artifact, not a scrubbed original or a replayable capture.',
  'Timing, sizes, status codes and traffic patterns can still be sensitive. Review the report before sharing; this is not a guarantee of anonymity or complete privacy.',
  'Slow means a recorded duration of at least 1,000 ms. HTTP errors mean status >=400; status 0 is a network failure or an aborted request. These observations do not establish a root cause.',
  'Bytes use Chrome _transferSize when valid, otherwise HAR response.bodySize. These can differ (headers versus body); unknown sizes stay unknown. MIME values are coarse fixed categories.',
  'Start offsets are relative to the earliest valid timestamp. Missing or invalid numbers remain unknown. HAR timestamps are shifted to 1970-01-01; missing starts use that fixed date with a tool annotation.',
  'Reconstructed HAR uses nonnegative phase placeholders where timings are unknown. Its total is the sum of reconstructed phases, with residual duration in blocked. Tracebrief annotations preserve the recorded metrics; other viewers may show placeholders.'
];

function show(value, suffix = '') {
  return value === null ? 'unknown' : `${value}${suffix}`;
}

export function toMarkdown(analysis) {
  const { summary: s, privacy: p, requests, warnings } = analysis;
  const lines = [
    '# Tracebrief network report', '',
    'A metadata-only performance snapshot. Endpoints are aliases; no request or response payload is included.', '',
    '## Overview', '',
    `- Requests: ${s.requestCount} across ${s.originCount} origin aliases and ${s.routeCount} route aliases`,
    `- HTTP errors: ${s.httpErrorCount}; network failures / aborted: ${s.networkErrorCount}; unknown status: ${s.unknownStatusCount}`,
    `- Slow requests (>=1,000 ms): ${s.slowCount}`,
    `- Repeated method + origin + path (query ignored): ${s.duplicateCount}`,
    `- Capture span: ${show(s.durationMs, ' ms')}; recorded transfer bytes: ${show(s.transferredBytes)}`,
    '', '## Omitted source fields', '',
    `Headers: ${p.headers}; cookies: ${p.cookies}; query parameters: ${p.queryParameters}; request bodies: ${p.requestBodies}; response bodies: ${p.responseBodies}; URLs: ${p.urls}; timestamps: ${p.absoluteTimestamps}; custom fields: ${p.customFields}.`,
    '', 'Counts describe field occurrences, not the number of secrets detected. All unlisted fields are also omitted.', '',
    '## Requests (capture order)', '',
    '| # | Origin / route | Method | Status | Start (ms) | Duration (ms) | Wait (ms) | Receive (ms) | Bytes | MIME category | Repeated |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
  ];
  for (const r of requests) lines.push(`| ${r.id} | ${r.origin} / ${r.route} | ${r.method} | ${show(r.status)} | ${show(r.startMs)} | ${show(r.durationMs)} | ${show(r.waitMs)} | ${show(r.receiveMs)} | ${show(r.bytes)} | ${r.mime} | ${r.duplicate ? 'yes' : ''} |`);
  if (warnings.length) lines.push('', '## Incomplete metadata', '', ...warnings.map(warning => `- ${warning}`));
  lines.push('', '## Interpretation and limits', '', ...LIMITATIONS.map(limit => `- ${limit}`), '', `Generated by Tracebrief ${VERSION}.`, '');
  return lines.join('\n');
}

export function toShareHar(analysis) {
  return {
    log: {
      version: '1.2', creator: { name: 'Tracebrief', version: VERSION },
      _tracebriefFormat: 1,
      comment: 'Reconstructed performance metadata. Opaque endpoints, shifted dates, no headers/cookies/queries/bodies. Not replayable. Review timing and traffic patterns before sharing.',
      entries: analysis.requests.map(r => {
        const wait = r.waitMs ?? 0;
        const receive = r.receiveMs ?? 0;
        const residual = Math.max(0, (r.durationMs ?? 0) - wait - receive);
        return {
        startedDateTime: new Date(r.startMs ?? 0).toISOString(),
        time: residual + wait + receive,
        request: {
          method: r.method, url: `https://${r.origin}.invalid/${r.route}`, httpVersion: 'unknown',
          cookies: [], headers: [], queryString: [], headersSize: -1, bodySize: -1
        },
        response: {
          status: r.status ?? 0, statusText: '', httpVersion: 'unknown', cookies: [], headers: [],
          // HAR content.size is decoded body size, which is intentionally not inferred from transfer size.
          content: { size: -1, mimeType: r.mime }, redirectURL: '', headersSize: -1, bodySize: -1
        },
        cache: {},
        timings: { blocked: residual, send: 0, wait, receive },
        _tracebrief: { id: r.id, statusKnown: r.status !== null, startKnown: r.startMs !== null,
          startMs: r.startMs, durationMs: r.durationMs, waitMs: r.waitMs, receiveMs: r.receiveMs,
          transferredBytes: r.bytes, repeated: r.duplicate }
      }; })
    }
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

/** Script-free standalone output. Escape even generated strings as defense in depth. */
export function toHtml(analysis) {
  const s = analysis.summary;
  const rows = analysis.requests.map(r => `<tr><td>${r.id}</td><td>${escapeHtml(r.origin)} / ${escapeHtml(r.route)}</td><td>${escapeHtml(r.method)}</td><td>${show(r.status)}</td><td>${show(r.startMs)}</td><td>${show(r.durationMs)}</td><td>${show(r.bytes)}</td><td>${escapeHtml(r.mime)}</td><td>${r.duplicate ? 'yes' : ''}</td></tr>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>Tracebrief network report</title>
<style>body{background:#f5f3ec;color:#252922;font:16px/1.6 system-ui,sans-serif;margin:0}main{max-width:1200px;margin:auto;padding:40px 24px}h1{font-size:38px;letter-spacing:-1px}h2{margin-top:36px}.eyebrow{color:#9b3c17;font:12px monospace;letter-spacing:2px}.metrics{display:flex;flex-wrap:wrap;gap:16px}.metrics p{border:1px solid #d5d4cb;padding:16px;min-width:140px}.metrics strong{display:block;font-size:28px}.table{overflow:auto}table{border-collapse:collapse;white-space:nowrap;width:100%;font:12px/1.6 ui-monospace,monospace}th,td{padding:10px 12px;border-bottom:1px solid #d5d4cb;text-align:left}th{background:#eae7dd}pre{white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #d5d4cb;padding:16px;font:12px/1.6 ui-monospace,monospace}li{margin-bottom:8px}footer{margin-top:36px;color:#5f655e}</style></head>
<body><main><p class="eyebrow">TRACEBRIEF / METADATA REPORT</p><h1>Network evidence, ready to review.</h1><p>Opaque endpoint aliases. Payloads, original URLs and absolute dates omitted. Timing and traffic patterns may still be sensitive.</p>
<div class="metrics"><p><strong>${s.requestCount}</strong>requests</p><p><strong>${s.failedCount}</strong>errors / failures</p><p><strong>${s.slowCount}</strong>requests ≥1 second</p><p><strong>${show(s.durationMs)}</strong>capture span (ms)</p></div>
<h2>Requests in capture order</h2><div class="table"><table><thead><tr><th>#</th><th>Origin / route</th><th>Method</th><th>Status</th><th>Start (ms)</th><th>Duration (ms)</th><th>Bytes</th><th>MIME category</th><th>Repeated</th></tr></thead><tbody>${rows}</tbody></table></div>
<h2>Omitted field occurrences</h2><pre>${escapeHtml(JSON.stringify(analysis.privacy, null, 2))}</pre><p>These counts are not detected-secret counts. All unlisted fields are also omitted.</p>
${analysis.warnings.length ? `<h2>Incomplete metadata</h2><ul>${analysis.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>` : ''}
<h2>Interpretation and limits</h2><ul>${LIMITATIONS.map(limit => `<li>${escapeHtml(limit)}</li>`).join('')}</ul><footer>Generated by Tracebrief ${VERSION}. No external resources or scripts.</footer></main></body></html>`;
}
