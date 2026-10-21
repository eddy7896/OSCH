# Phase 2 spikes (2026-10-22)

Three short experiments before any finance code. What was run, what it showed, and what is **not** proven.

## P2-0b: PDF text in Hindi, Urdu and the other scripts
**Question:** which tool can make receipt PDFs that show every supported script correctly?

| Tool | Result (Noto fonts from `packages/flutter-core/assets/fonts`) |
|---|---|
| PDFKit (fontkit) | Latin, Devanagari (conjuncts such as क्ष and ज्ञ), Bengali, Tamil, Gujarati, Telugu, Kannada, Odia render. **It crashes** (`Cannot read properties of null (reading 'xCoordinate')`) on **Nastaliq Urdu, Malayalam and Gurmukhi**, and in Arabic-script text it **reverses digits** (`12,500` printed as `005,21`) because it has no bidirectional ordering. |
| skia-canvas 4.0.0 (Skia with HarfBuzz) | Latin, Devanagari, **Nastaliq Urdu** (true Nastaliq style, with the numbers inside Urdu text in the right order), Malayalam and Gurmukhi all render correctly; the PDF embeds real subsetted fonts (text, not pictures). MIT licence; a native build per platform (prebuilt for macOS and Linux). |

**Decision:** receipt PDFs use **skia-canvas**, laid out cell by cell (a receipt is a fixed form, so no free text flow is needed). PDFKit is rejected. The web receipt page stays the primary view; the PDF is the same content.
**Not verified:** the native binary on the production server's operating system and architecture (a deploy-time check once the server is chosen); right-to-left alignment inside a real receipt layout (a layout check in P2-7c).
Reproduce: `tools/spikes/pdf-text/skia.mjs`.

## P2-0a: receipt numbers
**Question:** can a receipt number be allocated without gaps or duplicates inside Data Connect?

**Mechanism that compiles and works** (`tools/spikes/receipt-numbering`): one counter row per school and kind; one `@transaction` mutation reads it, inserts the receipt with `number_expr: "response.query.seq.next"` (the step result is reached as `response.query.<alias>`, not `response.<alias>`), and bumps the counter with `{ inc: 1 }`. The receipt table is keyed on (school, number), so a duplicate is a unique violation.
**On the local emulator:** 20 sequential payments gave 1 to 20; 50 concurrent payments gave unique, gap-free numbers.
**Not proven:** the emulator (PGlite) runs one statement at a time, so those 50 concurrent payments never truly overlapped; **real Postgres concurrency is untested.** The expected behaviour on Cloud SQL (read committed): two transactions read the same next number, the second insert waits for the first to commit and then fails on the key, the failed transaction rolls back completely (counter included), so there are no gaps; the gateway retries a bounded number of times with jitter. **To close this:** P2-7b must include a concurrent-payment test against a real Cloud SQL instance (a throwaway demo school on the owner's instance, run with the owner's approval and cleaned up afterwards), and receipts do not ship before it passes.

## P2-0c: sums and paging
**Question:** does Data Connect sum money exactly and page large lists?
**Result (emulator):** `_count`, `amountMinor_sum` and `amountMinor_max` work on `Int64` and return **exact decimal strings** (a sum of 300 amounts around 9 x 10^15 equalled an independent bigint sum, 2702159776422045150). `limit`/`offset` with `orderBy` returned 300 rows in three pages of 100, in order. Both compile as written.
**Therefore:** report totals (collected, dues) are computed in the database, not by summing in the gateway. **Not verified:** speed at tens of thousands of rows (no index tuning has been done yet); check with the demo school's volume at P2-9.
