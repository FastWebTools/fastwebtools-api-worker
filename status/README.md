# Fast Web Tools status service

Separate status service based on the approved V6 design. This branch must not change the existing worker.js, app.js, wrangler.jsonc, website theme, Analytics, comment/like APIs or invoice service.

## Safety and scope
- New dedicated Worker and D1 database; existing admin authentication reused through a service binding.
- Tool status starts Not verified, never simulated Working.
- HTTP availability checks only: three consecutive failures confirm issues; two successes confirm availability.
- Incident explanations, stage transitions, recovery estimates and announcements are administrator-controlled. No guessed root cause, ETA or automatic resolution.
- Draft/published/archived notices, optimistic revisions, idempotent creation and transactional audit records.
- No destructive database changes. No branch deletion, force push or direct push to main.
- Every merge requires explicit owner approval. Merging this repository to main auto-deploys the existing public API and is not a status-service deployment.

## Current release gate
Implementation and tests are being prepared in an isolated workspace. No live status service has been published yet. The exact approved frontend assets must be uploaded and verified before deployment. Keep this branch unmerged until the owner approves the specific merge.

## Rollback
The status service must remain independently deployable and reversible. Preserve source hashes, deployment version, new route records and database recovery details. Do not restore the existing comments/likes database for a status-only code rollback.
