One design language for every OruSchools surface: the Web ERP (principals, admins, finance, HR) and the four mobile apps — Teacher, Staff, Parent and Driver. The apps should not look identical; they should look like one family. They share colour meanings, type, icons, radii, buttons, forms, status pills and the sync language. They differ in navigation, density and home-screen layout.

The people using OruSchools are teachers between classes, parents on a budget phone, drivers on a route and office staff who did not choose this software. Many are not comfortable with technology, and many are on weak or no network. Every rule below serves one goal: **someone who has never been trained should know what to do next.**

## Principles

1. **One screen, one job.** Each screen answers one question. Teacher home: “What do I need to do today?” Parent home: “How is my child doing today?” Principal dashboard: “5 things I need to know”, not “20 things I can do”.
2. **One primary action.** Exactly one `primary` button per screen, named with a verb. Everything else is `secondary` or `ghost`.
3. **Words beside every icon and colour.** A status is always icon + word + colour. Navigation is always icon + label. Nobody should have to guess what a symbol means, and colour-blind users lose nothing.
4. **Big enough to hit.** 48px minimum tap target on phones (`control-touch`), 64px in the Driver app (`control-driver`). Nothing smaller than 13px text (`caption`).
5. **Saved is saved.** Work is stored on the device first and synced later. Never block the screen with a spinner waiting for the network; say where the work is with `SyncStatus`.
6. **Hide what you can't use.** Navigation and buttons are filtered by permission. Never show a module and then refuse access.
7. **Calm, not colourful.** White cards on a soft grey page, one indigo accent, colour only where it means something.

Each app follows its own path through the information:

| App | Path | Home screen answers |
| --- | --- | --- |
| Web ERP | Information → Insight → Module | Is the school running normally? |
| Teacher | Schedule → Task → Completion | What is my next class and what is left to do? |
| Staff | Today → Responsibility → Completion | What do I need to do today? |
| Parent | Child → Information → Action | How is my child doing today? |
| Driver | Route → Student → Safety | Where is the next stop and who gets on? |

## Content: how OruSchools talks

- **Plain words, not ERP words.** “Fees up to date”, not “Ledger balance: 0.00”. “Mark all present”, not “Bulk update status”. Parents never see module names.
- **Sentence case** for everything — buttons, titles, menu items: “Take attendance”, “Today's schedule”. Proper nouns and class names keep capitals: “Grade 10 A”, “Route T3”.
- **Speak to the user as “you”;** the school is “the school”, not “we”. Greetings use the first name: “Good morning, Ayesha”.
- **Buttons start with a verb** and say the result: “Submit attendance”, “Pay ₹12,400”, “Upload now”, “Retry”.
- **Numbers the way people say them.** Money in Indian grouping with ₹ (₹1,82,40,000). Times as 8:45 AM. Dates as Tue, 24 Jun. Relative time for recent things: “2 mins ago”, “In 25 mins”.
- **Errors say what to do,** never blame: “Marks cannot be more than 50.” “We could not reach the school server. Your work is saved on this phone.”
- **No emoji in the product UI.** A warm greeting is enough. Parent messages written by teachers may contain emoji; the interface around them does not.
- Text must survive translation into Hindi and Urdu: keep labels short, never put text in images, leave room for 30% longer strings.

## Colour

Use semantic tokens in product code — never the raw `indigo-*` steps, and never a hex value.

- **Page and surfaces.** Page background `bg`. Cards, nav bars, inputs, sheets `surface`. Inset areas (search fields, table headers) `surface-muted`. The school identity strip and selected rows `surface-brand`.
- **Text.** `text` for everything important; `text-muted` for the second line (roll numbers, timestamps, hints). There is no third, lighter grey — it would fail contrast for older eyes and cheap screens.
- **Edges.** `border` hairlines between rows and around cards. Controls (inputs, checkboxes) use `border-strong`, which holds 3:1 so the edge of a field is always visible.
- **Brand.** `primary` (Oru Indigo 600, `#4F46E5`) fills the single primary button, the selected segment and checked boxes, with `on-primary` text. `primary-text` is for links, “View all” and the active tab; `primary-soft` is the background of active nav items, secondary buttons and brand icon tiles.
- **Status tones.** Each tone has a `-fg` (text and icon) and a `-bg` (soft fill). Use them as a pair:
  - `success` — Present, Synced, Paid, On schedule, upward trends.
  - `warning` — Late, Saved on device, Changes pending, Pending approval.
  - `danger` — Absent, Sync failed, Overdue, Delayed. `danger-solid` for destructive confirms, the unread count and the driver's emergency action.
  - `info` — Leave, Syncing, Review, announcements.
  - `purple` — Medical only. `teal` — Half Day only. Excused and Offline use the neutral pair `text-muted` on `surface-muted`.
- **Solid fills** (`success-solid`, `danger-solid`, `primary`) are for big actions only: the driver's Boarding / Drop-off tiles, the main submit button.
- **Charts.** Main series `chart-1`, comparison or remainder `chart-2`, always with a legend label.
- **Dark theme.** Every semantic token has a dark value; components never need to know which theme is active. Every text pair named in a token's note holds 4.5:1 in both themes, controls and focus rings 3:1.
- **School branding (white-label Mode A).** A school may replace `primary`, `primary-hover`, `primary-text`, `primary-soft` and `focus` with its own colour, and add its logo and name. It may not change status tones, surfaces or text colours. Before accepting a school colour, check white text on it is at least 4.5:1; if not, darken it. Mode B (full white label) changes the app name, icon and splash screen — never the components.

## Type

One family: **Noto Sans**, loaded from Google Fonts, with Noto Sans Devanagari next in the stack so Hindi renders in the same voice. It was chosen because the Noto family covers every Indian script the platform may need, and its open letterforms stay readable at small sizes on low-cost screens.

| Style | Size / line | Use |
| --- | --- | --- |
| `display` | 28 / 36 bold | The greeting on home screens and the principal dashboard. Once per screen. |
| `title` | 22 / 30 bold | Screen titles; the class, route or child the screen is about. |
| `heading` | 18 / 26 semibold | Card and section headings. |
| `subheading` | 16 / 24 semibold | The main line of a list row. |
| `body-lg` | 16 / 24 | Default body text on phones. |
| `body` | 14 / 22 | Default body text in the Web ERP and table cells. |
| `label` | 14 / 20 semibold | Buttons, form labels, pills, tabs. |
| `caption` | 13 / 18 | Timestamps, roll numbers, helper text. Nothing smaller. |
| `stat` / `stat-sm` | 28 / 34, 20 / 26 bold | Stat-card numbers, with tabular figures. |
| `action-xl` | 20 / 26 bold | Driver action tiles. |

Use weight, not colour or size jumps, to show what matters. Never use all-caps for more than a two-word section label (the ERP side-nav section titles), and never italics for emphasis.

## Space, size and shape

- **Spacing** on a 4px base: `space-1` 4, `space-2` 8, `space-3` 12, `space-4` 16, `space-5` 20, `space-6` 24, `space-8` 32, `space-12` 48. Phones use `space-4` side margins and gaps between cards; the ERP uses `space-6` gutters and `space-5` card padding.
- **Density.** Pick one per screen, by app:
  - ERP Compact — `control-compact` (36px): data grids, ledgers, student lists.
  - ERP Comfortable — `control-comfortable` (40px): dashboards, settings, forms.
  - Mobile Touch — `control-touch` (48px): Teacher, Staff, Parent.
  - Driver Safety — `control-driver` (64px): the Driver app during an active route. Few actions per screen.
- **Radius.** `radius-sm` 8 for pills and small tiles, `radius-md` 12 for buttons and inputs, `radius-lg` 16 for cards and banners, `radius-xl` 20 for driver tiles and bottom sheets, `radius-full` for avatars, count badges and the sync pill. Soft, never bubbly.
- **Depth.** Cards are `surface` + a `border` hairline + `shadow-card`. Only floating things (menus, sheets, the sticky submit bar) use `shadow-raised`. No gradients.
- **Focus.** Every interactive element shows a 2px solid `focus` outline with a 2px offset on keyboard focus.

## Layout patterns

- **Mobile home screens** read top to bottom: greeting (`display`) → school strip with `SyncStatus` → the one next thing (next class, next stop, child's day) with its primary action → today's list → messages. No grids of module icons; this is not a mini-ERP.
- **Workflow screens** (attendance, grade entry, boarding): back arrow + `title` + date at the top, a `SyncStatus` banner if anything is pending, a summary row of counts, the list, and a sticky bottom bar with the one primary action.
- **Attendance is exception-based.** Everyone starts Present; a prominent `secondary` “Mark all present” resets; the teacher only taps the few exceptions on their `StatusPill`.
- **Web ERP** is a persistent `SideNav` (filtered by permission) plus a page with a greeting, at most five `StatCard`s, then two-column cards: insight on the left, “Requires attention” on the right.
- **Driver Active Route Mode** hides the bottom nav and shows: route progress, next stop with ETA, students on board, and a 2×2 grid of `ActionTile`s. Nothing else.

## Motion

Quick and quiet: 150ms ease for hover and press, 200ms for sheets sliding up. The only looping animation is the `syncing` icon, and it stops under reduced-motion settings. Nothing bounces, nothing celebrates.

## Iconography

Outline icons in the Lucide style: 24px grid, round caps and joins, about 2px stroke, drawn in `currentColor` so they always match their label. Sizes: `icon-sm` 16 in pills and captions, `icon-md` 20 in buttons, rows and the side nav, `icon-lg` 24 in the bottom nav and icon tiles, 32 in driver tiles. The `Icon` component carries the set used so far; in the Next.js and Flutter codebases use the `lucide-react` / `lucide_icons` packages with the same names, and draw any new icon in the same style. When an icon sits in a tinted square (an icon tile), the square uses the tone's `-bg` and the icon its `-fg`.

Do not use emoji, filled icons, multicolour illustrations inside components, or oversized dashboard icons.

## Logo

The OruSchools mark is an O for Oru: a ring with an opening and a dot stepping out of it. In product code use the `Logo` component (mark in `primary-text`, wordmark in `text`); everywhere else use the files in Assets › Logos. The app header shows `Logo` with the app name (“Teacher”, “Parent”…); in white-label Mode A the school's logo leads and OruSchools appears only as “Powered by”. Clear space, minimum sizes, misuse, app icons, co-branding, social and document templates are in the Brand guidelines section.
