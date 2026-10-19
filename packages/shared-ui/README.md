# @oruschools/shared-ui

React components for the OruSchools web apps. Reference design: `documentation/design-system/components/`.

- Import components from `@oruschools/shared-ui` and the styles once from `@oruschools/shared-ui/styles.css` (needs `shared-design-tokens` `tokens.css` and `i18n` `i18n.css` loaded).
- Built so far (batch B1): Icon, Button, Badge, Avatar, Checkbox, TextField, SegmentedControl. B2-B4 follow (see `documentation/phase1_plan.md`, P1-11).
- Rules enforced by tests: logical CSS properties only (right-to-left), semantic tokens only, light theme only, no text under 13px, an icon always comes with a word, axe checks, density sizes 36/40/48/64.
- Tall scripts: line heights are `max(design px, font size x --oru-min-lh)`; `--oru-min-lh` is set per language by `i18n.css`.
- `src/icons.generated.ts` is generated from the design-system bundle: `npm run icons` (checked by `npm test`). Do not hand-edit.
