# Button

A button runs one action; there is at most one `primary` button per screen.

**Provide:** `children` (the label), `variant` (`primary`, `secondary`, `ghost`, `danger`), `size` matching the app's density (`compact` / `comfortable` in the Web ERP, `touch` in mobile apps, `driver` in the Driver app), optional `icon`, `block` for full width, `disabled`.

- Labels start with a verb and say what happens: “Take Attendance”, “Submit Attendance”, “Pay ₹12,400”. Not “OK”, not “Proceed”.
- `primary` = the thing the screen is for. Everything else is `secondary` or `ghost`.
- `danger` only to confirm something destructive, after a dialog that says what will be lost.
- On mobile, the main action sits in a sticky bar at the bottom, `block`.
- Disabled buttons need a nearby reason (“Select at least one student”).
