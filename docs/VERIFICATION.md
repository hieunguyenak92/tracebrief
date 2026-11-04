# Verification record

Date: 2026-11-04. This records checks performed, not a security certification.

## Local environment

- macOS, Node.js 26.5.0, npm 11.17.0.
- `npm test`: 36 core and CLI tests passed. Covers export omission using synthetic sentinels, exact metric calculations, malformed/partial input, invalid calendar dates, numeric precision, size limits, reconstructed-HAR re-import, FIFO rejection, and output/symlink collisions.
- `npm run lint`: JavaScript syntax and explicit remote asset / persistence policy checks passed. This is not an ESLint or static security analysis claim.
- `npm run build`: generated a standalone HTML file with inline code/styles and no module imports remaining. No install step or third-party packages required.

## Browser checks

The local app was exercised in the desktop app's Chromium browser on `http://127.0.0.1:4173`:

- Empty state, synthetic demo, chosen HAR file import, malformed JSON recovery and capture reset.
- Demo showed 12 requests, 3 failures, 4 slow requests, 3 repeated requests and a 5,495 ms observed span. One unknown size kept the total unknown.
- Error, slow and repeated filters showed 3, 4 and 3 rows respectively.
- Original URL view revealed synthetic fake URLs locally; Markdown preview excluded all `FAKE_` sentinels and retained aliases.
- Browser HTML download existed, contained aliases, excluded fake sentinels and included no scripts.
- At a 390 × 844 viewport, page width stayed 390 px; the wide request table scrolled inside its 340 px container.
- Screenshot data is entirely fictional. Desktop and mobile captures are included in this directory.

Direct `file://` navigation is blocked by the testing browser's URL policy. The build's self-contained structure was checked, but literal local-file opening was not exercised there. Other browsers, assistive technology, very large input responsiveness and independent security review remain outside this record.

## Documentation

Nine localized README files were checked for matching command blocks, input limits, privacy limits and resolving local links. No native-speaker review is claimed. Technical reference documents are primarily English. The application UI is English; localized READMEs do not imply localized UI.

## Public release checks

Check the repository's Actions tab and release notes for public CI and release results. A locally passing check is not presented as a completed GitHub CI job.
