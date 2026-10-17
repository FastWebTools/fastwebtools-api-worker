# Viewer 1.5.0

Approved single-issue preview applied to real published data. Natural full-width desktop paragraphs; one issue per incident; title-aligned View/Hide details; real completed/current/upcoming states; separate tool cards with Working labels and no per-working-tool timestamps; wide Original report/Workaround left, At a glance right; mobile report/facts/workaround; top connection banner sticky only when disconnected. Existing dashboard, auth, home behavior, routes, legacy, monitoring, logo, analytics and business records preserved. No sample notices published.

Local Chromium responsive/function checks: 93 passed, zero runtime errors, widths 320–1920. Isolated new API policy checks: 20 passed. Release gate additionally runs original core and v1.4 API regressions, exact source hashes, generated browser syntax, CSP/nonce, HEAD, legacy and auth checks. These checks do not claim physical Safari testing or functional verification of all tools.

Build: node prepare-viewer.mjs && node build-150.mjs
Gate: node --experimental-sqlite release-150-check.mjs
Deploy: npx wrangler deploy --config status.config.json
Read-only live verification: node verify-150-live.mjs

Rollback version before this release: df86ed2d-ed01-4d1f-8274-b03dd83908bb. Only fastwebtools-status is authorized for deployment. Use the pinned status-v8 commit; do not merge main. Temporary Cloudflare trigger commands must be restored after release.
