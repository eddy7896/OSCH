# ADR-0019: The learning system for students (LMS) and virtual examinations

- **Status:** **Proposed (2026-11-16).** The owner answered the first questions in chat (the "Owner answers" table); the open decisions at the end need the owner and, for children's data and live video, a lawyer. Nothing is built.
- **Plan:** `documentation/modules/lms.md`. Tasks P8-1 to P8-16 in `documentation/project_plan.md` (Phase 8) and the Project Hub.
- **Builds on:** ADR-0001 (tenant isolation), ADR-0003 and ADR-0014 (offline-first phone apps), ADR-0006 (languages), ADR-0007 (roles; silos), ADR-0008 (the gateway is the only data path), ADR-0011 (accounts made by the System Admin), ADR-0014 (one app per role group), ADR-0016 (resources and workbooks for classes), ADR-0017 (the Academic Insights Engine), and `documentation/modules/children-data-protection.md` (consent, no tracking, no automated decisions).

## Context
The owner wants a learning system where **students** open tests and workbooks, see **analytics about themselves**, and sit **virtual (at-home) examinations**, on the **web and on the phone**, with the school choosing where students may use it. Today the system has 14 staff and parent roles and **no student role**; students appear only as records that parents, teachers and staff read. Workbooks answered by students were planned inside the Parent app (ADR-0017); this decision widens that into a product of its own.

It touches rules that need an explicit decision: a **new role** (ADR-0007), **accounts for minors**, **live video of children**, and a **boundary with the Academic Insights Engine**.

## Owner answers (2026-11-16)
| # | Question | Answer |
|---|---|---|
| 1 | How does a student sign in? | **Both, by age:** younger students use a **student mode in the Parent app** on the parent's phone; older students have **their own account** (a new `STUDENT` role) on the web or the Student phone app. |
| 2 | How strict are virtual exams? | **Optional proctoring**, in the form of a **live remote invigilator** (a teacher watches live video of several students at once; no stored recordings; chosen over webcam snapshots, continuous recording and screen capture). |
| 3 | Which question types in version 1? | **All four groups:** multiple choice and true or false; short and long written answers (teacher marks); photo or file of handwritten work; fill in the blank, matching and numeric answers. |
| 4 | Relation to the Academic Insights Engine | **Two products that share data:** the LMS is the student's workspace and records every answer; the engine stays separate (parents, teachers and admins) and reads what the LMS records. |
| 5 | Where may students use it? | **A school setting:** web, phone or both, separately for study and for virtual exams, enforced by the gateway. |
| 6 | Where do questions come from? | **Teachers write them; each school keeps its own bank.** Nothing is shared across schools. |
| 7 | When is it built? | First answer (16 Nov): **before the pilot.** **Changed the same day:** the **whole launch (Phase 6) moves after the LMS and after the Academic Insights Engine**; see Consequences. |

## Decisions
1. **A `STUDENT` role** is added in `ROLES`, the Data Connect `SchoolRole` enum and the matrix together (the evals enforce all three). Its scope is `own`; it reads no ERP data and no other student. A student account belongs to one school and is made by the **System Admin** (single or a whole class), like staff and driver accounts (ADR-0011).
2. **Younger students use a student mode in the Parent app.** The parent unlocks it with a PIN; requests carry the parent's token and the child's id, and the gateway accepts that pairing **only on the LMS study and exam routes** and only for a child the parent is linked to. The parent is recorded as the signed-in person. The cut-off between student mode and own accounts is a **school setting, default grade 6**.
3. **Two new apps:** `apps/web-student` (Next.js) and `apps/mobile-student` (Flutter), each with its own build and design-system use. The staff ERP (`web-admin`) is not shared with students.
4. **The gateway enforces everything.** Which channel (web or phone) a student may use, per school and separately for study and exams, is checked on the server whatever the app says.
5. **The school's question bank is private to the school.** No shared bank and no supplied content in version 1.
6. **Auto-marking is pure and tested** (the same answers and key always give the same marks); written and photo answers are marked by the teacher against a mark scheme; **marks are released by the teacher** and every change after release is audited.
7. **Exams use the server's clock only:** a start window, a fixed duration, one attempt, answers autosaved and kept through a dropped connection, a late submission refused with the answers kept for the teacher.
8. **Live invigilation, if the school and teacher switch it on for an exam:** live video only, **nothing recorded or stored by default**, with a **parent's consent per exam**, a **limit of students per invigilator (default 25)**, and **no automatic detection or penalty** (children's data plan, E-PRIV-7: a human decides). The video provider is an open decision.
9. **The LMS records every answer** and computes the simple school-year analytics itself (a student's own scores over time, by subject and topic; the teacher's class views; the school's coverage), with the existing rules: **no ranks, no classmate names or scores, comparisons only with at least 15 students.** It exposes an **allow-listed internal feed** to the Insights Engine (ids, scores, per-question outcomes, dates; never names, contact details or uploaded files).
10. **The children's data plan applies in full:** parent consent covers student accounts and exam video, retention and erasure cover answers and uploads, no advertising or analytics SDKs, no child details in push text.

## Open decisions (owner; recommendations in `modules/lms.md` section 9)
1. The live video provider and where the video is processed (**needs the lawyer and the sub-processor register**; prices, terms and regions are **unverified here**).
2. The cut-off grade (**recommended 6**).
3. How a student signs in without a personal email (**needs a short test of Firebase Auth** before P8-2).
4. Marking arrangements (by question across students; whether exams need a second marker).
5. Evidence when cheating is suspected without recordings (a note and the roster only, by this decision).
6. Teacher web access for authoring (a small LMS-only set of screens).

## Consequences
- **The launch moves to the end.** The owner decided (2026-11-16) that nothing is released to a school until the LMS (Phase 8) **and** the Academic Insights Engine (Phase 7) are complete. The order is Phase 5's remainder, then **Phase 8 (this ADR), then Phase 7, then Phase 6 (Launch)**; the LMS comes first because the engine reads the per-question answers the LMS records. This is **months** of building before the first school sees anything. What it buys: one security review, one load test and one privacy review over the finished product, and a pilot with the whole offer. What it costs, said plainly: **no real school feedback until the end**, and the risk that what is built first is the least tested against real use. `main` is 400+ commits behind `staging` already; a **staging release rehearsal** every so often (not launch work) keeps the first production release from being the first time it is tried, and **long-lead owner actions** (the lawyer, the translation reviewers, the store accounts) can start early because they take weeks and need no code.
- **Live invigilation (P8-13)** waits for the lawyer's view of live video of children but no longer holds back a pilot: the whole launch is after Phase 8, so P8-13 and the lawyer's answer are on the same critical path and should be started together.
- **The Insights Engine (Phase 7) changes shape.** Its workbook authoring and student answering move into the LMS; the engine keeps the analytics, calendar profiles and policy packs and reads the LMS feed. `modules/academic-insights-engine.md` and the P7 tasks need a pass once this is accepted (the P7 tasks for workbooks become LMS tasks).
- **Roles:** the count goes from 14 to 15; documents and evals that state "14 roles" change together.
- **New risk areas** for the security review: minors' accounts, uploads of photographs of children's work, live video, and a time-critical exam load.
- **Teacher web:** the Teacher gains a small set of web screens for authoring and invigilation, a change from the current "Teacher on the phone only" arrangement.
- **Unverified here, to check before building:** Firebase Auth for accounts without a personal email; a live video provider's current price, terms, India region and webcam limits; Data Connect behaviour for a large number of simultaneous autosaves (the load test P8-16 proves it).
