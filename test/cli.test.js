import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, symlinkSync, rmSync, truncateSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_INPUT_BYTES, VERSION } from '../public/core.js';

const CLI = fileURLToPath(new URL('../bin/tracebrief.js', import.meta.url));
const SECRET = 'TRACEBRIEF_CLI_PRIVATE_SENTINEL_b85e';
const capture = {
  log: {
    version: '1.2',
    creator: { name: SECRET, version: SECRET },
    entries: [{
      startedDateTime: '2026-10-31T14:00:00.000Z',
      time: 100,
      request: {
        method: 'GET',
        url: `https://private.internal/${SECRET}?token=${SECRET}`,
        headers: [{ name: 'Authorization', value: SECRET }],
        cookies: [],
        queryString: [{ name: 'token', value: SECRET }],
      },
      response: {
        status: 503,
        bodySize: 100,
        headers: [],
        cookies: [],
        content: { size: 150, mimeType: `text/${SECRET}`, text: SECRET },
      },
      timings: { wait: 80, receive: 20, send: 0 },
      _private: SECRET,
    }],
  },
};

function invoke(args, options = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    timeout: 10000,
    maxBuffer: 2 * 1024 * 1024,
    ...options,
  });
}

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'tracebrief-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const input = join(directory, 'input.har');
  writeFileSync(input, JSON.stringify(capture));
  return { directory, input };
}

function assertNoSource(output) {
  assert.equal(output.includes(SECRET), false);
  assert.equal(output.includes('private.internal'), false);
  assert.equal(output.includes('2026-10-31'), false);
}

test('FIFO input is rejected without waiting for a writer', { skip: process.platform === 'win32' }, (t) => {
  const {directory} = fixture(t);
  const fifo = join(directory, 'pipe.har');
  const created = spawnSync('mkfifo', [fifo]);
  assert.equal(created.status, 0);
  const result = invoke([fifo], {timeout: 2000});
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /regular HAR input file/);
});

test('help and version work without an input file', () => {
  const help = invoke(['--help']);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /(?:usage|tracebrief)/i);
  const version = invoke(['--version']);
  assert.equal(version.status, 0, version.stderr);
  assert.ok(version.stdout.includes(VERSION));
  const missingArgs = invoke([]);
  assert.notEqual(missingArgs.status, 0);
  assert.match(missingArgs.stdout + missingArgs.stderr, /(?:usage|required|input)/i);
});

test('default CLI prints Markdown and never modifies the input', (t) => {
  const { input } = fixture(t);
  const before = readFileSync(input, 'utf8');
  const result = invoke([input]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^#/m);
  assertNoSource(result.stdout);
  assert.equal(readFileSync(input, 'utf8'), before);
});

test('all declared formats produce parseable outputs containing only projected metadata', (t) => {
  const { input } = fixture(t);
  for (const format of ['markdown', 'json', 'html', 'har']) {
    const result = invoke([input, '--format', format]);
    assert.equal(result.status, 0, `${format}: ${result.stderr}`);
    assertNoSource(result.stdout);
    if (format === 'json') assert.equal(JSON.parse(result.stdout).summary.requestCount, 1);
    if (format === 'har') {
      const output = JSON.parse(result.stdout);
      assert.equal(output.log.version, '1.2');
      assert.equal(output.log.entries.length, 1);
    }
    if (format === 'html') {
      assert.match(result.stdout, /<!doctype html>/i);
      assert.doesNotMatch(result.stdout, /<script\b/i);
    }
  }
});

test('explicit output writes a new file and leaves stdout available for pipelines', (t) => {
  const { directory, input } = fixture(t);
  const output = join(directory, 'report.json');
  const result = invoke([input, '--format', 'json', '--output', output]);
  assert.equal(result.status, 0, result.stderr);
  const written = readFileSync(output, 'utf8');
  assert.equal(JSON.parse(written).summary.httpErrorCount, 1);
  assertNoSource(written);
  assert.equal(result.stdout, '');
});

test('existing output is never overwritten', (t) => {
  const { directory, input } = fixture(t);
  const output = join(directory, 'existing.md');
  const original = 'DO NOT REPLACE EXISTING OUTPUT';
  writeFileSync(output, original);
  const result = invoke([input, '--output', output]);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(output, 'utf8'), original);
  assertNoSource(result.stdout + result.stderr);
});

test('input and output collision cannot destroy the original capture', (t) => {
  const { input } = fixture(t);
  const before = readFileSync(input, 'utf8');
  const result = invoke([input, '--output', resolve(input)]);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(input, 'utf8'), before);
  assertNoSource(result.stdout + result.stderr);
});

test('output symlink cannot overwrite its target or the original input', (t) => {
  const { directory, input } = fixture(t);
  const victim = join(directory, 'victim.txt');
  const output = join(directory, 'output-link.md');
  writeFileSync(victim, 'KEEP VICTIM');
  symlinkSync(victim, output, process.platform === 'win32' ? 'file' : undefined);
  const result = invoke([input, '--output', output]);
  assert.notEqual(result.status, 0);
  assert.equal(readFileSync(victim, 'utf8'), 'KEEP VICTIM');

  const inputLink = join(directory, 'input-link.md');
  symlinkSync(input, inputLink, process.platform === 'win32' ? 'file' : undefined);
  const before = readFileSync(input, 'utf8');
  const collision = invoke([input, '--output', inputLink]);
  assert.notEqual(collision.status, 0);
  assert.equal(readFileSync(input, 'utf8'), before);
});

test('a dangling output symlink cannot redirect creation to another target', (t) => {
  const { directory, input } = fixture(t);
  const missingTarget = join(directory, 'not-created.md');
  const output = join(directory, 'dangling-link.md');
  symlinkSync(missingTarget, output, process.platform === 'win32' ? 'file' : undefined);
  const result = invoke([input, '--output', output]);
  assert.notEqual(result.status, 0);
  assert.throws(() => readFileSync(missingTarget), { code: 'ENOENT' });
});

test('missing files, malformed input and unsupported options fail without source content', (t) => {
  const { directory, input } = fixture(t);
  const malformed = join(directory, `${SECRET}.har`);
  writeFileSync(malformed, `{"password":"${SECRET}", broken`);
  for (const args of [
    [join(directory, `${SECRET}-missing.har`)],
    [malformed],
    [input, '--format', SECRET],
    [input, '--unknown', SECRET],
    [input, '--output'],
    [input, '--format'],
  ]) {
    const result = invoke(args);
    assert.notEqual(result.status, 0, `Expected failure: ${args.join(' ')}`);
    assert.ok(result.stderr.length > 0);
    assertNoSource(result.stdout + result.stderr);
    assert.doesNotMatch(result.stderr, /(?:SyntaxError:|at file:\/\/|node:internal)/);
  }
});

test('CLI rejects an oversized file before trying to parse or emit its content', (t) => {
  const { directory } = fixture(t);
  const input = join(directory, 'oversized.har');
  writeFileSync(input, SECRET);
  truncateSync(input, MAX_INPUT_BYTES + 1);
  const result = invoke([input]);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
  assertNoSource(result.stderr);
});

test('directory input is rejected without leaking filesystem error details', (t) => {
  const { directory } = fixture(t);
  const result = invoke([directory]);
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, '');
  assert.doesNotMatch(result.stderr, /(?:EISDIR|at file:\/\/|node:internal)/);
});
