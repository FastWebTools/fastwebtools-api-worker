# Viewer 1.5.2 — time display only

Both viewer date/time formatters now explicitly use 12-hour AM/PM with English display text. Viewer-local timezone and actual saved timestamps are unchanged. Applies to home, update and incident archives, individual notices, timelines, maintenance windows and last-updated labels. Frozen prebundle document approach preserves the 1.5.1 loading fix.

No record filtering changed: home Latest updates contains Update records only; All updates includes Update and Maintenance. Existing desktop/tablet maximum four (2×2) and mobile maximum three remain unchanged. No sample data, dashboard, analytics or unrelated Worker changes.

Require API regressions, compiled Worker response identical to browser-tested HTML, and a read-only before/after comparison of published live records before declaring release verified.
