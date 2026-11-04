import { MAX_INPUT_BYTES, VERSION, parseHar, analyzeHar, localRequestLabels, toMarkdown, toHtml, toShareHar } from './core.js';
import { DEMO_HAR } from './demo.js';

const $ = (id) => document.getElementById(id);
const PAGE_SIZE = 100;
const PREVIEW_LIMIT = 16000;
const number = new Intl.NumberFormat('en-US');
const fileInput = $('file-input');
const dropZone = $('drop-zone');
const filterButtons = [...document.querySelectorAll('[data-filter]')];
const inventoryLabels = [
  ['headers', 'Header fields'],
  ['cookies', 'Cookie fields'],
  ['queryParameters', 'Query parameters'],
  ['requestBodies', 'Request bodies'],
  ['responseBodies', 'Response bodies'],
  ['urls', 'Original URLs'],
  ['absoluteTimestamps', 'Absolute timestamps'],
  ['customFields', 'Custom fields'],
];

let analysis = null;
let originalHar = null;
let visibleUrls = null;
let filter = 'all';
let page = 0;
let busy = false;
let generation = 0;
let markdownCache = null;
let dragDepth = 0;

$('version').textContent = `v${VERSION}`;

function duration(value) {
  if (!Number.isFinite(value)) return 'unknown';
  if (value >= 10000) return `${(value / 1000).toFixed(1)} s`;
  if (value >= 1000) return `${(value / 1000).toFixed(2)} s`;
  return `${number.format(Math.round(value))} ms`;
}

function bytes(value) {
  if (!Number.isFinite(value)) return 'unknown';
  if (value < 1024) return `${number.format(Math.round(value))} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / 1024 ** 2).toFixed(1)} MiB`;
}

function setStatus(message, processing = false) {
  $('live-status').textContent = message;
  $('live-status').classList.toggle('processing', processing);
}

function setBusy(value) {
  busy = value;
  $('choose-file').disabled = value;
  $('load-demo').disabled = value;
  dropZone.setAttribute('aria-busy', String(value));
}

function showError(message) {
  $('error-message').textContent = message;
  $('error-panel').hidden = false;
  setStatus('');
}

function clearCapture() {
  analysis = null;
  originalHar = null;
  visibleUrls = null;
  markdownCache = null;
  filter = 'all';
  page = 0;
  fileInput.value = '';
  $('show-urls').checked = false;
  $('local-note').hidden = true;
  $('analysis-section').hidden = true;
  $('empty-state').hidden = false;
  $('request-rows').replaceChildren();
  $('privacy-inventory').replaceChildren();
  $('warnings-list').replaceChildren();
  $('preview-panel').open = false;
  $('report-preview').textContent = '';
  $('error-panel').hidden = true;
  updateFilterButtons();
}

function reset() {
  generation += 1;
  clearCapture();
  setBusy(false);
  setStatus('Capture cleared from this tab.');
  $('choose-file').focus();
}

const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 25));

async function loadCapture(readText, source, size) {
  if (busy) return;
  const ownGeneration = ++generation;
  clearCapture();
  setBusy(true);
  setStatus('Reading and rebuilding allowed metadata…', true);
  try {
    if (size > MAX_INPUT_BYTES) {
      throw new Error('The file exceeds the 50 MiB limit. Export a shorter capture and try again.');
    }
    await yieldToBrowser();
    let text;
    try {
      text = await readText();
    } catch {
      throw new Error('The file could not be read from your device. Choose a valid HAR capture and try again.');
    }
    if (ownGeneration !== generation) return;
    await yieldToBrowser();
    const har = parseHar(text);
    text = null;
    const result = analyzeHar(har);
    if (ownGeneration !== generation) return;
    originalHar = har;
    analysis = result;
    renderAnalysis(source, size);
    setStatus(source === 'demo' ? 'Synthetic demo loaded. All data in this example is fictional.' : 'Capture ready. Reports contain reconstructed metadata only.');
  } catch (error) {
    if (ownGeneration !== generation) return;
    clearCapture();
    showError(error instanceof Error ? error.message : 'The capture could not be processed. Choose a valid HAR file.');
  } finally {
    if (ownGeneration === generation) setBusy(false);
  }
}

function chooseFile(file) {
  if (!file) return;
  void loadCapture(() => file.text(), 'file', file.size);
}

function setMetric(id, value, alert = false) {
  $(id).textContent = value;
  $(id).classList.toggle('alert', alert);
}

function renderAnalysis(source, size) {
  const s = analysis.summary;
  $('empty-state').hidden = true;
  $('analysis-section').hidden = false;
  $('capture-title').textContent = source === 'demo' ? 'A fictional capture. A real brief.' : 'Your network, in brief.';
  $('capture-meta').textContent = `${source === 'demo' ? 'SYNTHETIC DEMO' : 'LOCAL CAPTURE'} · ${bytes(size)} · ${number.format(s.requestCount)} requests · nothing uploaded`;
  setMetric('metric-requests', number.format(s.requestCount));
  $('metric-endpoints').textContent = `${number.format(s.originCount)} origins · ${number.format(s.routeCount)} routes`;
  setMetric('metric-errors', number.format(s.failedCount), s.failedCount > 0);
  $('metric-errors-detail').textContent = `${number.format(s.httpErrorCount)} HTTP · ${number.format(s.networkErrorCount)} network${s.unknownStatusCount ? ` · ${number.format(s.unknownStatusCount)} unknown` : ''}`;
  setMetric('metric-slow', number.format(s.slowCount), s.slowCount > 0);
  setMetric('metric-duplicates', number.format(s.duplicateCount));
  setMetric('metric-span', duration(s.durationMs));
  setMetric('metric-transfer', bytes(s.transferredBytes));
  $('metric-transfer-detail').textContent = s.unknownSizeCount ? `${number.format(s.unknownSizeCount)} request sizes unknown` : 'Reported transfer sizes';
  $('count-all').textContent = number.format(s.requestCount);
  $('count-errors').textContent = number.format(s.failedCount);
  $('count-slow').textContent = number.format(s.slowCount);
  $('count-duplicates').textContent = number.format(s.duplicateCount);
  const extent = timelineExtent();
  $('timeline-end').textContent = Number.isFinite(s.durationMs) ? duration(s.durationMs) : extent > 0 ? `${duration(extent)} · partial` : 'unknown';
  renderInventory();
  renderWarnings();
  renderRows();
}

function renderInventory() {
  const fragment = document.createDocumentFragment();
  for (const [key, label] of inventoryLabels) {
    const row = document.createElement('div');
    row.className = 'inventory-row';
    const term = document.createElement('dt');
    term.textContent = label;
    const count = document.createElement('dd');
    count.textContent = number.format(analysis.privacy[key] ?? 0);
    row.append(term, count);
    fragment.append(row);
  }
  $('privacy-inventory').replaceChildren(fragment);
}

function renderWarnings() {
  const fragment = document.createDocumentFragment();
  for (const warning of analysis.warnings) {
    const item = document.createElement('li');
    item.textContent = warning;
    fragment.append(item);
  }
  $('warnings-list').replaceChildren(fragment);
  $('warning-count').textContent = number.format(analysis.warnings.length);
  $('warnings-panel').hidden = analysis.warnings.length === 0;
}

function updateFilterButtons() {
  for (const button of filterButtons) {
    const active = button.dataset.filter === filter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}

function matchesFilter(request) {
  if (filter === 'errors') return request.status === 0 || request.status >= 400;
  if (filter === 'slow') return request.durationMs >= 1000;
  if (filter === 'duplicates') return request.duplicate;
  return true;
}

function cell(className, value) {
  const element = document.createElement('td');
  element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
}

function timelineExtent() {
  let extent = 0;
  for (const request of analysis.requests) {
    if (Number.isFinite(request.startMs) && Number.isFinite(request.durationMs)) {
      extent = Math.max(extent, request.startMs + request.durationMs);
    }
  }
  return extent;
}

function renderRows() {
  if (!analysis) return;
  const requests = analysis.requests.filter(matchesFilter);
  const pageCount = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  page = Math.min(page, pageCount - 1);
  const first = page * PAGE_SIZE;
  const shown = requests.slice(first, first + PAGE_SIZE);
  const fragment = document.createDocumentFragment();
  const timelineMax = Math.max(1, timelineExtent());
  for (const request of shown) {
    const row = document.createElement('tr');
    row.append(cell('row-id', String(request.id).padStart(2, '0')));
    const endpoint = cell('');
    const method = document.createElement('span');
    method.className = 'request-method';
    method.textContent = `${request.method}${request.duplicate ? ' · REPEATED' : ''}`;
    const label = document.createElement('span');
    label.className = 'request-label';
    label.textContent = visibleUrls ? (visibleUrls[request.id - 1] || '(URL unavailable)') : `${request.origin}/${request.route}`;
    // Original labels deliberately never enter the analysis or any export function.
    label.title = label.textContent;
    endpoint.append(method, label);
    row.append(endpoint);
    const status = cell('');
    const badge = document.createElement('span');
    const isError = request.status === 0 || request.status >= 400;
    badge.className = `status-badge${isError ? ' error' : request.status === null ? ' unknown' : request.status >= 300 ? ' redirect' : ''}`;
    badge.textContent = request.status === null ? '?' : request.status === 0 ? 'NET' : String(request.status);
    badge.setAttribute('aria-label', request.status === 0 ? 'Network error' : request.status === null ? 'Status unknown' : `HTTP ${request.status}`);
    status.append(badge);
    row.append(status);
    row.append(cell(`cell-number${request.durationMs >= 1000 ? ' slow' : ''}`, duration(request.durationMs)));
    row.append(cell('cell-number', bytes(request.bytes)));
    const waterfall = cell('');
    const track = document.createElement('div');
    track.className = 'waterfall-track';
    if (Number.isFinite(request.startMs) && Number.isFinite(request.durationMs)) {
      const left = Math.min(100, Math.max(0, request.startMs / timelineMax * 100));
      const width = Math.min(100 - left, Math.max(0, request.durationMs / timelineMax * 100));
      const bar = document.createElement('span');
      bar.className = `waterfall-bar${isError ? ' error' : ''}`;
      bar.style.left = `${left}%`;
      bar.style.width = `${width}%`;
      bar.title = `Start: ${duration(request.startMs)}; duration: ${duration(request.durationMs)}; wait: ${duration(request.waitMs)}`;
      bar.setAttribute('aria-label', bar.title);
      if (Number.isFinite(request.waitMs) && request.durationMs > 0) {
        const wait = document.createElement('span');
        wait.className = 'waterfall-wait';
        wait.style.width = `${Math.min(100, Math.max(0, request.waitMs / request.durationMs * 100))}%`;
        bar.append(wait);
      }
      track.append(bar);
    } else {
      const unknown = document.createElement('span');
      unknown.className = 'waterfall-unknown';
      unknown.textContent = 'timing unavailable';
      track.append(unknown);
    }
    waterfall.append(track);
    row.append(waterfall);
    fragment.append(row);
  }
  $('request-rows').replaceChildren(fragment);
  $('no-requests').hidden = requests.length !== 0;
  $('row-count').textContent = requests.length ? `${number.format(first + 1)}–${number.format(first + shown.length)} of ${number.format(requests.length)} requests` : '0 requests';
  $('page-number').textContent = `${number.format(page + 1)} / ${number.format(pageCount)}`;
  $('previous-page').disabled = page === 0;
  $('next-page').disabled = page >= pageCount - 1;
}

function markdown() {
  if (markdownCache === null) markdownCache = toMarkdown(analysis);
  return markdownCache;
}

function download(format) {
  if (!analysis || busy) return;
  let content;
  let type;
  let extension;
  try {
    if (format === 'markdown') {
      content = markdown(); type = 'text/markdown;charset=utf-8'; extension = 'md';
    } else if (format === 'html') {
      content = toHtml(analysis); type = 'text/html;charset=utf-8'; extension = 'html';
    } else {
      content = JSON.stringify(toShareHar(analysis), null, 2); type = 'application/json;charset=utf-8'; extension = 'har';
    }
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `tracebrief-report.${extension}`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    setStatus(`${format === 'har' ? 'Reconstructed HAR' : format === 'html' ? 'HTML report' : 'Markdown report'} download prepared. Review the metadata before sharing.`);
  } catch {
    showError('The report could not be created. Clear the capture and try a smaller HAR file.');
  }
}

$('choose-file').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => chooseFile(fileInput.files?.[0]));
$('load-demo').addEventListener('click', () => {
  const text = JSON.stringify(DEMO_HAR);
  void loadCapture(() => Promise.resolve(text), 'demo', new Blob([text]).size);
});
$('reset').addEventListener('click', reset);

// Keep dropped captures in the current tab rather than navigating to their contents.
window.addEventListener('dragover', (event) => {
  if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
});
window.addEventListener('drop', (event) => {
  if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
  dragDepth = 0;
  dropZone.classList.remove('dragging');
});
dropZone.addEventListener('dragenter', (event) => {
  if (!event.dataTransfer?.types.includes('Files')) return;
  event.preventDefault();
  dragDepth += 1;
  if (!busy) dropZone.classList.add('dragging');
});
dropZone.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (dragDepth === 0) dropZone.classList.remove('dragging');
});
dropZone.addEventListener('drop', (event) => {
  event.preventDefault();
  if (busy) return;
  const files = event.dataTransfer?.files;
  if (!files?.length) return;
  if (files.length !== 1) {
    showError('Choose one HAR capture at a time.');
    return;
  }
  chooseFile(files[0]);
});

for (const button of filterButtons) {
  button.addEventListener('click', () => {
    filter = button.dataset.filter;
    page = 0;
    updateFilterButtons();
    renderRows();
  });
}
$('previous-page').addEventListener('click', () => { page -= 1; renderRows(); });
$('next-page').addEventListener('click', () => { page += 1; renderRows(); });
$('show-urls').addEventListener('change', () => {
  visibleUrls = $('show-urls').checked && originalHar ? localRequestLabels(originalHar) : null;
  $('local-note').hidden = !visibleUrls;
  renderRows();
});
$('preview-panel').addEventListener('toggle', () => {
  if (!$('preview-panel').open || !analysis) return;
  const report = markdown();
  $('report-preview').textContent = report.slice(0, PREVIEW_LIMIT);
  $('preview-note').hidden = report.length <= PREVIEW_LIMIT;
});
$('export-markdown').addEventListener('click', () => download('markdown'));
$('export-html').addEventListener('click', () => download('html'));
$('export-har').addEventListener('click', () => download('har'));
