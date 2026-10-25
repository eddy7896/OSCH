"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { StaffPresenceDto, StaffPresenceListDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { regionLocale } from "@/lib/display";
import { ruleKey } from "@/lib/rules";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { Failed, Saved } from "./parts";
import { schoolToday } from "./Attendance";

export interface StaffAttendanceGrants {
  /** Correct a member of staff's times (the staff_attendance update grant). */
  correct: boolean;
}

const RULES: Readonly<Record<string, string>> = { beforeCheckIn: "ttPeriodEnd", needsCheckIn: "satNeedsIn", futureDate: "attFutureDate" };
const TONE: Record<string, "success" | "neutral" | "warning"> = { IN: "success", OUT: "neutral", NONE: "warning" };

/** A moment as `09:15` in Indian Standard Time, the school's day. */
const clock = (iso: string | null, locale: string): string => (iso ? new Intl.DateTimeFormat(regionLocale(locale), { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date(iso)) : "");
/** `09:15` on a date as the moment the gateway stores (Indian Standard Time is 5 hours 30 minutes ahead of UTC). */
const moment = (date: string, time: string): string => new Date(Date.parse(`${date}T${time}:00Z`) - 330 * 60_000).toISOString();
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Who is at work on a date, and HR's correction of the times (P3-11b). Employees check in and out in the mobile apps. */
export function StaffAttendance({ grants }: { grants: StaffAttendanceGrants }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [date, setDate] = useState(schoolToday());
  const [state, reload] = useLoad<StaffPresenceListDto>(api && date ? () => api.staffAttendancePresence({ query: { date } }) : null, `presence-${date}`);
  const [editing, setEditing] = useState<StaffPresenceDto | null>(null);
  const [inTime, setIn] = useState("");
  const [outTime, setOut] = useState("");
  const [message, setMessage] = useState<{ tone: "saved" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const open = (r: StaffPresenceDto) => { setEditing(r); setIn(clock(r.checkIn, "en")); setOut(clock(r.checkOut, "en")); setMessage(null); };
  const valid = (!inTime || TIME.test(inTime)) && (!outTime || TIME.test(outTime)) && (inTime !== "" || outTime !== "");
  const columns: Column<StaffPresenceDto>[] = [
    { key: "name", header: t("navStaff"), render: (r) => <span>{r.staff.name}<span className="block text-caption text-text-muted">{r.staff.employeeId}</span></span> },
    { key: "state", header: t("attStatus"), render: (r) => <Badge tone={TONE[r.state] ?? "neutral"}>{t(`satState${r.state}`)}</Badge> },
    { key: "in", header: t("satIn"), numeric: true, render: (r) => clock(r.checkIn, locale) },
    { key: "out", header: t("satOut"), numeric: true, render: (r) => clock(r.checkOut, locale) },
    ...(grants.correct ? [{ key: "x", header: t("satCorrect"), hideHeader: true, render: (r: StaffPresenceDto) => <Button size="compact" variant="ghost" aria-label={`${t("satCorrect")}: ${r.staff.name}`} onClick={() => open(r)}>{t("satCorrect")}</Button> }] : []),
  ];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navStaffAttendance")}</h1>
      <p className="text-body text-text-muted">{t("satTitleNote")}</p>
      <TextField size="comfortable" type="date" label={t("attDate")} value={date} max={schoolToday()} onChange={(e) => { setDate(e.target.value); setEditing(null); }} className="max-w-xs" />
      {message?.tone === "saved" && <Saved>{message.text}</Saved>}
      {message?.tone === "error" && <Banner tone="danger" title={message.text} />}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && (state.data.items.length === 0 ? <Card><EmptyState title={t("satNone")} headingLevel={2} /></Card> : <DataTable caption={t("navStaffAttendance")} columns={columns} rows={state.data.items} rowKey={(r) => r.staff.id} />)}
      {editing && grants.correct && (
        <Card title={t("satCorrectTitle", { name: editing.staff.name })} headingLevel={2}>
          <form className="flex flex-wrap items-end gap-3" onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMessage(null);
            try {
              await api!.staffAttendanceCorrect({ path: { staffId: editing.staff.id, date }, body: { ...(inTime ? { checkIn: moment(date, inTime) } : {}), ...(outTime ? { checkOut: moment(date, outTime) } : {}) } });
              setMessage({ tone: "saved", text: t("satSaved") });
              setEditing(null);
              reload();
            } catch (err) {
              setMessage({ tone: "error", text: t(ruleKey(err, RULES, errorKey)) });
            } finally {
              setBusy(false);
            }
          }}>
            <TextField size="comfortable" label={t("satIn")} hint={t("satTimeHint")} inputMode="numeric" placeholder="09:15" value={inTime} onChange={(e) => setIn(e.target.value)} />
            <TextField size="comfortable" label={t("satOut")} inputMode="numeric" placeholder="16:30" value={outTime} onChange={(e) => setOut(e.target.value)} />
            <Button type="submit" variant="primary" size="comfortable" disabled={busy || !valid}>{t("actionSave")}</Button>
            <Button size="comfortable" onClick={() => setEditing(null)}>{t("actionCancel")}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
