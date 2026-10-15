# ActionTile

A big, glanceable action for the Driver app and the Quick Actions row of the Staff and Parent home screens.

**Provide:** `title` (one or two words), `description` (one short line), `icon`, `tone` (`primary`, `success`, `danger`, `neutral`), `solid` for the one or two most important tiles, `onClick`.

- Driver app: lay tiles in a 2-column grid; at most four tiles on screen during an active route. Boarding = `success` solid, Drop-off = `primary` solid, Contact School = `danger` soft.
- Minimum height 112px; never shrink it.
- Not for navigation lists — use `ListRow`.
