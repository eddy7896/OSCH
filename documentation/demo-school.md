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
| teacher@demo.oruschools.example | Teacher | the "your role works in the mobile app" notice |

## What is in it

Academic year of today's school year (April to March); classes 1 to 5 in sections A and B (10 classes) and 6 subjects; 30 students with
guardians (31 once the admitted applicant counts), placed in classes; 4 admission applications (submitted, under review, accepted,
admitted); 8 staff with salary lines; a fee structure per level (Tuition in three terms, Annual charges), two concessions, invoices up to
today (about 90), about 60% paid in full, 10% half paid, 30% unpaid, one payment reversed, receipts numbered; last month's pay run
approved by the Principal and paid by the Bursar, this month's left as a draft.

Running the script again on a school that exists changes nothing and prints the logins.
