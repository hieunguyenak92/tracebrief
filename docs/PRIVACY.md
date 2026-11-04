# Privacy contract

Tracebrief produces a deliberately limited network report. It cannot decide whether the remaining metadata is appropriate for your recipient. Read the exported file before sharing it.

## Processing and storage

- The browser reads a file you choose and processes it on your device. The application has no upload endpoint, analytics, account, remote fonts, or third-party scripts.
- Loading a hosted copy still fetches app assets from its host; that host may record ordinary access logs. It does not receive your imported capture through the app.
- The original capture is held in browser memory while you inspect it. Reset or reload removes the app's references. This is not secure memory erasure; browser extensions, the operating system and your browser's own diagnostics are outside this contract.
- Tracebrief does not persist imported captures in local storage, IndexedDB, cookies or a server. Downloaded reports are files you control and must manage yourself.
- The CLI reads a local file and writes to stdout or an explicitly chosen file. It performs no network requests. Console output and shell redirection can become part of terminal logs or automation artifacts.

Use a trusted local build when handling a private capture. A modified copy or compromised hosting page can behave differently from this source.

## An export is reconstructed

Exporters consume analysis objects built by Tracebrief, not the original HAR object. There is no broad “copy unknown fields” operation.

| Source data | Export behavior |
| --- | --- |
| URL credentials, host, path, query and fragment | Never copied. Origin and path groups receive generated aliases. |
| Header names and values, cookie names and values | Omitted. Only category counts are retained. |
| Request post data and response content text, including base64 | Omitted, without trying to recognize sensitive content. |
| Browser/vendor extension fields, initiators, page titles, server IPs and raw error messages | Omitted. |
| Input file name and arbitrary labels | Omitted. |
| Method | Mapped to a standard method or `OTHER`. |
| MIME type | Mapped to a fixed category; the original string is omitted. |
| Status, size, timing | Retained only as valid, bounded numbers; missing/invalid values remain unknown. |
| Absolute start dates | Converted into relative offsets. Reconstructed HAR dates are anchored at 1970-01-01. |

Origin/route aliases preserve equality relationships within an analysis. A route group uses the original origin and path; query strings do not distinguish routes. That choice can merge requests with different query-driven behavior. Aliases do not support replay or identify the endpoint to a recipient.

The omission inventory counts data categories. It is not a count of detected secrets, a risk score, or proof that the report is anonymous.

### Reconstructed HAR compatibility

The HAR export is a lossy metadata container. Required phase fields use nonnegative placeholders when unknown; residual recorded duration is placed in `blocked`, and the exported total is the sum of reconstructed phases. If the source phase measurements contradict its recorded total, that reconstructed total can differ. The original allowed duration, wait, receive, start and size measurements remain in fixed Tracebrief annotations. Missing HTTP status uses HAR status `0` with `statusKnown: false`; a missing start uses the fixed epoch with `startKnown: false`.

Tracebrief recognizes its versioned export marker and restores these unknowns and metrics on re-import. Other viewers may show the placeholder values and cannot be assumed to understand the annotations. This is not a faithful original capture, a current W3C conformance claim, or a replay file. Prefer the Markdown, HTML or JSON report if the recipient needs an unambiguous representation of missing values.

## Local URL view

Original URLs are hidden by default. An explicit viewing control may display them locally to help you interpret a row. This separate display data never enters the analysis or exporters. Screenshots or screen sharing with this control on can reveal those URLs. Hide it before recording a demonstration with a private capture.

## Information that remains

Request count and order, origin/route grouping, standard methods, status codes, relative times, durations, byte sizes and content categories can still expose traffic patterns, incidents or user behavior. Unusual numeric values may be recognizable to someone with other information. Tracebrief does not guarantee removal of every form of personal information and is not a security certification or anonymization proof.

Filtering the visible request table changes the view; review the scope of the downloaded report as well. Metadata exports describe the capture, so a visible subset must not be assumed to be the export's complete scope.

## Information that is lost

Exports intentionally cannot preserve endpoint meaning, authentication context, request/response content, original dates or browser-specific diagnostic details. A failure count or long wait does not establish a cause. Use a trusted private workflow with the original capture when those details are necessary.

## Limits and reporting problems

Inputs are bounded at 50 MiB of JSON and 20,000 entries. Limits reduce accidental resource exhaustion; they are not a sandbox for hostile files.

If original text appears in an export, treat that as a potential privacy defect. Do not publish the capture to demonstrate it. Follow [SECURITY.md](../SECURITY.md) and create a minimal synthetic reproduction.
