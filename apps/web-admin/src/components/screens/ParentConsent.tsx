"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ConsentOverviewDto } from "@oruschools/api-client";
import { Badge, Banner, Card, EmptyState } from "@oruschools/shared-ui";
import { useSession } from "@oruschools/web-auth";
import { regionLocale } from "@/lib/display";
import { useLoad } from "@/lib/use-load";
import { Failed } from "./parts";

const day = (iso: string, locale: string): string => new Intl.DateTimeFormat(regionLocale(locale), { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(new Date(iso));
const TONE = { CURRENT: "success", WITHDRAWN: "danger", OLD_VERSION: "warning", NONE: "neutral" } as const;

/**
 * Which parents have agreed to the privacy notice (P6-5c), for the school's yearly access review. Read only: a parent gives and withdraws consent in the Parent app. Names, the state and the
 * date; nothing about the children.
 */
export function ParentConsent() {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const [state, reload] = useLoad<ConsentOverviewDto>(api ? () => api.consentOverview() : null, "consent-overview");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("pcsTitle")}</h1>
      <p className="text-body text-text-muted">{t("pcsNote")}</p>
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && (
        <>
          <p className="text-body">
            <span className="font-semibold">{t("pcsCounts", { current: state.data.counts.current, parents: state.data.counts.parents })}</span>{" "}
            <span className="text-text-muted">{t("pcsVersion", { version: state.data.noticeVersion })}</span>
          </p>
          {state.data.items.length === 0 && <Card><EmptyState title={t("pcsNone")} headingLevel={2} /></Card>}
          {state.data.items.map((p) => (
            <Card key={p.id} title={p.name} headingLevel={2}>
              <p className="flex flex-wrap items-center gap-2 text-caption text-text-muted">
                <Badge tone={TONE[p.state]}>{t(`pcsState${p.state}`)}</Badge>
                {p.recordedAt && <span>{t("pcsOn", { date: day(p.recordedAt, locale) })}</span>}
                {p.language && <span>{t("pcsLang", { language: p.language })}</span>}
              </p>
            </Card>
          ))}
        </>
      )}
    </div>
  );
}
