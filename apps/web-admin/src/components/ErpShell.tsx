"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { MeResponseDto, PublicSchoolDto } from "@oruschools/api-client";
import { Button, Card, EmptyState, SideNav, type SideNavSection } from "@oruschools/shared-ui";
import { useSession } from "@oruschools/web-auth";
import { isDashboard, ITEM, SECTION_KEY } from "@/lib/nav";
import { Dashboard } from "./Dashboard";
import { Glance, hasGlance } from "./screens/Glance";
import { Admissions } from "./screens/Admissions";
import { Attendance } from "./screens/Attendance";
import { StaffAttendance } from "./screens/StaffAttendance";
import { Announcements } from "./screens/Announcements";
import { Transport } from "./screens/Transport";
import { Classes } from "./screens/Classes";
import { Fees } from "./screens/Fees";
import { Gradebook } from "./screens/Gradebook";
import { HrReports } from "./screens/HrReports";
import { Leave } from "./screens/Leave";
import { Substitutions } from "./screens/Substitutions";
import { Settings } from "./screens/Settings";
import { FinanceReports } from "./screens/FinanceReports";
import { Payroll } from "./screens/Payroll";
import { Staff } from "./screens/Staff";
import { Timetable } from "./screens/Timetable";
import { Users } from "./screens/Users";
import { Students } from "./screens/Students";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationBell } from "./NotificationBell";

/** The navigation keys that have a screen. `announcements` has one too, but is left out on purpose: every staff role may read it, and a role whose work is in the phone apps (teacher, staff, driver) must still be told to use them, not be given only this page. */
const BUILT = new Set(["memberships", "students", "classes", "timetable", "attendance", "staff-attendance", "gradebook", "leave", "substitution", "admissions", "staff", "payroll", "finance", "settings", "transport", "reports-finance", "reports-hr"]);

type ActiveSchool = NonNullable<MeResponseDto["activeSchool"]>;

/**
 * The school's frame: navigation built from what the gateway says this person may open (modules they cannot open are not
 * sent, so they are not shown at all), the language, and who is signed in. The dashboard, financial reports, students, classes,
 * admissions, staff, payroll, fees, settings, HR reports and users and roles are built; the other screens arrive with their slices of P2-10.
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
  // A role whose work is in the mobile apps (teacher, staff, driver, parent) has nothing built for it here yet: say where to go, never "not ready".
  const usable = access.navigation.some((section) => section.items.some((item) => isDashboard(item.key) || BUILT.has(item.key)));

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <SideNav className="md:min-h-screen" label={t("webNavLabel")} school={school.name} active={current} onChange={setCurrent} sections={sections} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
          <LanguageSwitcher />
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-body text-text-muted">{name}</span>
            <Button size="comfortable" variant="ghost" onClick={() => void port?.signOut()}>
              {t("actionSignOut")}
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 p-4">
          {!usable ? (
            <Card>
              <EmptyState title={t("webFieldRoleTitle")} description={t("webFieldRoleBody")} headingLevel={1} />
            </Card>
          ) : isDashboard(current) ? (
            <Dashboard name={me.user.displayName ?? me.user.email} role={access.role} hour={hour} glance={hasGlance(access.permissions) ? <Glance permissions={access.permissions} /> : undefined} />
          ) : current === "students" ? (
            <Students canCreate={access.permissions["students"]?.["create"] === "school"} />
          ) : current === "classes" ? (
            <Classes grants={{ create: access.permissions["academics"]?.["create"] === "school", remove: access.permissions["academics"]?.["delete"] === "school", update: access.permissions["academics"]?.["update"] === "school" }} />
          ) : current === "timetable" ? (
            <Timetable grants={{ edit: access.permissions["academics"]?.["update"] === "school", create: access.permissions["academics"]?.["create"] === "school", remove: access.permissions["academics"]?.["delete"] === "school" }} />
          ) : current === "attendance" ? (
            <Attendance grants={{ submit: access.permissions["attendance"]?.["create"] === "school", edit: access.permissions["attendance"]?.["update"] === "school" }} />
          ) : current === "gradebook" ? (
            <Gradebook grants={{ enter: access.permissions["grades"]?.["create"] === "school", create: access.permissions["academics"]?.["create"] === "school", update: access.permissions["academics"]?.["update"] === "school", remove: access.permissions["academics"]?.["delete"] === "school" }} />
          ) : current === "leave" ? (
            <Leave grants={{ approve: access.permissions["leave"]?.["approve"] === "school", create: access.permissions["leave"]?.["create"] === "school", manage: access.permissions["leave"]?.["update"] === "school" }} />
          ) : current === "substitution" ? (
            <Substitutions grants={{ assign: access.permissions["academics"]?.["update"] === "school" }} />
          ) : current === "staff-attendance" ? (
            <StaffAttendance grants={{ correct: access.permissions["staff_attendance"]?.["update"] === "school" }} />
          ) : current === "admissions" ? (
            <Admissions canCreate={access.permissions["admissions"]?.["create"] === "school"} canUpdate={access.permissions["admissions"]?.["update"] === "school"} />
          ) : current === "finance" ? (
            <Fees grants={{ create: access.permissions["finance"]?.["create"] === "school", reverse: access.permissions["finance"]?.["delete"] === "school" }} />
          ) : current === "staff" ? (
            <Staff grants={{ create: access.permissions["staff"]?.["create"] === "school", salaryRead: access.permissions["payroll"]?.["read"] === "school", salaryAdd: access.permissions["payroll"]?.["create"] === "school", salaryRemove: access.permissions["payroll"]?.["delete"] === "school" }} />
          ) : current === "payroll" ? (
            <Payroll grants={{ create: access.permissions["payroll"]?.["create"] === "school", edit: access.permissions["payroll"]?.["update"] === "school", approve: access.permissions["payroll"]?.["approve"] === "school", pay: access.permissions["payroll"]?.["delete"] === "school" }} />
          ) : current === "memberships" ? (
            <Users selfId={me.user.id} grants={{ create: access.permissions["memberships"]?.["create"] === "school", update: access.permissions["memberships"]?.["update"] === "school", remove: access.permissions["memberships"]?.["delete"] === "school" }} />
          ) : current === "transport" ? (
            <Transport grants={{ create: access.permissions["transport"]?.["create"] === "school", update: access.permissions["transport"]?.["update"] === "school", remove: access.permissions["transport"]?.["delete"] === "school" }} />
          ) : current === "announcements" ? (
            <Announcements grants={{ post: access.permissions["announcements"]?.["create"] === "school", withdraw: access.permissions["announcements"]?.["update"] === "school" }} />
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
