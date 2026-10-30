# Screen previews for the Project Hub

The Hub's **Screens** tab shows each screen as built, in English and Urdu, captured from the code with sample data (not a live school).

1. `apps/web-admin/test/shots.test.tsx` renders real screens with sample data and writes the page HTML to `$SHOTS_DIR/html/<name>-<locale>.html`. It is skipped unless `SHOTS_DIR` is set: `SHOTS_DIR=/some/dir npx vitest run test/shots.test.tsx` (`SHOTS_ONLY=name1,name2` limits it).
2. The HTML is wrapped with the app's built stylesheet (`apps/web-admin/.next/static/chunks/*.css`, from `npm run build -w web-admin`) and the bundled fonts (`packages/flutter-core/assets/fonts`), and photographed with headless Chrome at 1100 pixels wide.
3. The pictures are added to the Hub's `screensdata` with the pull request they belong to.

The pictures are a review aid, not a test: the role-scoped proof and the screen tests are what the build depends on.

**Flutter widgets.** `packages/flutter-core/test/shots_test.dart` draws the widget gallery in English and Urdu with the bundled fonts. It is skipped unless `SHOTS_DIR` and `LUCIDE_TTF` (the path of `lucide.ttf` in the `lucide_icons_flutter` package) are set: `SHOTS_DIR=<dir> LUCIDE_TTF=<path> flutter test test/shots_test.dart` writes `<dir>/gallery-en.png` and `gallery-ur.png`. The sample words in the Urdu picture are English except the six sync states, which come from the Urdu draft catalogue.

**Phone screens added in Phase 4 and 5.** `packages/flutter-app/test/shots_more_test.dart` draws the later phone screens (leave, check-in and its reason sheet, announcements, notifications, classes, a report card, cover duties, the Principal's approvals, Today with the check-in card) the same way: `SHOTS_DIR=<dir> LUCIDE_TTF=<path> FONTS_DIR=packages/flutter-core/assets/fonts flutter test test/shots_more_test.dart`.

**Web screens added in Phase 4 and 5.** `apps/web-admin/test/shots-p5.test.tsx` writes the HTML of the transport, check-in location, school location and announcements screens (`SHOTS_DIR=<dir> npx vitest run test/shots-p5.test.tsx`). `node tools/build-shots-css.mjs <out.css>` builds the app's stylesheet without touching `.next`, so a running dev server is not disturbed; wrap the HTML with it and the bundled fonts and photograph it with headless Chrome at 1100 pixels wide. Pictures are reduced to 64 colours (48 for phone pictures) before they go into the Hub, which has a 16 MB limit; a picture with no Urdu version shows the English one in both views.

