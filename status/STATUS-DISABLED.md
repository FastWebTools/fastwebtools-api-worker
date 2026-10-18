# Status disabled — 2026-10-18

Owner requested pausing Status to focus on traffic. New viewer, legacy viewer, Status admin/editor and APIs are disabled with HTTP 410, no polling and no database/auth calls. Scheduled handler is a no-op and deployed cron list is empty. No Status records or databases were deleted. Turso migration and Stage 3 are cancelled.

Live Status version: 4d5c91b3-68c0-4b80-9e91-adf459df20fb (100%). Deployment: 710f73c6-0977-4718-9510-46c1b6934edf.
Main dashboard restored to original version c7a0c142-60f6-4477-8968-30e2ccb781b6 (100%), deployment 49c7d648-2950-417e-8300-d9ee04ac5bd2. Main admin hostname remains active. Authentication and main API deployments are unchanged. Comments, likes, GA, theme and calculations were not modified.

Dedicated Status automatic deployment command replaced by harmless echo; it cannot deploy old Status code. Do not re-enable without owner approval. This branch is an archive of disabled source; protected main was not merged or force-pushed. Existing D1 usage is not reset by disabling Status.

Readonly verification: node status-disabled-verify.mjs. No credentials, login or production comment/like writes. Public HTTP verification outcome is recorded in the Cloudflare build logs when run.

Rollback is NOT approved automatically: former Status version 3f777100-7673-43f4-b187-be92207339e8 and prior builder version 8ca92875-e6b3-4bd6-8997-e2d2535833c5 remain retained. Re-enabling requires a new explicit owner request and query-cost review.
