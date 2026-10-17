# Viewer 1.5.3

Home Latest updates and All updates now share the same Update + Scheduled record selector. Home Past incidents and the history archive continue sharing the same Resolved selector. Desktop/tablet maximum four in two columns; mobile maximum three; View all only on overflow. Footer adds Past incidents.

Connection resilience: one non-overlapping scheduled request, 20-second timeout, fast retries after 2/5/10 seconds capped at 15 seconds. First transient failure says Reconnecting without falsely claiming Live; repeated failures or browser offline show sticky unavailable warning and retain last good data. Visibility-aware polling pauses in hidden tabs and resumes immediately when visible. Online events reconnect automatically; retry remains available. This does not promise external network outages never occur.

Preserve approved layout, theme, 12-hour local AM/PM, persistent status timestamps, single-issue timeline, existing dashboard/auth/legacy/analytics and all real business records. No production QA notices.

Gates: responsive/browser regression, shared-feed/connection scenarios, regional time formatting, original isolated API regressions, compiled Worker HTML exact-match to browser-tested HTML, read-only before/after live records comparison. Only deploy fastwebtools-status; never merge main or modify other Workers.
