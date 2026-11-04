# Contributing

Useful contributions include reproducible bugs, synthetic HAR edge cases, accessibility fixes and clearer explanations of what a report means.

## Run locally

Use Node.js 22 or later. The project has no third-party runtime or development dependencies.

```sh
npm run dev
npm test
npm run lint
npm run build
```

The dev server serves `public/` at http://localhost:4173. The build produces `dist/index.html` for offline use.

## Keep changes focused

Explain the user problem, expected behavior and a small reproduction. For a new feature, describe which metadata it would retain and why the recipient needs it. Avoid new dependencies unless the benefit justifies ongoing maintenance and supply-chain scope.

- Analysis and export changes belong in `public/core.js` and need meaningful tests.
- Browser interactions belong in `public/app.js`; keep original URL labels separate from exportable analysis.
- Use text nodes for user-controlled strings. Imported captures are untrusted input.
- Unknown measurements must remain unknown. Do not replace missing timings or sizes with zero.
- Exporters must construct permitted output fields explicitly. Never spread an input HAR entry into an export.

## Test data

**Use synthetic captures only.** Do not commit HARs from real customer sessions, production systems or internal services, even if you believe you scrubbed them.

Invent hosts under `.invalid`, fake payloads and obvious sentinel secrets. Test both the useful calculation and the information that must be omitted. When adding an export field, test every exporter and update [PRIVACY.md](docs/PRIVACY.md).

Before a pull request:

1. Run `npm test`, `npm run lint` and `npm run build`.
2. Check the changed browser flow with the synthetic sample.
3. Review an exported file and test keyboard interaction if the UI changed.
4. Describe verification performed and anything you could not verify.

Please do not add usage tracking or network services to the import/export flow without an explicit product discussion. The local processing contract is part of the product.

## Reporting

Public issues should contain only minimal synthetic examples. For a possible data exposure or unsafe rendering defect, use the private process in [SECURITY.md](SECURITY.md). Do not attach credentials or private captures to an issue or pull request.
