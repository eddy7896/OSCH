# ADR-0012: Phase 2 product decisions (school setup, people, fees, payroll)

- **Status:** Accepted (2026-10-22), owner answers to four questions
- **Builds on:** ADR-0004 (money), ADR-0006 (languages), ADR-0007 (roles), ADR-0008 (gateway)

## Decisions
1. **Class levels.** A new school starts with the levels **Nursery, LKG, UKG, 1 to 12**. They are ordinary rows the school can rename, reorder or delete (the school removes what it does not teach); sections (A, B, C ...) are added per level. Nothing in the code depends on the names.
2. **Fee billing is per instalment, set per fee.** A fee structure (per class level and academic year) has fee items; each item has one or more **instalments**, each with its own amount and due date. Monthly billing is twelve instalments; annual and term fees are one and three. Invoices are generated per student per instalment, and generating them twice never creates a duplicate (a database-level unique key, not only a check in code).
3. **Payroll has no statutory calculation in v1.** A salary structure is a list of components (basic pay, allowances) and manual deduction lines per person; a monthly run goes draft, approved, paid. Provident fund, ESI, professional tax and income tax are not computed (the rules change by state and year; a wrong computation is worse than none). A deduction hook stays reserved, so a later phase can plug a calculation in.
4. **Receipts are both a web page and a PDF.** A receipt has one number and one record; it is shown as a printable web page first and also available as a server-made PDF (same content, same number, downloadable again later).

## Consequences
- **Receipt numbers** need a gap-free-enough, race-free sequence per school and academic year. Data Connect has no sequences, so a counter row updated inside the same transaction as the receipt (with a unique key on the number) is the planned design; a spike proves it under concurrent payments before finance is built (see `phase2_plan.md`).
- **PDF text in Hindi and Urdu** needs a PDF tool that shapes Indic and Arabic-script text. This is a known hard spot (many tools do not); a spike picks the tool before receipts are built, and receipts use the school's language only where the spike shows correct shaping, otherwise the web page is the faithful version.
- **Private files** (student documents, photos) cannot live in the public logo bucket: they need a separate private bucket with presigned read addresses (the R2 guide already warns about this). Planned with students (P2-2).
- Statutory payroll, online payment and fee reminders are out of Phase 2 (P6, P5).
