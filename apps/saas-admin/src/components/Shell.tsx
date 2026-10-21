"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button, SideNav } from "@oruschools/shared-ui";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useSession } from "@oruschools/web-auth";

/** The platform area's frame: side navigation, language, and who is signed in. */
export function Shell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const { state, port } = useSession();
  const who = state.status === "in" ? (state.user.displayName ?? state.user.email ?? "") : "";
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <SideNav
        className="md:min-h-screen"
        label={t("saasNavLabel")}
        product={t("appPlatform")}
        active="schools"
        sections={[{ items: [{ key: "schools", label: t("saasNavSchools"), icon: "home" }] }]}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3">
          <LanguageSwitcher />
          <div className="flex items-center gap-3">
            <span className="text-body text-text-muted">{who}</span>
            <Button size="comfortable" variant="ghost" onClick={() => void port?.signOut()}>
              {t("actionSignOut")}
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}
