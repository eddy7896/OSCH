# Children's data protection (DPDP Act 2023): how risk is reduced (plan)

Status: **plan, 2026-10-31.** This answers ADR-0017 decision **D11** and widens task P6-5 ("Compliance and privacy"). It is an engineering and process plan, **not legal advice**: every statement about the law below comes from secondary commentary, none from the Gazette text, and each is marked. A lawyer must confirm it before the pilot.

## 1. What the law appears to require (secondary sources, unverified against the Gazette)
| Point | What the sources say | Source |
|---|---|---|
| A child is anyone under 18 | all the students of a school | [dpdpa.com, section 9](https://dpdpa.com/dpdpa2023/chapter-2/section9.html) |
| Verifiable parental consent before processing a child's data (section 9(1)) | the Rules (Rule 10) describe how a parent is verified | [Consently](https://www.consently.in/blog/verifiable-parental-consent-dpdp-section-9), [Nishant Munjal](https://nishantmunjal.com/dpdp-childrens-data-verifiable-parental-consent-india/) |
| No processing that harms a child's wellbeing (9(2)); no tracking, behavioural monitoring or targeted advertising aimed at children (9(3)) | applies to all fiduciaries unless exempted | [CyberPeace](https://cyberpeace.org/resources/blogs/prohibition-of-behavioral-tracking-and-targeted-advertising-for-children-under-the-dpdp-act-2023) |
| **Educational institutions are exempted** from 9(1) and 9(3) for **educational activities** and **the safety of enrolled children** (Rules, Fourth Schedule, via Rule 12) | described as narrow: it does not cover advertising or unrelated uses | [Rule 12](https://www.dpdpa.com/dpdparules/rule12.html), [Raysolute guide for schools](https://www.raysolute.com/dpdpa-compliance-guide-schools.html) |
| Large penalties (reported up to ₹200 crore for children's-data failures, ₹250 crore for missing security safeguards) | figures differ between sources | [IIT BHU summary](https://iitbhu.ac.in/contents/institute/cf/cis/doc/dpdp_act_rules_summary.pdf) |
| The children's-data obligations reportedly start on **13 May 2027** (18 months after the Rules of 13 Nov 2025) | one source conflicts; confirm the commencement notice | [EY](https://www.ey.com/en_in/insights/cybersecurity/transforming-data-privacy-digital-personal-data-protection-rules-2025) |

**Not found in these searches (treat as unknown):** the breach-notification deadline, the exact duties of a data *processor*, whether a school with many pupils is a "Significant Data Fiduciary", the Rules' verification methods in detail, and whether the exemption extends to a software vendor acting for the school.

## 2. Roles and the main idea
- The **school is the data fiduciary** (it decides why the data is used). **OruSchools is its data processor** (it holds and handles the data on the school's behalf). This must be written down in a contract (a data processing agreement) signed when a school joins. Whether the vendor can rely on the school's educational exemption is a **question for the lawyer**, so the design does not depend on it.
- **The design rule: stay inside "educational activity and safety of the child", and still behave as if consent and the tracking ban applied.** If the exemption turns out narrower than hoped, nothing needs to be rebuilt.

## 3. Mitigations, by risk
| # | Risk | What we do | Where it lives |
|---|---|---|---|
| 1 | Analytics could be called "behavioural monitoring" or "profiling of a child" | Purpose is fixed in writing: **teaching and the child's safety only**. The engine measures learning (marks, answers, attendance), not behaviour on the phone: no screen-time, location, keystroke or app-usage tracking, ever. At-risk bands are a **prompt to a human**, never an automatic decision about a child (no exclusion, admission, fee or placement is driven by it). Parents see a kind sentence and a next step (owner's D6). | ADR-0017 addendum; engine evals |
| 2 | Advertising, sale, or reuse for another purpose | **No advertising, no sale, no sharing for marketing, no use of children's data to train models for others.** Enforced in code: a drift check fails the build if an advertising or third-party analytics SDK (ads, Mixpanel, Segment, Amplitude, PostHog, GA tags) is added to any app. None exists today (checked 2026-10-31). | new drift rule `no-tracking-sdks` (P6-5b) |
| 3 | Consent is missing or not "verifiable" | A parent can use the Parent app only after the **school links the parent account to the child** from its own admission record (the existing invitation and `ParentLink` flow: the school knows who the guardian is, which is the verification). At first sign-in the parent sees the privacy notice and **gives and records consent** per purpose; consent is versioned (notice version, time, language, parent, child) and can be withdrawn. Consent is recorded even where the exemption may apply (belt and braces) and is **required** for anything outside teaching (a newsletter, photos in announcements, any new third-party tool). | `ConsentRecord` table, Parent app first-run screen (P6-5c) |
| 4 | Too much data collected | **Minimisation:** the engine receives only the academic fields it needs (ids, scores, answers, dates), not addresses, phone numbers, medical or ID documents. Student documents stay in the private bucket and never enter the engine. The internal feed is an allow-list, tested. | engine feed allow-list test (E-PRIV-2) |
| 5 | Children identifiable to other families | No ranks, no classmate names or scores; class comparisons only with at least **15** students (owner's D10). Resource comments show a parent's name and the child's first name to the class (ADR-0016 decision 6): **flagged for the owner to reconsider**, because it is the largest exposure of a child's identity to other families (see question Q2). Push messages carry no child's name or score (the text says "a new notice", the detail is read inside the app). **Today this is not true**: the student-leave notices (`notifStudentleave*` in `packages/i18n/messages`) put the child's name and dates in the text, and the push service would send that text once real push exists (P4-6, not built). The inbox may keep it; the push text must be shortened first. | ADR-0016 review; push text rule (P6-5d) |
| 6 | Keeping data too long, or no way to delete | A written **retention schedule**: resources and comments end with the school year (already built for resources); workbook answers and snapshots kept for the current and previous year, then summarised or deleted; audit trail kept longer without the content. **Rights handling:** a parent can ask the school for access, correction, erasure and to withdraw consent; the school's System Admin has an audited action to export a child's data and to erase or anonymise it (the audit trail keeps who/when, not the content). A leaver's data follows the schedule. | retention job, `Erasure` and `Export` admin actions (P6-5e) |
| 7 | A breach | **Reasonable security safeguards** (the Act names them; penalties are high): tenant isolation proven on a real database (done: ADR-0001, matrix tests), role-based access with deny-by-default (done), audit of every write (done), TLS in transit, encryption at rest (Firebase and Cloudflare default; to be confirmed and written down), secrets never in code, backups and restore test (P6-4), and a **breach response runbook**: who decides, how the school (the fiduciary) and the affected parents are told, and the regulator, within the deadline the lawyer confirms. | `documentation/security_incident_runbook.md` (P6-5f) |
| 8 | Data leaves India or goes to unlisted third parties | The database is in `asia-south1` (Mumbai, `dataconnect/dataconnect.yaml`). A **sub-processor register** lists every third party that touches personal data (Firebase/Google Auth and push, Cloudflare R2, the VPS host, the payment provider later) with where the data sits and its agreement. Push notifications pass through Google, so their text is kept free of child details (row 5). Cross-border transfer rules for each sub-processor are for the lawyer. | `documentation/sub_processors.md` (P6-5g) |
| 9 | Notices a child or parent cannot understand | A plain-language privacy notice in English, Hindi and Urdu (drafts until a native reviewer signs off, P6-8), a one-page version for parents, a school-specific grievance contact, and the notice version shown at consent. | P6-5c |
| 10 | The school doesn't know its duties | Onboarding checklist for the school: appoint a grievance contact, adopt the notice, list who has access, review user roles yearly. An **annual access review** report for the System Admin (who has which role) using data we already hold. | P6-5h |
| 11 | Law or Rules change | Compliance settings are **data with a version** (retention periods, consent text, age threshold), not scattered constants; a quarterly checklist item "re-read the Rules"; the lawyer's advice recorded in the ADR with the date. | policy-pack mechanism (ADR-0017) |

## 4. Proofs (evals to write first)
- **E-PRIV-1** the apps and the engine contain no advertising or third-party analytics SDK (drift rule, fails the build).
- **E-PRIV-2** the engine's internal feed contains only allow-listed fields; a test adds a forbidden field and fails.
- **E-PRIV-3** a parent who has not recorded consent to the current notice version cannot reach the child's data (the gateway answers with a "consent needed" code) except the consent screen itself; withdrawing consent hides the data from that parent and is audited.
- **E-PRIV-4** an export and an erase of one child's data work, are audited, and leave other children untouched (two-family test).
- **E-PRIV-5** push texts for every notification kind contain no child name, score or reason (the generated text is scanned in all three languages).
- **E-PRIV-6** retention: after the school year ends, resources, comments and snapshots older than the schedule are no longer served and are removed by the purge job.
- **E-PRIV-7** no automated decision: no code path changes a child's placement, fees or status from an at-risk band (search-based eval).

## 5. Work (also in the Hub, Phase 6)
| ID | Task |
|---|---|
| P6-5a | Lawyer review of this page, the exemption's reach for a vendor, the processing agreement, the breach deadline, the "Significant Data Fiduciary" question (**owner action, outside the build**) |
| P6-5b | Drift rule `no-tracking-sdks`, allow-list for the engine feed, no-automated-decision eval |
| P6-5c | Consent: `ConsentRecord`, first-run consent screen in the Parent app (en/hi/ur), versioned privacy notice, gateway "consent needed" rule |
| P6-5d | Push and notice text rule (no child details) and its eval |
| P6-5e | Retention schedule, purge job, parent request handling: access, correction, erasure, export, withdraw (audited admin actions) |
| P6-5f | Breach response runbook and a yearly drill |
| P6-5g | Sub-processor register and the processing agreement template for schools |
| P6-5h | School onboarding privacy checklist and the yearly access review report |

## 6. What this cannot promise
No design makes a product "compliant" by itself; the school's own conduct counts, and the law's details (commencement dates, the vendor's position, deadlines) must be confirmed by a lawyer. The plan reduces the chance of a problem and the damage if one happens, and makes the school's duties easy to meet.
