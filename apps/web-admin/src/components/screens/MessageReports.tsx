"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ReportDetailDto, ReportDto, ReportListDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { regionLocale } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { Failed, Saved } from "./parts";

const day = (iso: string, locale: string): string => new Intl.DateTimeFormat(regionLocale(locale), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

/** The conversation around one reported message, read by the Principal. */
function Conversation({ id }: { id: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [state, reload] = useLoad<ReportDetailDto>(api ? () => api.messageReportsOne({ path: { id } }) : null, `message-report-${id}`);
  if (state.status === "loading") return <Banner tone="info" title={t("statusLoading")} />;
  if (state.status === "error") return <Failed messageKey={state.messageKey} retry={reload} />;
  return (
    <ol className="flex flex-col gap-2">
      {state.data.conversation.map((m) => (
        <li key={m.id} className={`rounded-md border p-3 ${m.reported ? "border-danger-fg" : "border-border"}`}>
          <p className="text-caption text-text-muted">{m.sender.name} · {day(m.sentAt, locale)}</p>
          <p className="whitespace-pre-line text-body">{m.body}</p>
          <p className="flex gap-2 pt-1">
            {m.hidden && <Badge tone="neutral">{t("mrpHiddenTag")}</Badge>}
            {m.reported && <Badge tone="danger">{t("mrpReportedTag")}</Badge>}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** Messages a person reported (ADR-0018 decision 7). Waiting reports come first. The Principal reads the whole conversation and closes the report; a note goes to the audit trail. */
export function MessageReports({ grants }: { grants: { close: boolean } }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [state, reload] = useLoad<ReportListDto>(api ? () => api.messageReportsList({}) : null, "message-reports");
  const [open, setOpen] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "saved" | "error"; text: string } | null>(null);
  const close = async (r: ReportDto) => {
    setBusy(true);
    setMessage(null);
    try {
      await api!.messageReportsClose({ path: { id: r.id }, body: note.trim() === "" ? {} : { note: note.trim() } });
      setMessage({ tone: "saved", text: t("mrpClosed") });
      setNote("");
      reload();
    } catch (err) {
      setMessage({ tone: "error", text: t(errorKey(err)) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("mrpTitle")}</h1>
      <p className="text-body text-text-muted">{t("mrpNote")}</p>
      {message?.tone === "saved" && <Saved>{message.text}</Saved>}
      {message?.tone === "error" && <Banner tone="danger" title={message.text} />}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && state.data.items.length === 0 && <Card><EmptyState title={t("mrpNone")} headingLevel={2} /></Card>}
      {state.status === "ready" && state.data.items.map((r) => (
        <Card key={r.id} title={`${r.message.sender.name}: ${r.message.body.slice(0, 80)}`} headingLevel={2}>
          <div className="flex flex-col gap-2">
            <p className="flex flex-wrap items-center gap-2">
              <Badge tone={r.reviewed ? "neutral" : "warning"}>{r.reviewed ? t("mrpReviewed") : t("mrpWaiting")}</Badge>
              {r.message.hidden && <Badge tone="neutral">{t("mrpHiddenTag")}</Badge>}
            </p>
            <p className="text-caption text-text-muted">{t("mrpBy", { name: r.reportedBy.name, date: day(r.reportedAt, locale) })}</p>
            <p className="text-caption text-text-muted">{t("mrpAbout", { student: r.message.student.name, staff: r.message.staff.name, guardian: r.message.guardian.name })}</p>
            {r.note && <p className="text-body">{t("mrpTheirNote", { note: r.note })}</p>}
            <p className="whitespace-pre-line text-body">{r.message.body}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="compact" variant="ghost" aria-label={`${open === r.id ? t("mrpHide") : t("mrpOpen")}: ${r.message.sender.name}`} onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? t("mrpHide") : t("mrpOpen")}</Button>
            </div>
            {open === r.id && <Conversation id={r.id} />}
            {open === r.id && grants.close && !r.reviewed && (
              <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void close(r); }}>
                <TextField size="comfortable" multiline label={t("mrpFieldNote")} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
                <div><Button type="submit" variant="primary" size="comfortable" disabled={busy}>{t("mrpClose")}</Button></div>
              </form>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
