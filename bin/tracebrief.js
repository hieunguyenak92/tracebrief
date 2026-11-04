#!/usr/bin/env node
import { open, writeFile, lstat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { analyzeHar, parseHar, toMarkdown, toHtml, toShareHar, MAX_INPUT_BYTES, VERSION } from '../public/core.js';

const HELP = `Tracebrief ${VERSION} — local HAR performance reports

Usage: node bin/tracebrief.js input.har [--format markdown|json|html|har] [--output report.md]

Default: metadata-only Markdown to stdout. No network or third-party dependencies.
--output exclusively creates a new file; existing paths are never overwritten.
--help     Show this help
--version  Show version

Limits: 50 MiB, 20,000 requests. Endpoints are aliases; payloads are omitted.
Review timing and traffic patterns before sharing. Not a replayable HAR or privacy guarantee.
`;

process.stdout.on('error', error => {
  if (error.code === 'EPIPE') process.exit(0);
  process.stderr.write('Tracebrief: could not write output.\n');
  process.exit(1);
});

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') return process.stdout.write(HELP);
  if (args.length === 1 && args[0] === '--version') return process.stdout.write(`${VERSION}\n`);
  if (!args.length) { process.stdout.write(HELP); process.exitCode = 2; return; }
  let input;
  let output;
  let format = 'markdown';
  const used = new Set();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--format' || arg === '--output') {
      if (used.has(arg) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Invalid or repeated option. See --help.');
      used.add(arg);
      if (arg === '--format') format = args[++i];
      else output = args[++i];
    } else if (arg.startsWith('-') || input) throw new Error('Invalid arguments. See --help.');
    else input = arg;
  }
  if (!input) throw new Error('A HAR input file is required.');
  if (!['markdown', 'json', 'html', 'har'].includes(format)) throw new Error('Unsupported format. Use markdown, json, html or har.');
  if (output && resolve(input) === resolve(output)) throw new Error('Output cannot replace the input file.');
  let handle;
  let text;
  try {
    // A blocking open on a FIFO would hang before fstat could reject it.
    handle = await open(input, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0));
    const stat = await handle.stat();
    if (!stat.isFile()) throw new Error('not-regular');
    if (stat.size > MAX_INPUT_BYTES) throw new Error('too-large');
    // Bound the read even if a file grows after stat(). Never read arbitrary devices/streams.
    const chunks = [];
    let size = 0;
    for await (const chunk of handle.createReadStream({ autoClose: false, highWaterMark: 64 * 1024 })) {
      size += chunk.length;
      if (size > MAX_INPUT_BYTES) throw new Error('too-large');
      chunks.push(chunk);
    }
    text = Buffer.concat(chunks).toString('utf8');
  } catch (error) {
    if (error.message === 'too-large') throw new Error('Capture exceeds the 50 MiB input limit.');
    throw new Error('Could not read a regular HAR input file.');
  } finally { await handle?.close(); }
  const analysis = analyzeHar(parseHar(text));
  const content = format === 'markdown' ? toMarkdown(analysis)
    : format === 'html' ? toHtml(analysis)
    : `${JSON.stringify(format === 'har' ? toShareHar(analysis) : analysis, null, 2)}\n`;
  if (!output) { process.stdout.write(content); return; }
  try {
    // lstat checks the entry itself: Windows wx may follow a dangling link to a new target.
    // Keep wx for exclusive creation; use a trusted directory, not one modified concurrently.
    let existing;
    try { existing = await lstat(output); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (existing) throw new Error('output-exists');
    await writeFile(output, content, { flag: 'wx', mode: 0o600 });
  }
  catch { throw new Error('Could not create output. Use a new path in an existing directory.'); }
}

main().catch(error => {
  process.stderr.write(`Tracebrief: ${error.message}\n`);
  process.exitCode = 1;
});
