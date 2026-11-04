# When to use Tracebrief

HAR viewers and sanitizers already exist. Tracebrief focuses on a small handoff: share request order, errors and timings while discarding the original endpoints and payloads.

This comparison describes documented purposes, checked on 2026-11-04. It is not a security audit or a measured performance comparison of the alternatives.

| Tool | Documented purpose | Consider it when |
| --- | --- | --- |
| [Chrome DevTools](https://developer.chrome.com/docs/devtools/network/reference) | Capture and inspect network activity; sanitized HAR export excludes certain sensitive headers. | You need live investigation, full endpoint context, and the browser's detailed diagnostics. |
| [Google HAR Sanitizer](https://github.com/google/har-sanitizer) | Select and scrub cookies, headers, parameters and content, with a preview. | You need selective removal while preserving more of the original capture. |
| [Cloudflare HAR Sanitizer](https://github.com/cloudflare/har-sanitizer) | An existing HAR sanitization project; repository archived in June 2026. | Evaluating prior sanitizer approaches or maintaining an existing installation. Check maintenance status before adopting it. |
| [Edgio HAR Tools](https://github.com/Edgio/har-tools) | A collection of HAR auditing and sanitization tools, including a browser client and API. | You need its auditing or sanitization workflow. |
| Tracebrief | Local metadata analysis and new Markdown/HTML/JSON/reconstructed HAR exports, with opaque endpoint aliases and relative timing. | A recipient needs network patterns rather than endpoint names, payloads or replay. |

## The tradeoff

Tracebrief rebuilds exports from a restricted set of fields. It removes useful debugging context along with the information you do not want to share. This is a deliberate information budget, not a claim that another sanitizer is unsafe or that Tracebrief guarantees anonymity.

Choose DevTools for diagnosis. Choose a selective sanitizer when the recipient needs specific original fields. Choose Tracebrief when a metadata report is sufficient, then review the report before sending it.

See the exact [privacy contract](PRIVACY.md) for retained information and limits.
