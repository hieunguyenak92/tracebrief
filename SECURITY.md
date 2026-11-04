# Security policy

Tracebrief is an initial 0.1 release. Fixes target the current version; older versions do not have a separate support commitment.

## Report privately

Potential security issues include original input text surviving an export, unsafe rendering of HAR strings, unintended network transmission, path handling defects or resource-limit bypasses.

If this repository has GitHub private vulnerability reporting enabled, open **Security → Report a vulnerability**. If that option is unavailable, open a public issue saying only that you need a private reporting channel. Do not include exploit details, private URLs, production HAR files, credentials or customer data in that issue. The maintainer can arrange a private channel.

Include, through the private channel:

- The affected version and browser/Node version.
- Expected behavior and observed behavior.
- A minimal **synthetic** HAR with invented values.
- The exporter or interaction that exposes the problem.

There is no guaranteed response SLA or bounty program. Do not send real secrets to demonstrate a defect.

## Scope and limits

The privacy boundary is documented in [PRIVACY.md](docs/PRIVACY.md). Exported timings, sizes, methods, statuses and request patterns remain potentially sensitive. The tool does not promise complete PII removal, secure memory erasure or anonymous output. A report must be reviewed before sharing.

Run private captures only in a trusted copy. Browser extensions, compromised dependencies outside this project, modified hosted copies, terminal logging and recipient handling are outside the application's control.

The CLI rejects existing output entries, including dangling symlinks, and requests exclusive file creation. Use an output directory you control. These checks are not a sandbox against another process changing directory entries concurrently, especially on Windows or network filesystems.
