import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ENTRIES,
  MAX_INPUT_BYTES,
  VERSION,
  analyzeHar,
  localRequestLabels,
  parseHar,
  toHtml,
  toMarkdown,
  toShareHar,
} from '../public/core.js';

const SENTINEL = 'TRACEBRIEF_PRIVATE_SENTINEL_7f3b9';
const PRIVATE_ORIGIN = 'private-customer.internal';
const PRIVATE_PATH = '/customers/private-project';
const START = '2026-10-31T10:15:30.000Z';

function entry(overrides = {}) {
  const base = {
    startedDateTime: START,
    time: 1200,
    comment: SENTINEL,
    _initiator: { stack: { description: SENTINEL } },
    request: {
      method: 'GET',
      url: `https://${PRIVATE_ORIGIN}${PRIVATE_PATH}?token=${SENTINEL}`,
      httpVersion: 'HTTP/2',
      headers: [{ name: `X-${SENTINEL}`, value: SENTINEL }],
      cookies: [{ name: SENTINEL, value: SENTINEL }],
      queryString: [{ name: 'token', value: SENTINEL }],
      postData: {
        mimeType: 'application/json',
        text: `{"password":"${SENTINEL}"}`,
        params: [{ name: SENTINEL, value: SENTINEL, fileName: SENTINEL }],
      },
      headersSize: -1,
      bodySize: 0,
      _private: SENTINEL,
    },
    response: {
      status: 200,
      statusText: SENTINEL,
      httpVersion: SENTINEL,
      headers: [{ name: 'Set-Cookie', value: SENTINEL }],
      cookies: [{ name: SENTINEL, value: SENTINEL }],
      content: {
        size: 500,
        mimeType: 'application/json',
        text: `<script>${SENTINEL}</script>`,
        encoding: SENTINEL,
        _private: SENTINEL,
      },
      redirectURL: `https://${SENTINEL}.invalid/`,
      headersSize: 100,
      bodySize: 250,
      _private: SENTINEL,
    },
    cache: { beforeRequest: { comment: SENTINEL } },
    timings: { blocked: 10, dns: 20, connect: 100, ssl: 60, send: 20, wait: 900, receive: 50, comment: SENTINEL },
    serverIPAddress: SENTINEL,
    connection: SENTINEL,
  };
  return { ...base, ...overrides };
}

function capture(entries = [entry()]) {
  return {
    log: {
      version: '1.2',
      creator: { name: SENTINEL, version: SENTINEL },
      browser: { name: SENTINEL, version: SENTINEL },
      comment: SENTINEL,
      pages: [{ id: SENTINEL, title: SENTINEL, startedDateTime: START, pageTimings: { onLoad: 1500 } }],
      entries,
      _private: { nested: SENTINEL },
    },
    arbitraryUnknownField: SENTINEL,
  };
}

function summaryFixture() {
  const first = entry();
  const second = entry({
    startedDateTime: '2026-10-31T10:15:30.010Z',
    time: 100,
    request: { ...first.request, url: `https://${PRIVATE_ORIGIN}${PRIVATE_PATH}?other=${SENTINEL}#private-fragment` },
    response: { ...first.response, status: 500, bodySize: 300 },
    timings: { send: 10, wait: 70, receive: 10 },
  });
  const third = entry({
    startedDateTime: '2026-10-31T10:15:30.020Z',
    time: 50,
    request: { ...first.request, method: 'POST' },
    response: { ...first.response, status: 0, bodySize: -1 },
    timings: { send: 0, wait: -1, receive: -1 },
  });
  const fourth = entry({
    startedDateTime: `invalid-${SENTINEL}`,
    time: undefined,
    request: { ...first.request, method: SENTINEL, url: `https://another.internal/${SENTINEL}` },
    response: { ...first.response, status: undefined, bodySize: '18', content: { mimeType: `text/${SENTINEL}`, text: SENTINEL } },
    timings: {},
  });
  const fifth = entry({
    startedDateTime: '2026-10-31T10:15:30.050Z',
    time: 1000,
    request: { ...first.request, url: `https://another.internal/${SENTINEL}` },
    response: { ...first.response, status: 429, bodySize: 0 },
    timings: { send: 0, wait: 1, receive: 1 },
  });
  return capture([first, second, third, fourth, fifth]);
}

function assertNoOriginalStrings(value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  for (const secret of [SENTINEL, PRIVATE_ORIGIN, PRIVATE_PATH, START, 'another.internal', 'private-fragment']) {
    assert.equal(serialized.includes(secret), false, `Original value leaked: ${secret}`);
  }
}

function assertContentFreeError(action) {
  assert.throws(action, (error) => {
    assert.ok(error instanceof Error);
    assert.ok(error.message.length > 0);
    assert.ok(error.message.length < 500);
    assertNoOriginalStrings(error.message);
    return true;
  });
}

test('public constants and valid parsing match the release contract', () => {
  assert.equal(MAX_INPUT_BYTES, 50 * 1024 * 1024);
  assert.equal(MAX_ENTRIES, 20000);
  assert.equal(VERSION, '0.1.0');
  const input = capture();
  assert.deepEqual(parseHar(JSON.stringify(input)), input);
});

test('counts distinguish HTTP errors, network failures, unknowns and repeated endpoints', () => {
  const result = analyzeHar(summaryFixture());
  assert.equal(result.version, VERSION);
  assert.deepEqual(result.summary, {
    requestCount: 5,
    failedCount: 3,
    httpErrorCount: 2,
    networkErrorCount: 1,
    unknownStatusCount: 1,
    slowCount: 2,
    duplicateCount: 1,
    originCount: 2,
    routeCount: 2,
    durationMs: null,
    transferredBytes: null,
    unknownSizeCount: 2,
  });
  assert.deepEqual(result.requests.map((item) => item.startMs), [0, 10, 20, null, 50]);
  assert.deepEqual(result.requests.map((item) => item.durationMs), [1200, 100, 50, null, 1000]);
  assert.deepEqual(result.requests.map((item) => item.waitMs), [900, 70, null, null, 1]);
  assert.deepEqual(result.requests.map((item) => item.bytes), [250, 300, null, null, 0]);
  assert.equal(result.requests[3].method, 'OTHER');
  assert.ok(result.warnings.length > 0);
});

test('aliases preserve endpoint groups across query changes without exposing endpoints', () => {
  const result = analyzeHar(summaryFixture());
  const [first, second, post, fourth, fifth] = result.requests;
  assert.equal(first.origin, second.origin);
  assert.equal(first.route, second.route);
  assert.equal(first.route, post.route);
  assert.equal(fourth.route, fifth.route);
  assert.notEqual(first.origin, fourth.origin);
  assert.equal(second.duplicate, true);
  for (const request of result.requests) {
    assert.match(request.origin, /^origin-\d+$/);
    assert.match(request.route, /^route-\d+$/);
  }
  assertNoOriginalStrings(result);
});

test('duplicateCount counts extra requests and respects method, origin and path', () => {
  const base = entry();
  const input = capture([
    base,
    entry({ request: { ...base.request, url: `https://${PRIVATE_ORIGIN}${PRIVATE_PATH}?a=2` } }),
    entry({ request: { ...base.request, url: `https://${PRIVATE_ORIGIN}${PRIVATE_PATH}?a=3` } }),
    entry({ request: { ...base.request, method: 'HEAD' } }),
    entry({ request: { ...base.request, url: `https://other.invalid${PRIVATE_PATH}` } }),
    entry({ request: { ...base.request, url: `https://${PRIVATE_ORIGIN}/different` } }),
  ]);
  const result = analyzeHar(input);
  assert.equal(result.summary.duplicateCount, 2);
  assert.equal(result.summary.originCount, 2);
  assert.equal(result.summary.routeCount, 3);
});

test('different extension HTTP methods are not merged just because both display OTHER', () => {
  const base = entry();
  const result = analyzeHar(capture(['PROPFIND', 'MKCOL', 'PROPFIND'].map(method => entry({
    request: { ...base.request, method },
  }))));
  assert.deepEqual(result.requests.map(request => request.method), ['OTHER', 'OTHER', 'OTHER']);
  assert.equal(result.summary.duplicateCount, 1);
});

test('all report formats project permitted metadata and omit nested input strings', () => {
  const analysis = analyzeHar(summaryFixture());
  const report = toMarkdown(analysis);
  const html = toHtml(analysis);
  const har = toShareHar(analysis);
  for (const output of [analysis, report, html, har]) assertNoOriginalStrings(output);
  assert.match(report, /(?:limit|interpret|review)/i);
  assert.match(report, /(?:sensitive|privacy)/i);
  assert.match(html, /<!doctype html>/i);
  assert.doesNotMatch(html, /<script\b/i);
  assert.doesNotMatch(html, /<(?:iframe|img)\b/i);
  assert.doesNotMatch(html, /<link\b[^>]*\bhref\s*=/i);
});

test('privacy inventory reports omitted data categories without including field values', () => {
  const { privacy } = analyzeHar(capture());
  for (const category of [
    'headers', 'cookies', 'queryParameters', 'requestBodies', 'responseBodies',
    'urls', 'absoluteTimestamps', 'customFields',
  ]) {
    assert.equal(typeof privacy[category], 'number', `Missing numeric category ${category}`);
    assert.ok(privacy[category] > 0, `Expected omitted ${category}`);
  }
  assertNoOriginalStrings(privacy);
});

test('share HAR is reconstructed, uses relative epoch dates, and omits payload structures', () => {
  const analysis = analyzeHar(summaryFixture());
  const output = toShareHar(analysis);
  assert.equal(output.log.version, '1.2');
  assert.equal(output.log.entries.length, 5);
  for (const record of output.log.entries) {
    assert.match(record.request.url, /^https:\/\/origin-\d+\.invalid\/route-\d+$/);
    assert.deepEqual(record.request.headers, []);
    assert.deepEqual(record.request.cookies, []);
    assert.deepEqual(record.request.queryString, []);
    assert.equal(Object.hasOwn(record.request, 'postData'), false);
    assert.deepEqual(record.response.headers, []);
    assert.deepEqual(record.response.cookies, []);
    assert.equal(Object.hasOwn(record.response.content, 'text'), false);
    assert.equal(Object.hasOwn(record, 'serverIPAddress'), false);
    assert.equal(Object.hasOwn(record, 'connection'), false);
    assert.match(record.startedDateTime, /^1970-01-01T/);
  }
  assert.equal(Date.parse(output.log.entries[1].startedDateTime) - Date.parse(output.log.entries[0].startedDateTime), 10);
  assert.equal(output.log.entries[2].response.bodySize, -1);
  assert.equal(output.log.entries[3].response.bodySize, -1);
  assertNoOriginalStrings(output);
});

test('malicious metadata is mapped to fixed strings and never appears in reports', () => {
  const attack = `</script><img src=x onerror="${SENTINEL}">`;
  const input = capture([entry({
    request: { method: attack, url: `data:text/html,${attack}`, headers: [{ name: attack, value: attack }] },
    response: { status: 200, statusText: attack, bodySize: 0, content: { mimeType: attack, text: attack } },
  })]);
  const analysis = analyzeHar(input);
  assert.equal(analysis.requests[0].method, 'OTHER');
  for (const output of [analysis, toMarkdown(analysis), toHtml(analysis), toShareHar(analysis)]) {
    assertNoOriginalStrings(output);
    const serialized = typeof output === 'string' ? output : JSON.stringify(output);
    assert.equal(serialized.includes(attack), false);
  }
});

test('analysis and exports are deterministic and never mutate the capture', () => {
  const input = summaryFixture();
  const before = structuredClone(input);
  const first = analyzeHar(input);
  const second = analyzeHar(input);
  assert.deepEqual(first, second);
  assert.equal(toMarkdown(first), toMarkdown(second));
  assert.equal(toHtml(first), toHtml(second));
  assert.deepEqual(toShareHar(first), toShareHar(second));
  assert.deepEqual(input, before);
});

test('re-importing a reconstructed capture preserves unknowns and all allowed request metrics', () => {
  const input = summaryFixture();
  input.log.entries[0].startedDateTime = undefined;
  input.log.entries[0].response.status = undefined;
  input.log.entries[0].time = undefined;
  const original = analyzeHar(input);
  const rebuilt = analyzeHar(toShareHar(original));
  assert.deepEqual(rebuilt.requests, original.requests);
  assert.deepEqual(rebuilt.summary, original.summary);
  assert.ok(rebuilt.warnings.some(warning => warning.includes('reconstructed')));
});

test('reconstructed HAR phases are nonnegative and sum to the reconstructed total', () => {
  const original = analyzeHar(capture([
    entry({time: 100, timings: {wait: 120, receive: 50}}),
    entry({time: undefined, timings: {wait: -1, receive: undefined}}),
  ]));
  const output = toShareHar(original);
  for (const item of output.log.entries) {
    for (const key of ['send', 'wait', 'receive']) assert.ok(item.timings[key] >= 0);
    assert.equal(item.time, Object.values(item.timings).reduce((sum, value) => sum + value, 0));
  }
  assert.deepEqual(analyzeHar(output).requests, original.requests);
});

test('opt-in local labels stay separate from analysis and exports', () => {
  const input = capture();
  const analysis = analyzeHar(input);
  const before = JSON.stringify(analysis);
  const labels = localRequestLabels(input);
  assert.ok(JSON.stringify(labels).includes(input.log.entries[0].request.url));
  assert.equal(JSON.stringify(analysis), before);
  for (const output of [analysis, toMarkdown(analysis), toHtml(analysis), toShareHar(analysis)]) assertNoOriginalStrings(output);
});

test('relative start offsets use the earliest valid date without sorting input order', () => {
  const result = analyzeHar(capture([
    entry({ startedDateTime: '2026-10-31T10:15:30.010Z', time: 100 }),
    entry({ startedDateTime: START, time: 100 }),
  ]));
  assert.deepEqual(result.requests.map((item) => item.startMs), [10, 0]);
  assert.equal(result.summary.durationMs, 110);
});

test('invalid calendar dates stay unknown rather than silently rolling to another day', () => {
  for (const date of [
    '2026-02-30T00:00:00.000Z',
    '2026-02-29T00:00:00.000Z',
    '2026-04-31T00:00:00.000Z',
  ]) {
    const result = analyzeHar(capture([entry({ startedDateTime: date })]));
    assert.equal(result.requests[0].startMs, null, `Impossible date was accepted: ${date}`);
    assert.equal(result.summary.durationMs, null);
  }
  const valid = analyzeHar(capture([
    entry({ startedDateTime: '2024-02-29T00:30:00.000+01:00' }),
    entry({ startedDateTime: '2024-02-28T23:30:00.010Z' }),
  ]));
  assert.deepEqual(valid.requests.map(request => request.startMs), [0, 10]);
});

test('a complete capture sums recorded transfer sizes and reports its actual span', () => {
  const first = entry();
  const result = analyzeHar(capture([
    first,
    entry({
      startedDateTime: '2026-10-31T10:15:31.000Z',
      time: 400,
      response: { ...first.response, _transferSize: 600, bodySize: 300 },
    }),
  ]));
  assert.equal(result.requests[1].bytes, 600);
  assert.equal(result.summary.transferredBytes, 850);
  assert.equal(result.summary.durationMs, 1400);
  assert.equal(result.summary.unknownSizeCount, 0);
});

test('decoded resource size cannot stand in for an unknown transfer size', () => {
  const result = analyzeHar(capture([entry({
    response: { status: 200, bodySize: -1, content: { size: 99999, mimeType: 'text/plain' } },
  })]));
  assert.equal(result.requests[0].bytes, null);
  assert.equal(result.summary.transferredBytes, null);
  assert.equal(result.summary.unknownSizeCount, 1);
});

test('aggregate byte totals cannot silently exceed safe numeric precision', () => {
  const largeEntry = entry({ response: { status: 200, bodySize: 1_000_000_000_000 } });
  const entries = Array.from({ length: 10_000 }, () => largeEntry);
  entries.push(entry({ response: { status: 200, bodySize: 1 } }));
  const result = analyzeHar(capture(entries));
  assert.equal(result.summary.transferredBytes, null);
  assert.ok(result.warnings.length > 0);
});

test('known zeroes remain zero and missing metadata remains unknown', () => {
  const zero = entry({ time: 0, timings: { send: 0, wait: 0, receive: 0 }, response: { status: 204, bodySize: 0, content: { size: 0, mimeType: 'text/plain' } } });
  const partial = { request: {}, response: {}, timings: {} };
  const result = analyzeHar(capture([zero, partial]));
  assert.equal(result.requests[0].durationMs, 0);
  assert.equal(result.requests[0].waitMs, 0);
  assert.equal(result.requests[0].receiveMs, 0);
  assert.equal(result.requests[0].bytes, 0);
  assert.equal(result.requests[1].durationMs, null);
  assert.equal(result.requests[1].startMs, null);
  assert.equal(result.requests[1].status, null);
  assert.equal(result.requests[1].bytes, null);
  assert.equal(result.summary.unknownSizeCount, 1);
  assert.equal(result.summary.unknownStatusCount, 1);
});

test('invalid and unbounded numeric metadata is not silently coerced', () => {
  const result = analyzeHar(capture([entry({
    time: Infinity,
    timings: { wait: NaN, receive: -2, send: '10' },
    response: { status: '200', bodySize: Number.MAX_VALUE, content: { size: Number.MAX_VALUE, mimeType: 'application/json' } },
    startedDateTime: `invalid-${SENTINEL}`,
  })]));
  const request = result.requests[0];
  assert.equal(request.durationMs, null);
  assert.equal(request.waitMs, null);
  assert.equal(request.receiveMs, null);
  assert.equal(request.status, null);
  assert.equal(request.bytes, null);
  assert.equal(request.startMs, null);
  assert.ok(result.warnings.length > 0);
  assertNoOriginalStrings(result);
});

test('empty captures have no invented requests, errors, groups or duplicates', () => {
  const result = analyzeHar(capture([]));
  assert.deepEqual(result.requests, []);
  for (const field of ['requestCount', 'failedCount', 'duplicateCount', 'originCount', 'routeCount']) assert.equal(result.summary[field], 0);
  assert.deepEqual(toShareHar(result).log.entries, []);
});

test('invalid JSON and invalid HAR shapes fail with content-free errors', () => {
  for (const text of [`${SENTINEL}{`, 'null', '[]', '{}', '{"log":null}', '{"log":{"entries":{}}}', '{"log":{"entries":[null]}}']) {
    assertContentFreeError(() => parseHar(text));
  }
  for (const value of [null, [], {}, { log: null }, { log: { entries: {} } }]) {
    assertContentFreeError(() => analyzeHar(value));
  }
});

test('entry count bounds are enforced for parsed and already-parsed captures', () => {
  const oversized = capture(Array.from({ length: MAX_ENTRIES + 1 }, () => ({ request: {}, response: {} })));
  assertContentFreeError(() => analyzeHar(oversized));
  assertContentFreeError(() => parseHar(JSON.stringify(oversized)));
});

test('input limit counts UTF-8 bytes rather than JavaScript characters', () => {
  const oversized = JSON.stringify({ log: { entries: [], comment: 'é'.repeat(MAX_INPUT_BYTES / 2) } });
  assert.ok(oversized.length < MAX_INPUT_BYTES);
  assert.ok(Buffer.byteLength(oversized, 'utf8') > MAX_INPUT_BYTES);
  assertContentFreeError(() => parseHar(oversized));
});
