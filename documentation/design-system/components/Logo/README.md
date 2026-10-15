# Logo

Renders the OruSchools logo inline (mark + outlined Poppins wordmark), so app headers and the ERP sidebar never load an image or depend on a font.

**Provide:** `size` (mark height in px; default 32), optional `variant="mark"` for the mark alone, `app` for an app lockup (“Teacher”, “Parent”…), `tone` — `color` (default: mark `primary-text`, wordmark `text`), `white` (on Oru Indigo or dark grounds), `ink` (single colour, always Ink #151838 — for light or yellow grounds, never the dark theme). With `white` or `ink` the app name takes the same ink.

- Mobile app header: `<Logo size={28} app="Teacher" />` top-left. ERP sidebar: `<Logo size={26} />` (SideNav does this when no `product` is passed).
- Minimum `size` 16 for the mark, 20 for the full logo. Below that use `variant="mark"`.
- In white-label Mode A the school's logo leads the header; use the Powered-by files from Assets › Co-branding, not this component, on splash and login.
- In dark theme `color` follows `primary-text`, so the mark lightens to stay visible.
