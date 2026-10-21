# Translation review workflow (P1-15)

Hindi and Urdu are complete **drafts** written by the assistant. Nothing but English may reach a school until a **native speaker** has reviewed a language and the project owner has recorded it (ADR-0006, `packages/i18n/messages/status.json`). This is how that happens.

## For reviewers
1. Open the **OruSchools Translation Review** page (the link is shared with you by the project owner; you need edit access to save).
2. Type your full name, pick your language, and work through **To review**.
3. For each sentence: read the English and its context line, fix the translation if needed, press **Looks right**. If you cannot decide, press **Needs help** and say why.
4. Keep `{words in braces}` exactly as written: the app fills them in (a name, a number). The page refuses to approve a text whose braces differ from the English.
5. Use the **Glossary** button for the agreed word for each term (the sentences also show the terms they contain). If you want a different word for a term, say so: the project owner updates the glossary so every sentence stays consistent.
6. When every sentence is approved, press **I have finished this language**.

Your decisions are saved as you go. You can stop and come back, and change any decision.

## The glossary
`packages/i18n/glossary.json` is the fixed vocabulary (about 120 terms: roles, attendance statuses, menus, finance, transport, sync words, everyday actions) with a plain definition and a Hindi and an Urdu rendering for each; `documentation/glossary.md` is the readable table generated from it. The Hindi and Urdu words are drafts to be confirmed by the reviewers. Evals keep it honest: every role, menu group, menu item and attendance status in the product has an entry, and every shipped Hindi and Urdu message follows it.

## For the project owner and the assistant
| Step | Command or action |
|---|---|
| See where each language stands | `node tools/translations.mjs status` |
| Check the drafts against the glossary | `node tools/translations.mjs glossary-check --lang ur` (prompts for a reviewer, not errors) |
| Regenerate the readable glossary | `node tools/translations.mjs glossary-md > documentation/glossary.md` (an eval fails if it is stale) |
| Fill the review page (after English text changes) | `node tools/translations.mjs export --lang ur --out bundle.json`, then write it to the page's `bundle/ur` document |
| Read the reviewers' decisions | export the page's `reviews` documents as JSON files into a folder |
| Check what they decided | `node tools/translations.mjs import --lang ur --from <folder>` (dry run: counts, flagged items with their comments, texts that break the rules) |
| Apply the approved edits | `node tools/translations.mjs import --lang ur --from <folder> --apply`, then `npm run i18n:build` |
| Record the language as reviewed | `node tools/translations.mjs mark-reviewed --lang ur --reviewer "Full name" --from <folder> --confirm-native-speaker --apply` |

### Rules the tool enforces
- Approved text must keep English's placeholders, be a valid message, contain no HTML and no `#` in plurals (the same rules as the i18n build).
- Importing never marks a language reviewed.
- `mark-reviewed` refuses unless **every** message is approved, nothing is flagged, rejected or unknown, the approved edits are already applied, a reviewer is named, and `--confirm-native-speaker` is given. It records the reviewer's name and the date in `status.json`.
- English changes after a review start a new round: new or changed messages have no decision, so the language no longer qualifies until they are reviewed. (After you change English text, export again so the page shows the new sentences.)

### Not built yet
- Reviewing the other 17 languages: each needs a draft first (a missing translation shows English for that sentence).
- The page only knows Hindi and Urdu; add a language tab when its draft exists.
