# SyncStatus

The one shared way every mobile app says whether work is safe on the server.

**Provide:** `state` — `synced`, `saved`, `pending`, `syncing`, `offline`, `failed`; optional `title`, `detail` (“2 mins ago”, “5 changes pending”); `variant` `pill` (headers, home screens) or `banner` (top of a workflow screen) with `actionLabel` + `onAction` (“Upload now”, “Retry”).

- Wording is fixed across apps: “Synced”, “Saved on device”, “↑ N changes pending”, “Syncing…”, “You're offline”, “Sync failed — Retry”.
- Saving locally is success for the user: never show a spinner or block the screen while waiting for the network.
- Show the banner only when something is pending, offline or failed. When synced, a small pill is enough.
