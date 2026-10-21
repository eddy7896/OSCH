"use client";

import { useTranslations } from "next-intl";
import { Badge, Card, EmptyState } from "@oruschools/shared-ui";
import { roleKey } from "@/lib/nav";

/** The home screen: a greeting by time of day, the person's role, and (until the modules exist) an honest empty state. */
export function Dashboard({ name, role, hour }: { name: string; role: string; hour: number }) {
  const t = useTranslations();
  const greeting = hour < 12 ? "greetingMorning" : hour < 17 ? "greetingAfternoon" : "greetingEvening";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-title">{t(greeting, { name })}</h1>
        <Badge tone="info">{t("webYourRole", { role: t(roleKey(role)) })}</Badge>
      </div>
      <Card>
        <EmptyState title={t("webDashboardEmptyTitle")} description={t("webDashboardEmptyBody")} headingLevel={2} />
      </Card>
    </div>
  );
}
