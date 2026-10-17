# Viewer loading fix 1.5.1

Root cause: Worker bundling renamed injected functions such as lastUpdated to lastUpdated2. Runtime Function.toString() copied the renamed declaration into the browser, while the browser's home renderer still called lastUpdated. Initial render threw; the next identical data poll set connection to Live without retrying the failed render.

Fix: generate and freeze the complete browser document before bundling. The Worker only substitutes the CSP nonce; it never serializes bundled rendering functions. A failed render no longer commits the payload fingerprint, and first-render failures have a retry panel instead of an endless loader. Approved 1.5 layout and real business data remain unchanged.

Regression: 93 responsive Chromium checks passed against frozen HTML. Prebundle integrity/core/API/security tests plus a new post-Wrangler gate execute the compiled Worker and require its HTML to match the browser-tested document byte-for-byte. Read-only live verification checks the same document hash, API version, real tool inventory and unchanged notice versions.

Only fastwebtools-status may deploy. Dashboard, main site, analytics and unrelated Workers remain out of scope. No production test notices or writes.
