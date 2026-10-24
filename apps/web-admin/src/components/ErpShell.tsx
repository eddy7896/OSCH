"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { MeResponseDto, PublicSchoolDto } from "@oruschools/api-client";
import { Button, Card, EmptyState, SideNav, type SideNavSection } from "@oruschools/shared-ui";
import { useSession } from "@oruschools/web-auth";
import { isDashboard, ITEM, SECTION_KEY } from "@/lib/nav";
import { Dashboard } from "./Dashboard";
import { canRead, Glance } from "./screens/Glance";
import { Admissions } from "./screens/Admissions";
import { Classes } from "./screens/Classes";
import { Fees } from "./screens/Fees";
import { HrReports } from "./screens/HrReports";
import { Settings } from "./screens/Settings";
import { FinanceReports } from "./screens/FinanceReports";
import { Payroll } from "./screens/Payroll";
import { Staff } from "./screens/Staff";
import { Students } from "./screens/Students";
import { LanguageSwitcher } from "./LanguageSwitcher";

type ActiveSchool = NonNullable<MeResponseDto["activeSchool"]>;

/**
 * The school's frame: navigation built from what the gateway says this person may open (modules they cannot open are not
 * sent, so they are not shown at all), the language, and who is signed in. The dashboard, financial reports, students, classes,
 * admissions, staff, payroll, fees, settings and HR reports are built; the other screens arrive with their slices of P2-10.
 */
export function ErpShell({ me, active: access, school, hour = new Date().getHours() }: { me: MeResponseDto; active: ActiveSchool; school: PublicSchoolDto; hour?: number }) {
  const t = useTranslations();
  const { port } = useSession();
  const first = access.navigation[0]?.items[0]?.key ?? "dashboard";
  const [current, setCurrent] = useState(first);

  // Words come from our catalogue, not the gateway's English; an item we have no word for yet falls back to the gateway's text.
  const sections: SideNavSection[] = access.navigation.map((section) => ({
    title: SECTION_KEY[section.title] ? t(SECTION_KEY[section.title]!) : section.title,
    items: section.items.map((item) => ({ key: item.key, label: ITEM[item.key] ? t(ITEM[item.key]!.label) : item.label, icon: ITEM[item.key]?.icon ?? "grid" })),
  }));
  const name = me.user.displayName ?? me.user.email;

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <SideNav className="md:min-h-screen" label={t("webNavLabel")} school={school.name} active={current} onChange={setCurrent} sections={sections} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
          <LanguageSwitcher />
          <div className="flex items-center gap-3">
            <span className="text-body text-text-muted">{name}</span>
            <Button size="comfortable" variant="ghost" onClick={() => void port?.signOut()}>
              {t("actionSignOut")}
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 p-4">
          {isDashboard(current) ? (
            <Dashboard name={me.user.displayName ?? me.user.email} role={access.role} hour={hour} glance={canRead(access.permissions, "reports_finance") || canRead(access.permissions, "students") ? <Glance permissions={access.permissions} /> : undefined} />
          ) : current === "students" ? (
            <Students canCreate={access.permissions["students"]?.["create"] === "school"} />
          ) : current === "classes" ? (
            <Classes grants={{ create: access.permissions["academics"]?.["create"] === "school", remove: access.permissions["academics"]?.["delete"] === "school", update: access.permissions["academics"]?.["update"] === "school" }} />
          ) : current === "admissions" ? (
            <Admissions canCreate={access.permissions["admissions"]?.["create"] === "school"} canUpdate={access.permissions["admissions"]?.["update"] === "school"} />
          ) : current === "finance" ? (
            <Fees grants={{ create: access.permissions["finance"]?.["create"] === "school", reverse: access.permissions["finance"]?.["delete"] === "school" }} />
          ) : current === "staff" ? (
            <Staff grants={{ create: access.permissions["staff"]?.["create"] === "school", salaryRead: access.permissions["payroll"]?.["read"] === "school", salaryAdd: access.permissions["payroll"]?.["create"] === "school", salaryRemove: access.permissions["payroll"]?.["delete"] === "school" }} />
          ) : current === "payroll" ? (
            <Payroll grants={{ create: access.permissions["payroll"]?.["create"] === "school", approve: access.permissions["payroll"]?.["approve"] === "school", pay: access.permissions["payroll"]?.["delete"] === "school" }} />
          ) : current === "settings" ? (
            <Settings canEdit={access.permissions["settings"]?.["update"] === "school"} />
          ) : current === "reports-hr" ? (
            <HrReports canExport={access.permissions["reports_hr"]?.["export"] === "school"} />
          ) : current === "reports-finance" ? (
            <FinanceReports canExport={access.permissions["reports_finance"]?.["export"] === "school"} />
          ) : (
            <Card>
              <EmptyState title={t("webComingTitle")} description={t("webComingBody")} headingLevel={2} />
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}
