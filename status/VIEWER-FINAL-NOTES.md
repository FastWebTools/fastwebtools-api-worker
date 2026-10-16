# Viewer 1.3.0 final presentation release

Scope: public viewer only. Backend, database, private admin, auth, inventory, scheduled monitor, bindings and routes stay unchanged. No test writes to production.

Approved responsive home: centered animated status indicator; centered service title above recorded status; compact 8 real tool links; desktop/tablet maximum 4 updates and 4 resolved incidents in separate two-column sections; mobile 3 each; overflow controls only when more published records exist. Responsive footer and viewer-local UTC offset. No embedded sample notices.

15-second bounded background reads, keyed reconciliation, preserved search/focus/expanded details, visible stale connection and retry. Directory search/categories, 10-per-page archives and filtering, safe rich text/HTTPS links, original/current/final incident separation and recorded timeline, maintenance timing without assuming completion, local static/countdown/both modes, accessible light/dark and reduced motion.

Unknown functional status is not promoted to Working. Multi-tool independent branch data and custom notice-button editing are not published by the current backend contract; those require the later dashboard/backend work. Authored published records are preserved, not silently deleted as samples.

Before deployment run node --experimental-sqlite release-final-check.mjs and Wrangler dry-run. After deployment verify HTTP, CSP nonce, 46 real tool inventory, unchanged published notices, protected admin and unchanged other Workers. Rollback version before this release: 1ca6037b-5dcb-4cd4-badd-c067c780e237.
