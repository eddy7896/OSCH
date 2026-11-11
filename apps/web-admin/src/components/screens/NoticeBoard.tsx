"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ClassListDto, GradeLevelListDto, NoticeDto, NoticeListDto, ReachDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, Checkbox, EmptyState, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { regionLocale } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { Failed, Saved, SelectField } from "./parts";

export interface NoticeBoardGrants {
  post: boolean;
  manage: boolean;
  /** The Bursar posts only Fees and the transport manager only Transport; null means any category. */
  onlyCategory: string | null;
}

const CATEGORIES = ["GENERAL", "HOLIDAY", "EXAM", "EVENT", "FEES", "TRANSPORT"] as const;
const day = (iso: string, locale: string): string => new Intl.DateTimeFormat(regionLocale(locale), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));
/** A `datetime-local` value is the local clock of the browser; the gateway wants an instant. */
const instant = (local: string): string | undefined => (local === "" ? undefined : new Date(local).toISOString());

function Reach({ audience, gradeLevelId, classId }: { audience: string; gradeLevelId: string; classId: string }) {
  const t = useTranslations();
  const { api } = useSession();
  const ready = audience === "ALL_PARENTS" || (audience === "GRADE" && gradeLevelId !== "") || (audience === "CLASS" && classId !== "");
  const [state] = useLoad<ReachDto>(api && ready ? () => api.noticeBoardReach({ query: { audience: audience as never, ...(gradeLevelId && audience === "GRADE" ? { gradeLevelId } : {}), ...(classId && audience === "CLASS" ? { classId } : {}) } }) : null, `reach|${audience}|${gradeLevelId}|${classId}`);
  if (!ready || state.status !== "ready") return null;
  return <p className="text-caption text-text-muted">{state.data.parents === 0 ? t("nbdReachNone") : t("nbdReach", { parents: state.data.parents, students: state.data.students })}</p>;
}

/**
 * The parents' notice board (ADR-0018 decisions 5 and 8): post to all parents, a grade or a class, pin, schedule, withdraw. Shows how many parent accounts a post will tell before it is posted.
 * The Principal and the Academic admin post in any category; the Bursar only Fees and the transport manager only Transport.
 */
export function NoticeBoard({ grants }: { grants: NoticeBoardGrants }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [state, reload] = useLoad<NoticeListDto>(api ? () => api.noticeBoardList({}) : null, "notice-board");
  // Which grades and classes exist needs the academics grant; without it only "all parents" is offered.
  const [levels] = useLoad<GradeLevelListDto>(api && grants.post ? () => api.academicsLevels({}) : null, "nb-levels");
  const [classes] = useLoad<ClassListDto>(api && grants.post ? () => api.academicsClasses({}) : null, "nb-classes");
  const canTarget = levels.status === "ready" && classes.status === "ready";
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>(grants.onlyCategory ?? "GENERAL");
  const [audience, setAudience] = useState("ALL_PARENTS");
  const [gradeLevelId, setGradeLevelId] = useState("");
  const [classId, setClassId] = useState("");
  const [pinned, setPinned] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "saved" | "error"; text: string } | null>(null);
  const items = state.status === "ready" ? state.data.items : [];
  const targetMissing = (audience === "GRADE" && gradeLevelId === "") || (audience === "CLASS" && classId === "");
  const run = async (action: () => Promise<unknown>, done: string, after?: () => void) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await action();
      setMessage({ tone: "saved", text: done === "nbdPosted" ? t("nbdPosted", { told: (result as NoticeDto).told ?? 0 }) : t(done) });
      after?.();
      reload();
    } catch (err) {
      setMessage({ tone: "error", text: t(errorKey(err)) });
    } finally {
      setBusy(false);
    }
  };
  const submit = () =>
    run(() => api!.noticeBoardPost({ body: { title: title.trim(), body: body.trim(), category: category as never, audience: audience as never, pinned, ...(audience === "GRADE" ? { gradeLevelId } : {}), ...(audience === "CLASS" ? { classId } : {}), ...(instant(publishAt) ? { publishAt: instant(publishAt) } : {}), ...(instant(expiresAt) ? { expiresAt: instant(expiresAt) } : {}) } }), "nbdPosted", () => { setTitle(""); setBody(""); setPinned(false); setPublishAt(""); setExpiresAt(""); });
  const togglePin = (n: NoticeDto) =>
    run(() => api!.noticeBoardEdit({ path: { id: n.id }, body: { title: n.title, body: n.body, category: n.category, pinned: !n.pinned, ...(n.publishAt ? { publishAt: n.publishAt } : {}), ...(n.expiresAt ? { expiresAt: n.expiresAt } : {}) } }), "nbdPinChanged");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navNoticeBoard")}</h1>
      <p className="text-body text-text-muted">{t("nbdNote")}</p>
      {grants.post && (
        <Card title={t("nbdPostTitle")} headingLevel={2}>
          <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
            <TextField size="comfortable" label={t("nbdFieldTitle")} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
            <TextField size="comfortable" multiline label={t("nbdFieldBody")} value={body} maxLength={5000} onChange={(e) => setBody(e.target.value)} />
            <SelectField label={t("nbdCategory")} value={category} onChange={setCategory} options={(grants.onlyCategory ? [grants.onlyCategory] : [...CATEGORIES]).map((c) => ({ value: c, label: t(`nbdCat${c}`) }))} />
            <SelectField label={t("nbdAudience")} value={audience} onChange={(v) => { setAudience(v); setGradeLevelId(""); setClassId(""); }} options={[{ value: "ALL_PARENTS", label: t("nbdAudAll") }, ...(canTarget ? [{ value: "GRADE", label: t("nbdAudGrade") }, { value: "CLASS", label: t("nbdAudClass") }] : [])]} />
            {audience === "GRADE" && levels.status === "ready" && <SelectField label={t("nbdGrade")} value={gradeLevelId} onChange={setGradeLevelId} options={[{ value: "", label: "" }, ...levels.data.items.map((l) => ({ value: l.id, label: l.name }))]} />}
            {audience === "CLASS" && classes.status === "ready" && <SelectField label={t("nbdClass")} value={classId} onChange={setClassId} options={[{ value: "", label: "" }, ...classes.data.items.map((c) => ({ value: c.id, label: c.name }))]} />}
            <Checkbox label={t("nbdPinned")} checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            <TextField size="comfortable" type="datetime-local" label={t("nbdPublishAt")} value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
            <TextField size="comfortable" type="datetime-local" label={t("nbdExpiresAt")} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            <Reach audience={audience} gradeLevelId={gradeLevelId} classId={classId} />
            <div><Button type="submit" variant="primary" size="comfortable" disabled={busy || title.trim() === "" || body.trim() === "" || targetMissing}>{t("nbdPost")}</Button></div>
          </form>
        </Card>
      )}
      {message?.tone === "saved" && <Saved>{message.text}</Saved>}
      {message?.tone === "error" && <Banner tone="danger" title={message.text} />}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && items.length === 0 && <Card><EmptyState title={t("nbdNone")} headingLevel={2} /></Card>}
      {items.map((n) => (
        <Card key={n.id} title={n.withdrawn ? t("nbdStateWithdrawn") : n.title} headingLevel={2}>
          <div className="flex flex-col gap-2">
            <p className="flex flex-wrap items-center gap-2">
              <Badge tone={n.state === "LIVE" ? "success" : n.state === "SCHEDULED" ? "info" : "neutral"}>{t(`nbdState${n.state === "LIVE" ? "Live" : n.state === "SCHEDULED" ? "Scheduled" : n.state === "EXPIRED" ? "Expired" : "Withdrawn"}`)}</Badge>
              <Badge tone="neutral">{t(`nbdCat${n.category}`)}</Badge>
              {n.pinned && <Badge tone="warning">{t("nbdPinnedTag")}</Badge>}
            </p>
            <p className="text-caption text-text-muted">{n.audience === "ALL_PARENTS" ? t("nbdAudAll") : t("nbdFor", { target: n.target ?? "" })} · {n.author.name}, {day(n.createdAt, locale)}</p>
            {n.publishAt && <p className="text-caption text-text-muted">{t("nbdPublishAt")}: {day(n.publishAt, locale)}</p>}
            {n.expiresAt && <p className="text-caption text-text-muted">{t("nbdExpiresAt")}: {day(n.expiresAt, locale)}</p>}
            {!n.withdrawn && <p className="whitespace-pre-line text-body">{n.body}</p>}
            {grants.manage && !n.withdrawn && (
              <div className="flex flex-wrap gap-2">
                <Button size="compact" variant="ghost" aria-label={`${n.pinned ? t("nbdUnpin") : t("nbdPin")}: ${n.title}`} disabled={busy} onClick={() => void togglePin(n)}>{n.pinned ? t("nbdUnpin") : t("nbdPin")}</Button>
                <Button size="compact" variant="ghost" aria-label={`${t("nbdWithdraw")}: ${n.title}`} disabled={busy} onClick={() => void run(() => api!.noticeBoardWithdraw({ path: { id: n.id } }), "nbdWithdrawnOk")}>{t("nbdWithdraw")}</Button>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
