"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { MessageAuditEntryDto, MessageAuditPageDto } from "@oruschools/api-client";
import { Badge, Banner, Button, Card, EmptyState } from "@oruschools/shared-ui";
import { errorKey, useSession } from "@oruschools/web-auth";
import { regionLocale } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { Failed } from "./parts";

const day = (iso: string, locale: string): string => new Intl.DateTimeFormat(regionLocale(locale), { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

const KIND: Record<string, string> = {
  "message.thread.start": "mauActStart",
  "message.send": "mauActSend",
  "message.hide": "mauActHide",
  "message.report": "mauActReport",
  "message.report.review": "mauActReview",
  "broadcast.send": "mauActBroadcast",
};

/**
 * The System Admin's view of every message and class message with its words (guardrails section 3, ADR-0018 decision 2). Each page that is opened is written down by the gateway.
 * Newest first; "Show older" asks for the next page. Nothing here can change or remove a message.
 */
export function MessageAudit() {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [first, reload] = useLoad<MessageAuditPageDto>(api ? () => api.messageAuditMessages({ query: { limit: 50, offset: 0 } }) : null, "message-audit");
  const [older, setOlder] = useState<{ items: MessageAuditEntryDto[]; next: number | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const items = first.status === "ready" ? [...first.data.items, ...(older?.items ?? [])] : null;
  const next = first.status === "ready" ? (older ? older.next : first.data.next) : null;
  const more = async (offset: number) => {
    setBusy(true);
    setError(null);
    try {
      const page = await api!.messageAuditMessages({ query: { limit: 50, offset } });
      setOlder((have) => ({ items: [...(have?.items ?? []), ...page.items], next: page.next }));
    } catch (err) {
      setError(errorKey(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("mauTitle")}</h1>
      <p className="text-body text-text-muted">{t("mauNote")}</p>
      {first.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {first.status === "error" && <Failed messageKey={first.messageKey} retry={reload} />}
      {error && <Failed messageKey={error} retry={() => next !== null && void more(next)} />}
      {items !== null && items.length === 0 && <Card><EmptyState title={t("mauNone")} headingLevel={2} /></Card>}
      {items?.map((e) => (
        <Card key={e.id} title={t(KIND[e.action] ?? "mauActSend")} headingLevel={2}>
          <div className="flex flex-col gap-1">
            <p className="flex flex-wrap items-center gap-2 text-caption text-text-muted">
              <Badge tone="neutral">{day(e.at, locale)}</Badge>
              {e.to ? t("mauFrom", { actor: e.actor.name, to: e.to }) : e.actor.name}
              {e.student && <span>{t("mauAbout", { student: e.student })}</span>}
            </p>
            {e.title && <p className="text-body font-semibold">{e.title}</p>}
            {e.body && <p className="whitespace-pre-line text-body">{e.body}</p>}
            {e.note && <p className="text-caption text-text-muted">{e.note}</p>}
          </div>
        </Card>
      ))}
      {next !== null && <div><Button size="comfortable" variant="secondary" disabled={busy} onClick={() => void more(next)}>{t("mauMore")}</Button></div>}
    </div>
  );
}
