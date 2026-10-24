"use client";

import { useLocale, useTranslations } from "next-intl";
import type { CollectionsReportDto, DuesReportDto, StudentListDto } from "@oruschools/api-client";
import { StatCard } from "@oruschools/shared-ui";
import { useSession } from "@oruschools/web-auth";
import { firstOfMonth, rupees, todayIso } from "@/lib/display";
import { useLoad } from "@/lib/use-load";

/** Whether `permissions` (resource -> action -> scope, from /me) lets this person read the resource school-wide. */
export const canRead = (permissions: Record<string, Record<string, string>>, resource: string): boolean => permissions[resource]?.["read"] === "school";

/**
 * The dashboard's row of key numbers: fees collected this month, fees outstanding, students on the roll. Each number is asked for only
 * if this person may read it (the gateway would refuse anyway); one that fails to load is left out rather than shown as zero.
 */
export function Glance({ permissions }: { permissions: Record<string, Record<string, string>> }) {
  const t = useTranslations();
  const locale = useLocale();
  const { api } = useSession();
  const finance = canRead(permissions, "reports_finance");
  const students = canRead(permissions, "students");
  const [collected] = useLoad<CollectionsReportDto>(api && finance ? () => api.reportsCollections({ query: { from: firstOfMonth(), to: todayIso(), page: 1, pageSize: 1 } }) : null, "collected");
  const [dues] = useLoad<DuesReportDto>(api && finance ? () => api.reportsDues({ query: { page: 1, pageSize: 1 } }) : null, "dues");
  const [roll] = useLoad<StudentListDto>(api && students ? () => api.studentsList({ query: { page: 1, pageSize: 1 } }) : null, "roll");

  const cards = [
    collected.status === "ready" && <StatCard key="c" label={t("webCollectedThisMonth")} value={rupees(collected.data.collectedMinor, locale)} sub={t("webPaymentsCount", { count: collected.data.count })} icon="payments" locale={locale} />,
    dues.status === "ready" && <StatCard key="d" label={t("webOutstandingFees")} value={rupees(dues.data.outstandingMinor, locale)} sub={t("webInvoicesCount", { count: dues.data.count })} icon="alert" tone="warning" locale={locale} />,
    roll.status === "ready" && <StatCard key="s" label={t("navStudents")} value={new Intl.NumberFormat(`${locale}-IN`).format(roll.data.total)} icon="users" locale={locale} />,
  ].filter(Boolean);
  if (cards.length === 0) return null;
  return (
    <section aria-labelledby="glance-title" className="flex flex-col gap-3">
      <h2 id="glance-title" className="text-heading">{t("webAtAGlance")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards}</div>
    </section>
  );
}
