"use client";

import { useTranslations } from "next-intl";
import type { ClassDto, ClassListDto } from "@oruschools/api-client";
import { Banner, Card, EmptyState } from "@oruschools/shared-ui";
import { useSession } from "@oruschools/web-auth";
import { useLoad } from "@/lib/use-load";
import { DataTable, type Column } from "./DataTable";
import { Failed } from "./parts";

/** Classes of the school: level, section and capacity. (Subjects, years and editing come with the setup screens, P2-10e.) */
export function Classes() {
  const t = useTranslations();
  const { api } = useSession();
  const [state, reload] = useLoad<ClassListDto>(api ? () => api.academicsClasses({}) : null, "classes");
  const columns: Column<ClassDto>[] = [
    { key: "name", header: t("peoClass"), render: (r) => r.name },
    { key: "level", header: t("peoLevel"), render: (r) => r.gradeLevel.name },
    { key: "section", header: t("peoSection"), render: (r) => r.section },
    { key: "capacity", header: t("peoCapacity"), numeric: true, render: (r) => r.capacity },
  ];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-title">{t("navClasses")}</h1>
      {state.status === "loading" && <Banner tone="info" title={t("statusLoading")} />}
      {state.status === "error" && <Failed messageKey={state.messageKey} retry={reload} />}
      {state.status === "ready" && state.data.items.length === 0 && <Card><EmptyState title={t("peoNoClassesTitle")} headingLevel={2} /></Card>}
      {state.status === "ready" && state.data.items.length > 0 && <DataTable caption={t("navClasses")} columns={columns} rows={state.data.items} rowKey={(r) => r.id} />}
    </div>
  );
}
