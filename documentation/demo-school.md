# The demo school (local only)

A school with people to sign in as, on your own machine, so the whole ERP can be clicked through. Made by `tools/seed-demo-school.mjs`
through the real gateway, so the data obeys the same rules as real data.

**It never touches your real Firebase project.** Every demo account shares one published password (`demo-pass-2027`), so the script
refuses to run unless the Firebase **Auth emulator** is configured (`FIREBASE_AUTH_EMULATOR_HOST`) and refuses `NODE_ENV=production`
(eval E-DEMO-1, E-DEMO-2). Those accounts cannot be created in a real project by this script. Do not add them to one by hand.

## Run it

```bash
npm run demo
```

Stop your normal `npm run dev` for **web-admin** and **saas-admin** first (Next allows one dev server per app folder). The gateway on 3000
can keep running: the demo gateway uses 3100. The command starts the emulators, a gateway on 3100, makes the school, then starts
web-admin on 3102 and saas-admin on 3101, all pointed at the emulators. Your `.env.local` is not changed. Ctrl-C stops everything and the
demo data disappears (the emulators keep data in memory only); run it again for a fresh school.

- School: http://greenfield.localhost:3102 (the address `demo` is reserved by the gateway, so the school is `greenfield`)
- Platform owner app: http://localhost:3101

**One click, including the phone apps:** `./start-all.sh` starts the same stack, boots an iOS simulator, builds the four Flutter apps against it, installs them and opens the Teacher app (`python3 start-all-gui.py` opens a window for the same thing: pick the simulator and the apps, and watch the build progress, console and logs; settings are listed at the top of the script; set `FLUTTER=` to the repaired Flutter from `environment.md` if the native packages fail to build).

By hand instead (the steps are at the top of `tools/seed-demo-school.mjs`): emulators, the gateway with `FIREBASE_AUTH_EMULATOR_HOST` and
`DATA_CONNECT_EMULATOR_HOST`, then `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node tools/seed-demo-school.mjs`, and the web apps with
`NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`. The browser only connects to the emulator in a development build: in a
production build `config.authEmulatorHost` is always empty.

## The accounts (password for all: `demo-pass-2027`)

| Email | Role | Try |
|---|---|---|
| owner@demo.oruschools.example | Platform owner | saas-admin: schools list, create, suspend |
| admin@demo.oruschools.example | System administrator | Users and roles, settings, staff (no academics or finance, by design) |
| principal@demo.oruschools.example | Principal | everything read-only; approves payroll |
| management@demo.oruschools.example | Management | dashboards and reports; finance totals without names |
| bursar@demo.oruschools.example | Bursar | fees, invoices, payments, reverse a payment, pay payroll |
| accountant@demo.oruschools.example | Accountant | record payments (cannot reverse or delete) |
| academic@demo.oruschools.example | Academic administrator | students, classes, subjects, years, admissions |
| hr@demo.oruschools.example | HR manager | staff, salaries, pay runs, HR reports (cannot approve or pay) |
| admissions@demo.oruschools.example | Admissions officer | applications, decisions, admitting |
| teacher@demo.oruschools.example | Teacher (Tara Teacher) | the "your role works in the mobile app" notice; her half-day sick leave is pending, one request rejected, one cancelled |
| transport@demo.oruschools.example | Transport manager (Tarun) | Transport: vehicles, routes, stops, seating students, who rides |
| driver@demo.oruschools.example | Driver (Salim Dar) | the driver of the North loop (the Driver app is not built yet) |
| parent@demo.oruschools.example | Parent (Parvati Rao) | the Parent app: one child, in the first class, who rides the North loop |
| office@demo.oruschools.example | Staff (Geeta Kulkarni, the clerk) | the Staff app: she is not checked in today, so Check in / Check out can be tried |
| sunita@ / vikram@ / farida@demo.oruschools.example | Teachers | the same notice; Sunita has leave asked for and one approved, Vikram's approved leave needs cover, Farida's unpaid leave proposes a deduction |

## What is in it

Academic year of today's school year (April to March); classes 1 to 5 in sections A and B (10 classes) and 6 subjects; 30 students with
guardians (31 once the admitted applicant counts), placed in classes; 4 admission applications (submitted, under review, accepted,
admitted); 9 staff with salary lines (four of them teachers who can sign in, with their subjects and class teacher links); a fee structure per level (Tuition in three terms, Annual charges), two concessions, invoices up to
today (about 90), about 60% paid in full, 10% half paid, 30% unpaid, one payment reversed, receipts numbered; last month's pay run
approved by the Principal and paid by the Bursar, this month's left as a draft.

**Phase 5 (transport and the parent):** two buses, a morning and an afternoon North loop with three stops each (the driver is Salim Dar), a South loop, eight students seated, and a parent account linked to the first student.

**Phase 3 (the academic engine):** the standard bell schedule (8 teaching periods, Monday to Saturday); a timetable of about 150 lessons for the first
four classes (the gateway refuses clashes, so the seed tries the next teacher of a subject); 20 working days of attendance for those classes, with
a few absences, late arrivals, medical and half days (days older than five are locked and one locked day was corrected, so the audit log has a
correction); staff check-in and out times for two days (one person not in today); the standard grade bands, two terms, nine exams in Term 1
with marks (one student absent, one not yet marked, so a report card shows a pending note); three leave types (Casual 12 days, Sick 7.5, Unpaid)
and leave in every state: approved in the past (balance reduced), approved in the future (its lessons need cover on the Substitutions board, the
first lesson already has a substitute), approved unpaid in this month (a deduction is proposed in the draft pay run for HR to apply), pending,
a pending half day, rejected with a note and cancelled; and the notices all of this caused (the Principal's inbox, the Academic administrator's,
HR's, and Tara's: "You are covering a class").

Try, as the Academic administrator: Timetable, Attendance (today is "not taken yet" for every class), Gradebook (marks, report cards), Substitutions;
as the Principal: Leave (approve or reject the pending ones); as HR: the draft pay run (apply the proposed unpaid-leave deduction), Leave, Staff attendance;
as anyone: the bell in the top bar.

Running the script again on a school that exists changes nothing and prints the logins.
