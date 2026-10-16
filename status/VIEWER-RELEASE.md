# Viewer 1.2.0

Approved responsive presentation, backed by the existing real public Status API. Backend API remains 1.1.0; the HTML response identifies viewer 1.2.0 in X-Status-Viewer-Version.

Only the Status entrypoint changes to status-entry.mjs. status-service.mjs, site.mjs, site-legacy.mjs, inventory.mjs, schema, bindings, scheduled monitoring, authentication and admin behavior are preserved. The wrapper upgrades only non-legacy HTML responses. API responses pass through unchanged.

viewer-release.mjs contains gzip-compressed public CSS and JavaScript assets, decoded with standard DecompressionStream. No eval, remote loader or extra runtime dependency is used. The decoded JavaScript runs before the existing initial API fetch, inside the existing nonce-protected script.

Validation: 78 isolated browser assertions across 320/390/820/1440 widths; 33 original API checks plus 12 entrypoint checks; Wrangler dry-run. No test writes production data. verify-viewer-live.mjs performs read-only production checks.

Home retains eight initial real tools. Latest updates and incident history show up to three each; searchable archives show ten per page. Missing tool verification and absent resolution details are not fabricated. No public editing controls are added. Existing private admin editing enhancements are a separate scope.
