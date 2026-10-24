#!/usr/bin/env node
// Proves, against a real Data Connect database, that concurrent payments get UNIQUE and GAP-FREE receipt numbers (ADR-0012, P2-7b/c).
// The emulator runs one statement at a time, so it cannot prove this; Cloud SQL (read committed, real concurrent transactions) can.
//
//   node tools/prove-receipt-numbers.mjs                       dry run: says what it would do, writes nothing
//   node tools/prove-receipt-numbers.mjs --emulator --apply    against the local emulator (start it first; proves the logic, NOT concurrency)
//   node tools/prove-receipt-numbers.mjs --project oruschools --apply [--payments 60] [--workers 12]
//                                                              against the real database: creates ONE throwaway school ("receipt-proof-..."),
//                                                              pays N small invoices from W parallel workers, checks the numbers, then SUSPENDS the school.
// It uses the same read-counter / write-with-expected-value / retry-on-conflict logic as the gateway (apps/api-gateway/src/fees/invoices.service.ts).
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const apply = flag("--apply");
const emulator = flag("--emulator");
const project = opt("--project", emulator ? "demo-oruschools" : undefined);
const N = Number(opt("--payments", "40"));
const WORKERS = Number(opt("--workers", "10"));
if (!project) {
  console.error("say where: --emulator, or --project <firebase project id>");
  process.exit(2);
}
try {
  process.loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));
} catch {
  /* no master env file: rely on the shell's credentials */
}
if (emulator) process.env.DATA_CONNECT_EMULATOR_HOST ??= "127.0.0.1:9399";
else delete process.env.DATA_CONNECT_EMULATOR_HOST;
console.log(`target: ${emulator ? `the local emulator (${process.env.DATA_CONNECT_EMULATOR_HOST}), which runs one statement at a time` : `REAL project ${project}`}\nplan:   ${N} payments from ${WORKERS} parallel workers into one throwaway school`);
if (!apply) {
  console.log("dry run: nothing written. Add --apply to run it.");
  process.exit(0);
}

const { createDatabase } = await import("../packages/database/dist/index.js");
const db = createDatabase({ projectId: project });
const bare = (u) => u.replaceAll("-", "");
const school = randomUUID(), tag = school.slice(0, 8), actor = `proof-${tag}`;
await db.upsertUser({ id: actor, email: `${actor}@example.invalid` });
await db.provisionSchool({ id: school, name: `receipt-proof-${tag}`, subDomain: `rp-${tag}`, defaultLanguage: "en", actorId: actor });
await db.createSchoolMember({ schoolId: school, userId: actor, schoolRole: "BURSAR" });
const year = randomUUID();
await db.createAcademicYear({ schoolId: school, id: year, name: "PROOF", startDate: "2000-01-01", endDate: "2999-12-31", actorId: actor });
const students = [];
for (let i = 0; i < N; i++) {
  const seq = (await db.applicationSeqInfo({ schoolId: school })).data.school.studentSeq;
  const id = randomUUID();
  await db.createStudent({ schoolId: school, id, expectedSeq: seq, enrollmentId: `S${String(seq + 1).padStart(4, "0")}`, firstName: "Proof", lastName: String(i), actorId: actor });
  const inv = randomUUID();
  await db.createInvoice({ schoolId: school, id: inv, studentId: id, title: "Proof", amountMinor: "100000", dueDate: "2999-01-01", actorId: actor });
  students.push({ id, inv });
}
console.log(`setup done: ${N} students and invoices`);

let retries = 0;
async function pay({ id, inv }) {
  for (let attempt = 1; attempt <= 60; attempt++) {
    const y = (await db.listAcademicYears({ schoolId: school })).data.academicYears.find((x) => bare(x.id) === bare(year));
    try {
      await db.recordPayment({
        schoolId: school, id: randomUUID(), receiptId: randomUUID(), invoiceId: inv, studentId: id, amountMinor: "100000", method: "CASH", paidOn: "2026-01-01", expectedPaidMinor: "0", newPaidMinor: "100000",
        newStatus: "PAID", balanceAfterMinor: "0", receiptYearId: year, expectedReceiptSeq: y.receiptSeq, receiptNumber: `R-PROOF-${String(y.receiptSeq + 1).padStart(5, "0")}`, actorId: actor,
      });
      return;
    } catch (e) {
      if (e.kind === "FORBIDDEN_REFERENCE" || e.kind === "CONFLICT") {
        retries++;
        await new Promise((r) => setTimeout(r, Math.random() * 15 * attempt + 5));
        continue;
      }
      throw e;
    }
  }
  throw new Error("gave up after 60 attempts");
}
const queue = [...students];
const started = Date.now();
await Promise.all(Array.from({ length: WORKERS }, async () => { for (let s = queue.shift(); s; s = queue.shift()) await pay(s); }));
const seconds = ((Date.now() - started) / 1000).toFixed(1);

const receipts = (await db.listReceipts({ schoolId: school, limit: 1000, offset: 0 })).data.receipts;
const serials = receipts.map((r) => r.serial).sort((a, b) => a - b);
const numbers = receipts.map((r) => r.number);
const problems = [];
if (receipts.length !== N) problems.push(`expected ${N} receipts, found ${receipts.length}`);
if (new Set(numbers).size !== numbers.length) problems.push("DUPLICATE receipt numbers");
if (serials.some((s, i) => s !== i + 1)) problems.push(`serials are not exactly 1..${N}: ${serials.slice(0, 5)}...`);
const finalSeq = (await db.listAcademicYears({ schoolId: school })).data.academicYears.find((x) => bare(x.id) === bare(year)).receiptSeq;
if (finalSeq !== N) problems.push(`the year's counter is ${finalSeq}, expected ${N}`);
const paid = (await db.countInvoices({ schoolId: school })).data.invoices[0];
if (paid.paidMinor_sum !== String(BigInt(N) * 100000n)) problems.push(`paid total ${paid.paidMinor_sum}, expected ${BigInt(N) * 100000n}`);
const audits = (await db.listAuditLog({ schoolId: school, limit: 1000, offset: 0 })).data.auditLogs.filter((a) => a.action === "fees.payment.record").length;
if (audits !== N) problems.push(`expected ${N} audit rows, found ${audits}`);

await db.setSubscriptionStatus({ schoolId: school, status: "SUSPENDED", actorId: actor }).catch(() => {});
console.log(`${N} payments in ${seconds}s with ${retries} retries (each retry is a collision that the database refused and the code re-read)`);
if (problems.length) {
  console.error(`\nFAILED\n${problems.map((p) => `  - ${p}`).join("\n")}`);
  process.exit(1);
}
console.log(`\nPASS: ${N} receipts numbered 1..${N}, no duplicate, no gap, paid total exact, ${N} audit rows. The throwaway school receipt-proof-${tag} is suspended.`);
if (emulator) console.log("(Emulator: this proves the logic, not real concurrency. Run it with --project against Cloud SQL for that.)");
process.exit(0);
