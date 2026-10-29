"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { AnnouncementDto, AnnouncementListDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState, TextField } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { regionLocale } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { Failed, Saved } from "./parts";

export interface AnnouncementGrants {
  /** Post (the announcements create grant: the Principal and the Academic admin). */
  post: boolean;
  /** Withdraw (the update grant). */
  withdraw: boolean;
}

const day = (iso: string, locale: string): string => new Intl.DateTimeFormat(regionLocale(locale), { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(iso));

/** What the school has told its staff, newest first. Every staff role reads; the Principal and the Academic admin post and withdraw (ADR-0014 decision 11). Staff see a post in their app and get a notification. */
export function Announcements({ grants }: { grants: AnnouncementGrants }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [state, reload] = useLoad<AnnouncementListDto>(api ? () => api.announcementsList({}) : null, "announcements");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "saved" | "error"; text: string } | null>(null);
  const items = state.status === "ready" ? [...state.data.items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) : [];
  const run = async (action: () => Promise<unknown>, done: string, after?: () => void) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "saved", text: t(done) });
      after?.();
      reload();
    } catch (err) {
      setMessage({ tone: "error", text: t(errorKey(err)) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navAnnouncements")}</h1>
      {grants.post && (
        <Card title={t("annPostTitle")} headingLevel={2}>
          <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); void run(() => api!.announcementsPost({ body: { title: title.trim(), body: body.trim() } }), "annPosted", () => { setTitle(""); setBody(""); }); }}>
            <p className="text-body text-text-muted">{t("annPostNote")}</p>
            <TextField size="comfortable" label={t("annFieldTitle")} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
            <TextField size="comfortable" multiline label={t("annFieldBody")} value={body} maxLength={5000} onChange={(e) => setBody(e.target.value)} />
            <div><Button type="submit" variant="primary" size="comfortable" disabled={busy || title.trim() === "" || body.trim() === ""}>{t("annPost")}</Button></div>
          </form>
        </Card>
      )}
      {message?.tone === "saved" && <Saved>{message.text}</Saved>}
      {message?.tone === "error" && <Banner tone="danger" title={message.text} />}
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && items.length === 0 && <Card><EmptyState title={t("annNone")} headingLevel={2} /></Card>}
      {items.map((a: AnnouncementDto) => (
        <Card key={a.id} title={a.title} headingLevel={2}>
          <div className="flex flex-col gap-2">
            <p className="text-caption text-text-muted">{t("annFrom", { name: a.author.name, date: day(a.createdAt, locale) })}</p>
            <p className="whitespace-pre-line text-body">{a.body}</p>
            <div className="flex flex-wrap items-center gap-3">
              {a.withdrawn && <Badge tone="neutral">{t("annWithdrawn")}</Badge>}
              {grants.withdraw && !a.withdrawn && <Button size="compact" variant="ghost" aria-label={`${t("annWithdraw")}: ${a.title}`} disabled={busy} onClick={() => void run(() => api!.announcementsWithdraw({ path: { id: a.id } }), "annWithdrawnOk")}>{t("annWithdraw")}</Button>}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
