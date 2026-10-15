# ListRow

A row in a list: students, classes, messages, tasks.

**Provide:** `title`, optional `subtitle`, `leading` (roll number, time, `Avatar`), `trailing` (a `StatusPill`, time, `Badge`), `onClick` to make the whole row tappable (adds a chevron), `size` (`touch` mobile, `compact` ERP).

- The whole row is the tap target, at least 64px tall on mobile.
- Title = the person or thing; subtitle = one line of context. Never three lines.
