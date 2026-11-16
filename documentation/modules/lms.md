# The learning system for students (LMS)

Status: **plan, written 2026-11-16 from the owner's answers in chat; ADR-0019 proposed.** Decision record: `documentation/decisions/ADR-0019-lms-students-and-virtual-exams.md`. Nothing here exists in code or schema. Tasks: Phase 8 (P8-1 to P8-16) in `documentation/project_plan.md` and the Project Hub.

## 1. What it is
A place where **students** study and are examined, on the **web and on the phone**: they open workbooks and worksheets, take tests, sit **virtual (at-home) examinations**, see their marks, the teacher's comments and **analytics about their own progress**. A school chooses where its students may use it (web, phone or both). Teachers write the questions and mark what cannot be marked by machine. Parents see the same progress, read only, in the Parent app.

It sits next to the school ERP and the existing apps; it does not replace them. It is **a second product that shares data with the Academic Insights Engine** (ADR-0017): the LMS records every answer to every question (the "per-question data" the engine was waiting for); the engine turns that and the school's marks into the long-run analytics, calendar profiles and policy packs.

## 2. Who uses it
| Who | How | Notes |
|---|---|---|
| **Student, grade 6 and up (default)** | Own account, on the **Student web app** (`apps/web-student`) or the **Student phone app** (`apps/mobile-student`) | A new `STUDENT` role. The school creates the account; no personal email needed. |
| **Student below that grade** | **Student mode** inside the **Parent app**, on the parent's phone, behind a PIN the parent sets | No account of their own. Work is recorded against the child, with the parent as the signed-in person. |
| **Teacher** | Writes questions, builds and assigns assessments, marks written and photo answers, invigilates exams, reads class analytics | Authoring is a desk task: on the **web** first (the Teacher role gets web screens for this only; the day-to-day Teacher work stays on the phone). The Teacher app can assign, review and mark. |
| **Academic admin, Principal** | Read results and analytics for the school; the Academic admin may create assessments for any class | The Principal approves nothing here (ADR-0007: only the Principal approves, and nothing in this module is an approval). |
| **System Admin** | Creates student accounts, sets the school's LMS settings (web, phone or both, for study and for exams) | Grants roles as always (ADR-0007). |
| **Parent** | Reads the child's results, feedback and analytics (read only); gives the consent a virtual exam with live invigilation needs | In the Parent app. |

The cut-off grade (default **6**) is a school setting; the owner's rule is "both, by age".

## 3. The parts

### 3.1 Questions and the school's question bank
Each school keeps **its own bank**; teachers write, reuse and share questions **inside the school**. Nothing crosses schools (no shared bank, no supplied content in version 1). A question has a type, the words, a subject, grade, topic and difficulty, a mark value, an explanation shown after marking, and a version (a question used in a marked attempt is never changed in place: a new version is made).

**Types in version 1** (the owner asked for all four groups):
- **Auto-marked:** multiple choice (one or several correct), true or false, **fill in the blank** (accepted spellings, case and spacing rules), **numeric** (with a tolerance), **matching**.
- **Teacher-marked:** **short and long written answers** against a mark scheme (a rubric of points the teacher ticks).
- **Photo or file of handwritten work:** the student photographs a worksheet or notebook page and uploads it (private bucket, size and type limits, orientation fixed on the phone); the teacher marks it on screen with the same mark scheme and can annotate.

Languages: question text and options are written in **one language by the teacher** (like messages, ADR-0018 decision 6); the screens around them are in the student's chosen language, with Hindi and Urdu and right-to-left tested (matching and numeric keyboards included).

### 3.2 Assessments: workbook, test, exam
| Kind | What it is | Timing | Marking |
|---|---|---|---|
| **Workbook / worksheet** | Practice and homework: questions with explanations | No clock; saved as the student goes; may be retried if the teacher allows | Auto-marked parts at once; written parts when the teacher gets to them |
| **Test** | A graded quiz | Optional time limit; a due date | As above |
| **Virtual exam** | An at-home examination | A **start window** and a **fixed duration enforced by the server**, one attempt, optional per-student time extension | As above; results released by the teacher |

An assessment is made from the bank (or with new questions), then **assigned** to classes or chosen students with: window, duration, number of attempts, whether questions and options are shuffled, whether and when answers and marks are shown, and which channels it may be taken on (limited by the school's setting).

### 3.3 Taking one
- **Autosave** on every answer, on the phone first (offline-first for workbooks and tests that allow it), sent when there is a connection; an exam needs a connection to start and to submit, and survives drops in between (answers are kept on the phone and sent on reconnect; the server's clock is the only clock).
- **One attempt in progress at a time**, resumable on the same or another device (it moves; it never runs twice).
- A **submitted attempt is final**; a late submission after the window is refused with the answers kept for the teacher to decide.
- Large text, screen-reader labels, tap targets of at least 48 px (the Driver size is not needed), low-bandwidth friendly (no video unless live invigilation is on).

### 3.4 Marking and feedback
Auto-marking is a **pure, tested function** (the same answers and key always give the same marks). Teacher marking is a **queue** per assessment: by question across students (faster) or by student. Marks, comments and a final score are **released by the teacher**; every change after release is audited (who, when, from what to what). A student may ask for a **review**, which goes to the teacher as a request (the teacher decides; nothing automatic).

### 3.5 Virtual examinations and **live remote invigilation**
The owner chose **optional live remote invigilation**: during an exam the teacher (or another invigilator) watches **live video** of several students at once, and talks to them if needed. Decisions taken:
- **Live only; nothing recorded by default.** No stored video, no stored snapshots. (If a school wants evidence kept, that is a separate decision with the lawyer's view; it is not part of version 1.)
- **Optional, per exam**, switched on by the teacher and allowed or refused by the school's setting.
- **Consent per exam from a parent** (collected in the Parent app, recorded like the privacy consent, `ConsentRecord` with a purpose `EXAM_VIDEO`); without it the student sits the exam without video or a school may refuse the exam. A student who declines is never penalised automatically.
- **Humans decide.** The invigilator sees tiles with the connection state and a roster; "looks away" or "multiple faces" detection is **not** built (E-PRIV-7: no automated decision about a child). The invigilator can add a note and ask the teacher to look; any action against a student is the teacher's, in the audit trail.
- **A limit of students per invigilator** (default 25) and a **second invigilator** option; a roster shows who is connected, disconnected, submitted.
- **Video service:** a live video provider is needed (WebRTC). The choice (self-hosted or a vendor, and where the video is processed) is an **open decision** (section 9), subject to the sub-processor register (P6-5g) and the lawyer. Version 1 must work on weak connections: video quality drops first, answers never depend on video.
- **Device checks before the exam:** camera, microphone and connection test; a student whose device cannot join video joins as "audio only" or "no video" according to the teacher's rule for that exam.

### 3.6 Analytics for the student
For a student: scores over time by subject and topic, strengths and gaps by topic, time taken, attempts, completion, and the teacher's comments, in a kind sentence with a next step (the Parent-app wording rule, ADR-0017 D6). For a teacher: the class by question (which questions most students missed), by topic, the marking queue, who has not started. For the school: assessment coverage and completion. **No ranks, no classmate names or scores; class comparisons only with at least 15 students** (children's data plan, D10).

The LMS computes the simple, school-year views itself (they are queries over the answers). The **Insights Engine** (ADR-0017) later adds long-run progression, calendar profiles and policy packs on the same data; the LMS exposes an **allow-listed internal feed** to it (ids, scores, per-question outcomes, dates; never names, contact details or uploaded files, E-PRIV-2).

### 3.7 Where students may use it (the school's setting)
The System Admin sets, **per school**, where **study** (workbooks, tests) and **virtual exams** may be taken: web, phone or both (for example: study on both, exams on a computer only). **The gateway enforces it** (a request from a channel that is not allowed is refused whatever the app says). Each app reports which channel it is in a request header the gateway trusts only together with the app's own check.

## 4. How it fits the system
- **Gateway:** new modules under `/v1/lms/...` (questions, assessments, assignments, attempts, marking, results, analytics, invigilation). Every route has `@Permission`, tenancy from the membership, an audit decision, DTO validation, samples and the generated matrix coverage, like every other route. No client talks to the database.
- **Role:** `STUDENT` is added in the three places together (`ROLES`, the Data Connect `SchoolRole` enum, the matrix) with the evals that enforce it. A student's scope is **own** (`own`): only their own attempts and results. A student never reads the roster, other students, staff or any ERP data.
- **Parent-app student mode:** the Parent app sends the parent's token plus the child's id (`X-Student-Id`), and the gateway accepts it only on the LMS study and exam routes, only for a child the parent is linked to, and records the parent as the signed-in person. Fees, messages and everything else stay behind the parent's own mode.
- **Accounts:** created by the System Admin like staff and driver accounts (ADR-0011): a bulk "create accounts for this class" with a first sign-in that forces a new password; no personal email needed (a synthetic sign-in name per school; the exact scheme is open decision 3).
- **Offline:** like the other phone apps (ADR-0003, ADR-0014): answers are outbox entries with a `clientId`, the question set of an assigned assessment is copied to the phone when it is assigned, and a server clock decides every deadline.
- **Storage:** uploads in the private bucket under `schools/<school>/lms/...` with the same presigned flow as student documents; downloads only for the marking teacher and the student.
- **Tenancy:** every operation takes `$schoolId` and filters by it; a student of school A never reaches school B's questions or answers (E-TEN).

## 5. Data (planned names, Data Connect)
`Question`, `QuestionVersion`, `Assessment`, `AssessmentItem` (a question version in an assessment with its marks), `Assignment` (to a class or students, the window, duration, attempts, shuffle, release rules, channels), `Attempt` (student, assignment, state, started, submitted, expires), `Response` (attempt, item, answer, server time), `Mark` (response, marks, by `AUTO` or a teacher, comment), `ResponseUpload` (key, size, type), `Review` (a student's request), `InvigilationSession`, `InvigilationNote`, `LmsSetting` (per school: channels, cut-off grade, limits), `ConsentRecord` (extended with the exam-video purpose). Marks and counts are integers (tenths of a mark, like the gradebook); times are server times.

## 6. Privacy and safety (the children's data plan applies in full)
- Student accounts are **children's data**: parent consent covers them (the consent flow of P6-5c is extended to student accounts and to exam video); retention, export and erasure (P6-5e) cover answers, uploads and results.
- **No advertising, no analytics SDKs** (E-PRIV-1 already enforced in the build); **no push text about a child** (E-PRIV-5); the student apps get the same rules.
- **No automated decision** about a child's placement, fees, status or discipline from a mark, a flag or a connection state (E-PRIV-7).
- **Live video is not stored.** Photo uploads of handwritten work are the student's own work, stored privately, readable only by the marking teacher, the student and the System Admin's audit trail, and removed under the retention schedule.
- A **lawyer review** of student accounts for minors, parental consent for exam video, and live video of children is a **gate** (P8-1); the live video part waits for it, the rest does not need to.

## 7. Work (also in the Hub, Phase 8)
| ID | Task | Gate |
|---|---|---|
| P8-1 | ADR-0019 accepted; lawyer review of student accounts, exam-video consent and live video of children (**owner action**); live video provider chosen; the cut-off grade and the account sign-in scheme confirmed | ADR accepted; the review recorded in the ADR |
| P8-2 | The `STUDENT` role (ROLES, enum, matrix, evals), `LmsSetting` (channels, cut-off), student accounts by the System Admin (single and a whole class), first sign-in, the web screens for them | E-RBAC, E-TEN, E-LMS-1 |
| P8-3 | Question bank: all question types, versions, tags, the auto-marking functions (pure and tested), authoring on the web | E-LMS-2 |
| P8-4 | Assessments and assignments: build from the bank, assign to classes, windows, durations, attempts, shuffle, release rules, channels | E-LMS-3 |
| P8-5 | Attempts and the exam engine, server side: start, autosave, resume, submit, expiry, time extensions, late submission handling, the server clock | E-LMS-4, E-LMS-5 |
| P8-6 | Marking: auto-marking on submit, the teacher queue, mark schemes, photo marking, release, review requests, audit | E-LMS-6 |
| P8-7 | **Student web app** (`apps/web-student`): sign in, home (due, results), take workbooks, tests and exams, results and feedback, the channel rules | E-LMS-7 |
| P8-8 | **Student phone app** (`apps/mobile-student`): the same, offline-first for workbooks and tests, photo capture for handwritten work | E-LMS-7, E-SYNC |
| P8-9 | **Student mode in the Parent app** for younger students: PIN, the child switcher, the study and exam routes with `X-Student-Id` | E-LMS-8, E-RBAC (linked scope) |
| P8-10 | Student analytics (the student's own views; the teacher's class views; the school's), the Parent app's read-only view | E-LMS-9, E-INS-2 (15-student rule) |
| P8-11 | The internal feed to the Insights Engine (allow-list) and the contract with ADR-0017's engine | E-PRIV-2 |
| P8-12 | Exam consent: the per-exam video consent in the Parent app, recorded and withdrawable | E-PRIV-3 extended |
| P8-13 | **Live invigilation**: the video service, the invigilator console (tiles, roster, notes), device checks, limits, the "no recording" proof, weak-connection behaviour | E-LMS-10, E-PRIV-7 |
| P8-14 | Accessibility, languages and right to left for exams; low-bandwidth mode; large text | E-I18N, E-A11Y |
| P8-15 | Retention, export and erasure for LMS data (with P6-5e); the sub-processor entry for the video service (with P6-5g) | E-PRIV-4, E-PRIV-6 |
| P8-16 | Phase gate: evals, the security review (P6-2) covering the LMS, a load test of a 2,000-student exam window (starts, autosaves and submits at once), the privacy review | |

## 8. Evals to write first
- **E-LMS-1** a student account can sign in only through its school; a student reads nothing of the ERP (a generated matrix: every route refuses the role except the LMS study routes).
- **E-LMS-2** the auto-marking functions: the same answers and key always give the same marks; a numeric tolerance, accepted spellings and multi-answer questions are exact.
- **E-LMS-3** an assignment reaches only its class or chosen students; a student of another school or class cannot start it.
- **E-LMS-4** the exam clock is the server's: a start before the window, a submission after expiry, and a second attempt are refused; a device clock set forward or back changes nothing.
- **E-LMS-5** a dropped connection loses no answer: answers saved on the phone reach the server once, in order, with no duplicate (replayed twice, one result).
- **E-LMS-6** a mark after release is audited with its old and new value; a student cannot change a mark or read another's.
- **E-LMS-7** the school's channel setting is enforced by the gateway, not the app (a request from a refused channel is refused).
- **E-LMS-8** a parent can open student mode only for their linked child; the child session cannot reach fees, messages or any other mode.
- **E-LMS-9** an analytics view with fewer than 15 students shows no comparison; no view names another child.
- **E-LMS-10** live invigilation stores no video or snapshot; the invigilator console offers no automatic penalty; the student limit per invigilator is enforced.
- Plus the children's data evals of `modules/children-data-protection.md` (E-PRIV-1 to E-PRIV-7) applied to the new routes and apps.

## 9. Open decisions (need the owner, marked **recommended**)
1. **Live video provider and where the video runs.** Options: a self-hosted open-source media server, or a hosted service. **Recommended:** choose after the lawyer's view and the sub-processor register entry; prefer a provider with data processed in India; check its price at 25 students per invigilator. **Unverified here:** any provider's current price, terms, India region and webcam limits; read them from the provider's own documents when P8-13 starts.
2. **The cut-off between Student mode and own accounts.** **Recommended: grade 6.** A school may set it.
3. **How a student signs in without a personal email.** **Recommended:** a school-scoped sign-in name with a temporary password set by the System Admin, changed at first use, with the gateway creating the account like staff accounts (ADR-0011). **Unverified:** that Firebase Auth supports this cleanly without a real mailbox; it needs a short test before P8-2.
4. **Written marks.** Whether teachers mark by question across students (**recommended default**) or by student, and whether a second marker is needed for exams.
5. **Evidence if cheating is suspected.** With no recording, the invigilator's note and the roster are the only evidence. A school that needs stored evidence needs a separate decision and the lawyer's view.
6. **Teacher web access.** The Teacher role currently has only Announcements on the web by design; authoring needs more. **Recommended:** a small, separate set of LMS screens for the Teacher on the web, not the whole ERP.
7. **Publishing the Student apps in the stores** (names, icons, age rating for children) is part of P6-7 and needs its own review.

## 10. What this is not
Not a shared question bank across schools, not supplied curriculum content, not automatic cheating detection, not stored exam video, not grading by AI, and not a replacement for the gradebook (an exam's marks can be sent to the gradebook by the teacher, a later step).
