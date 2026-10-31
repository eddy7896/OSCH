# Academic Insights Engine (plan, nothing built)

Status: **plan; ADR-0017 accepted in part 2026-10-31 (D1 to D7 and D10 answered).** Decision record: `documentation/decisions/ADR-0017-academic-insights-engine.md`. Nothing here exists in code or schema. Tasks: Phase 7 (P7-1 to P7-14) in `documentation/project_plan.md` and the Project Hub.

## 1. What the owner asked for
1. A **separate microservice** that tracks each student's progression and growth through the year.
2. It **checks whether the school follows the Jammu and Kashmir summer or winter academic year and updates the school accordingly.**
3. It follows **NEP 2020**, the **local state policies** and the **board/system the school follows**.
4. It produces **13 visualisations** for the Parent, Teacher and School Admin apps (section 6).
5. **Teachers create and publish workbooks and worksheets** that students answer in the Parent app; the engine analyses the answers (section 7).

## 2. The academic calendar profile (item 2)

### What is known (checked 2026-10-31; sources are news reports, the official JKBOSE notices were not read)
- JKBOSE runs two sessions by zone. For the **Kashmir division, the winter zone of the Jammu division and Ladakh** the session is counted as 2024-25 with annual exams for Classes 9 to 12 in **October-November 2025**; for the **Jammu summer zone** the session is counted as 2025-26 with exams in **March-April 2026**. The board restored the October-November session in May 2025 after having moved away from it, so **the dates are not stable year to year**. Sources: [Daily Excelsior](https://www.dailyexcelsior.com/?p=1989704), [Kashmir Life](https://kashmirlife.net/jammu-and-kashmir-jkbose-restores-october-november-exam-session-391718/), [Greater Kashmir](https://m.greaterkashmir.com/article/jkbose-notifies-restoration-of-november-session-for-class-10-12-exams-in-kashmir-winter-zone-jammu/399535/amp).
- Vacations in the 2024-25 calendar: a summer break in June and July for the Jammu summer zone, a short (about 10 days) summer break for Kashmir and the winter zone; the long winter break (about three months) is the Kashmir winter break the owner described. **No reliable 2026 vacation dates were found.**
- **Unverified:** exact vacation dates for any year, and whether private schools outside the board follow the same dates.

### Design (therefore)
- A school setting **`calendarProfile`**: `JK_WINTER_ZONE` (Kashmir division, winter-zone Jammu, Ladakh), `JK_SUMMER_ZONE` (Jammu summer zone), `STANDARD_APR_MAR`, or `CUSTOM`. The System Admin picks it at onboarding or in Settings; **the engine never guesses the zone from an address** (language and zone are explicit choices, as with ADR-0006).
- A profile is **data, not code**: for each academic year it holds the session start and end, terms, vacation windows (winter break, summer break, short breaks), exam windows (unit tests, mid-term, annual) and the board's cut-off dates. Starter values are **proposals marked draft** until a person confirms them from the board's notice.
- **"Update the school accordingly" means:** the engine compares the school's academic year, terms and holidays with the profile and raises a **calendar proposal** (what would change). A person with the grant (D3) reviews and **applies** it: the existing academic-year, term and holiday data change in one audited step. A confirmed change that falls on days already taken (attendance, marks) is refused or applied only from today, never rewriting history.
- Every other part of the engine reads the calendar profile: chart 5's timeline (Unit Test 1 to Finals, including the Winter Pack), chart 8 (winter or summer vacation), chart 13 (planned tests per window), and the "not taught yet" state of chart 3.

## 3. Policy packs: NEP 2020, the state and the board (item 3)
A **policy pack** is a versioned set of rules the engine uses and the apps explain: `{ id, board/state, version, effectiveFrom, source (document and date), reviewedBy, status: draft | reviewed }`.

| Pack | What it carries | Verified? |
|---|---|---|
| NEP 2020 base | the 5+3+3+4 stage structure (foundational, preparatory, middle, secondary) mapped to classes; competency-based, formative and holistic assessment; the Holistic Progress Card (HPC) | stage structure is well known; **the HPC domain list is unverified** (see below) |
| JKBOSE | session by zone (above), grading and pass rules, the HPC for the secondary stage, the 3x3 rubric (three competency levels: basic, proficient, advanced) introduced in a JKBOSE and PARAKH workshop | partly: the workshop is reported ([JK Monitor](https://jkmonitor.org/index.php/jkbose-organizes-five-day-workshop-on-holistic-progress-card-secondary-stage-standardization-of-question-paper-templates-under-equivalence-of-boards-in-collaboration-with-parakh-ncert)); pass rules not read |
| CBSE | requested by the owner (D2); shipped as draft until its rules are read from CBSE's own documents | no |
| ICSE | requested by the owner (D2); draft likewise | no |
| School overrides | the school may tighten (never loosen) a pack's rule | n/a |

**The brief's four holistic domains** (Cognitive, Socio-emotional, Physical wellbeing, Creative arts) and the 1 to 4 rubric are used as the owner wrote them. A search found PARAKH describing the HPC as a 360-degree tool covering co-curricular, vocational and socio-emotional learning, and a state training deck listing other category names; **nothing confirmed the exact four domains or the 1 to 4 scale**. The domain list and scale are therefore a **configurable part of the NEP pack**, to be checked against the PARAKH HPC documents ([PARAKH](https://ncert.nic.in/parakh/about.php)) before the report card PDF (chart 7) is called official. Likewise "Bloom's levels (JKBOSE PARAKH)" in chart 6: PARAKH has its own taxonomy; the mapping to Bloom's four levels is a pack setting to be confirmed.

Rules a pack may drive: which assessment types exist per stage, pass and promotion rules, how many tests a term should have (chart 13 "planned tests"), which competencies are reported at which stage, and which report card layout is printed. A pack change never alters past results; it applies from its `effectiveFrom`.

## 4. Where the data comes from
| Needed by the engine | Exists today? | Where |
|---|---|---|
| Marks per exam, class, subject; terms; grade bands | **Yes**, per exam and subject only | `/v1/grades` (P3-5) |
| Daily attendance per student | **Yes** | `/v1/attendance` |
| Timetable, class teacher, teacher subjects | **Yes** | `/v1/academics`, `/v1/timetable` |
| Parent-child links | **Yes** | `ParentLink` |
| Approved student leave | **Yes** | `/v1/student-leave` (P5-10) |
| File resources shared by teachers | **Yes** (files only) | `/v1/resources` (P5-11a) |
| Chapters, topics, six competency axes per subject, syllabus plan | **No** | new (P7-4) |
| Questions with topic, axis and Bloom level; marks per question | **No** (marks are per exam, not per question) | new (P7-5) |
| Workbooks and worksheets, students' answers, workbook completion | **No** | new (P7-6) |
| HPC rubric scores by teacher, peer and self | **No** | new (P7-13) |
| Calendar profile, vacation and exam windows | **No** (the school has an academic year and holidays only) | new (P7-3) |
| Planned tests and workbook targets per section and subject | **No** | new (P7-4, P7-12) |

Charts 3, 6, 11 and 2 cannot be drawn from today's data: they need **per-question results**. That is why curriculum, question bank and workbook authoring (P7-4 to P7-6) come before the charts.

## 5. How the numbers are defined (so two people get the same answer)
All scores are integers in tenths of a percent or basis points (no floating point in stored results, as with money in ADR-0004); a chart shows rounded whole percents.
- **topic_mastery** = weighted share of marks earned on questions tagged to the topic, newest evidence weighted more (weights are a pack setting); state: **Not taught yet** (grey) until the syllabus plan marks it taught, **Green** at 75 per cent or more, **Amber** 50 to 74, **Red** below 50 (the brief's thresholds).
- **composite_axis_score** (chart 2) = the mean of the mastery of the topics that feed the axis in the window; **previous_term_axis_score** the same for the previous term.
- **student_subject_score** = percent of marks in the subject over the window; **section_median_score**, **section_mean_score_%** and **grade P75** are computed over the cohort only when it has at least 15 students (D10, answered), otherwise the series is omitted and the chart says why.
- **Workbook Consistency** (chart 1's sixth axis) and **workbook_completion_rate_%** = published items answered on time / items assigned, over the window.
- **effort_score** (chart 10) = attendance share and workbook completion share, weighted; **each school sets the weights** (default 50/50) and the teacher sees them (D7, answered).
- **at-risk bands** (chart 12): Critical (`at_risk_flag`), Watchlist, On-Track, Thriving, from explicit, documented rules over outcome, effort and trend; the rule text is shown to staff beside the flag. A band is a prompt for a person, not a verdict.
- **winter_retention_index** (chart 8) = the share of topics whose mastery after the vacation is at least the mastery before it, among topics practised in the vacation pack.
- **Attendance-to-grade correlation** (chart 9): the change in rolling test score across an absence window, shown only as a plain observation ("marks fell after 6 absences"), never as a causal claim.

Everything is **recomputed from the facts** (idempotent): the same inputs give the same snapshot, a late mark correction triggers a recompute for the affected student, and each snapshot stores the inputs' latest timestamp and the pack version it used.

## 6. The 13 visualisations
Apps: P = Parent, T = Teacher, A = School Admin. Every chart is served as data by `GET /v1/insights/...` (series, thresholds, drill-down ids); nothing is computed on the phone except drawing. Each carries **text labels, icons and patterns as well as colour** (red, amber and green are never the only signal), a data table alternative for screen readers, and works offline from the last snapshot with its "computed at" time.

| # | Chart | Type | Apps | Needs (beyond today) | Privacy and rules |
|---|---|---|---|---|---|
| 1 | Overall multi-subject balance | six-axis radar, student vs section median | P (Home), T (student profile) | six axes incl. Workbook Consistency; section median | median only with a cohort of D10 or more; tapping a vertex opens chart 2 |
| 2 | Subject skill and competency | six-axis radar, this term vs previous term, status dots | P, T | axes per subject (P7-4), questions tagged to axes (P7-5) | a red or amber vertex (<60) opens the linked remedial workbook (P7-6) |
| 3 | Chapter and topic mastery heatmap | colour tile grid | P (Workbooks tab), T | chapters, topics, syllabus plan | grey = not taught yet; a tile shows the missed questions and starts its practice worksheet |
| 4 | Subject performance vs benchmark | grouped bars plus a P75 line | P | section mean, grade P75 | no classmate names or ranks, ever; hidden below D10 |
| 5 | Growth and workbook impact | dual-axis line and area over the calendar's timeline | P, T | calendar profile windows, workbook completion | states correlation as shown, with no causal claim |
| 6 | Bloom and question-type breakdown | four segmented bars | P, T | Bloom level per question | mapping to PARAKH's taxonomy to be confirmed (section 3) |
| 7 | 360-degree NEP holistic progress wheel | rose chart, teacher / peer / self stacked | P, A (report card PDF) | HPC rubric capture (P7-13) | domain list and scale from the pack; PDF is the JKBOSE HPC layout only after the pack is reviewed |
| 8 | Vacation learning tracker | progress ring plus streak calendar | P, A | vacation windows from the profile; vacation pack workbooks | winter break for the winter zone, summer break for Jammu; "streak" shown kindly, never as a penalty |
| 9 | Attendance-to-grade strip | month calendar heatmap plus sparkline | P, T | none beyond today's attendance and marks | observation wording only |
| 10 | Class diagnostic quadrant | 2x2 scatter, effort vs outcome | T (class overview) | effort score (D7) | shown to the class teacher and subject teachers of that section only; the one-tap "message parents" waits for P5-3 |
| 11 | Test item and topic error distribution | stacked horizontal bars | T (post-test review) | per-question results | any topic where more than 40 per cent of the class failed is flagged for re-teaching |
| 12 | School-wide at-risk and cohort health funnel | stacked bars plus KPI cards | A (Principal) | risk bands (D6) | a red stack lists the students and sections: Principal and Academic admin only |
| 13 | Teacher assessment and syllabus velocity | bullet charts by section and subject | A (Principal) | planned tests and curriculum targets | shows activity of the class's own teacher; a policy question for the owner is whether teachers see each other's (proposed: no) |

Drawing: the radar, heatmap, rose and funnel are custom-painted on top of the existing token set; line and bar charts may use one small library chosen in the P7-9 spike (D8). Dark mode is out (ADR-0005). Right to left is checked for Urdu.

## 7. Workbooks and worksheets that students answer (item 5)
- **Authoring (teacher):** a workbook is a titled set of **worksheets**; a worksheet is a set of **items**: multiple choice, true or false, short numeric or text answer, match the following, and (later) written answers marked by the teacher. Each item is tagged with subject, chapter, topic, axis, Bloom level and marks. A teacher authors for a class and subject she teaches (same rule as ADR-0016 resources), saves a draft, previews, and **publishes** to a class, optionally scheduled, with a due date and a flag for "vacation pack".
- **Where she authors:** the web admin first (typing many questions is a desk task); the Teacher app can publish, assign and review. (Owner may ask for phone authoring later.)
- **Answering (student, in the Parent app):** under the child switcher; answers are **saved on the phone and sent once** (an answer set has a `clientId`, like leave), work offline, and the worksheet shows its state (not started, in progress, submitted, marked). Multiple choice and numeric answers are **marked automatically** by the engine from the teacher's key; written answers wait for the teacher. Retakes follow a teacher setting (one attempt, or unlimited practice that does not count towards the score).
- **Analysis:** every answered item feeds topic mastery, axes, Bloom accuracy, completion and effort; the teacher sees the item-level distribution (chart 11).
- **Relation to ADR-0016 resources:** resources are files (PDF, Word, PowerPoint) with comments; workbooks are structured and analysable. A teacher may attach a file resource to a workbook.
- **Not in version 1:** answers by photo of handwriting, automatic marking of written text, timed tests with proctoring, sharing a workbook across schools.

## 8. Privacy, safety and ownership
- Parents see only their linked children; a comparison uses aggregates over at least 15 students (D10, answered) and never another child's identity (E-INS-2).
- Teachers see insights for classes they teach (own scope); the Academic admin and the Principal see school-wide; HR, Bursar and others see none (ADR-0007 silos hold).
- Children's data: purpose limited to the school's teaching; retention follows the school year rules already in ADR-0016 plus a decision at P6-5; **the legal basis and parental consent under the DPDP Act 2023 are unverified here** (D11).
- Every write (publishing a workbook, an answer set, a rubric score, applying a calendar proposal) is audited with actor and time; engine results are derived data and carry the inputs' timestamps and the pack version.
- No emoji in product UI; all strings through `packages/i18n` in English, Hindi and Urdu (Hindi and Urdu drafts until a native reviewer signs them off); chart labels and rubric names are translatable data.

## 9. Tasks (also in the Hub's plan, Phase 7)
| ID | Task | Gate |
|---|---|---|
| P7-1 | ADR-0017 accepted (D1 to D7 and D10 answered 2026-10-31; D8, D9, D11, D12 on recommendation) | done for the answered parts |
| P7-2 | Engine service skeleton: `apps/academic-engine` (NestJS), private network, service credential, health, CI job, OpenAPI, the internal gateway feeds and writeback, "engine down" behaviour (last snapshot with its time) | E-INS-1 |
| P7-3 | Calendar profiles and policy packs: `calendarProfile` setting, profile data (JK winter zone, JK summer zone, standard, custom), proposals and confirm-to-apply, NEP stage mapping, JKBOSE pack (draft), web Settings screen | E-INS-3, E-INS-4 |
| P7-4 | Curriculum map: chapters, topics, six axes per subject, syllabus plan (taught or not yet), planned tests and targets; web screens and CSV import | E-INS-5 |
| P7-5 | Question bank and per-question results: questions with topic, axis, Bloom, marks; teacher test entry by question; import of questions from a spreadsheet or CSV (D5) | E-INS-6 |
| P7-6 | Workbooks and worksheets: P7-6a server (authoring, publish, assign, answer sets, auto-marking), P7-6b web authoring, P7-6c Teacher app assign and review, P7-6d Parent app answering offline | E-WB-1 to E-WB-5 |
| P7-7 | Scoring: mastery, axes, benchmarks, effort, growth, risk bands; recompute jobs; snapshot tables | E-INS-7, E-INS-8 |
| P7-8 | Insights API: `/v1/insights/*` with scope and cohort rules, in the generated matrix | E-INS-2 |
| P7-9 | Chart kit (Flutter and React) incl. accessible tables and the library spike | E-INS-9 |
| P7-10 | Parent app: charts 1 to 9, Workbooks tab | device-tested later |
| P7-11 | Teacher app: charts 1, 2, 3, 5, 6, 9, 10, 11 | |
| P7-12 | School Admin web: charts 8, 12, 13 and the HPC report card PDF (chart 7) | |
| P7-13 | Holistic rubric capture (teacher, peer, self) and the pack-driven HPC layout | after D4 |
| P7-14 | Phase gate: evals, privacy review, load test of a recompute for a 2,000 student school | |

## 10. Evals to write first
- **E-INS-1** the engine accepts only the gateway's service credential on `/internal/insights/*`; a user token, no token, or another school's id is refused; the public OpenAPI does not list those routes.
- **E-INS-2** a parent reads only their linked child's insights; no response to a parent contains another child's name, rank or score; a cohort below D10 returns no comparison (property test over random cohorts).
- **E-INS-3** a calendar proposal changes nothing until applied; applying is audited and never rewrites a taken attendance day or entered mark.
- **E-INS-4** each calendar profile produces the expected windows for the dates the school confirmed (fixtures per profile, with the source named).
- **E-INS-5** a topic is grey until the syllabus plan says it was taught.
- **E-INS-6** a test entered per question sums to the exam's marks.
- **E-INS-7** recomputing the same inputs twice gives byte-identical snapshots; a late mark correction changes exactly the affected student.
- **E-INS-8** the mastery colour bands and the at-risk bands match the written thresholds at their boundaries (49, 50, 74, 75, 59, 60).
- **E-INS-9** every chart has a data-table alternative, text and icon cues beside colour, 13 px text and 48 px targets, and an Urdu right-to-left layout.
- **E-WB-1** a teacher publishes only for a class and subject she teaches; a parent sees only workbooks of the class of a linked child.
- **E-WB-2** answers sent twice leave one answer set (offline replay).
- **E-WB-3** automatic marking agrees with the key for every item type, including partial credit rules.
- **E-WB-4** a due date, a retake rule and a vacation-pack flag behave as set.
- **E-WB-5** engine down: the Parent app still shows the last snapshot with its time and queues answers.

## 11. Not in this plan
Cross-school benchmarking, predictive grades or admission decisions from the data, automatic marking of handwriting or long text, teacher performance scoring beyond chart 13's activity counts, parent-to-parent features, student logins, and any change to ADR-0016's file resources.
