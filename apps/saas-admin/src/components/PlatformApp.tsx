"use client";

import { useTranslations } from "next-intl";
import { Banner, Button, Card } from "@oruschools/shared-ui";
import { SignIn, useSession } from "@oruschools/web-auth";
import { ApplyLanguage, rememberedLanguage } from "./ApplyLanguage";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { SchoolsScreen } from "./SchoolsScreen";
import { Shell } from "./Shell";

/** Signed out: the sign-in screen. Signed in but not the platform owner: a clear "no access". Owner: the platform area. */
export function PlatformApp() {
  const t = useTranslations();
  const { state, port } = useSession();

  if (state.status === "loading")
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <Banner tone="info" title={t("statusLoading")} />
      </main>
    );
  if (state.status === "out")
    return (
      <>
        <ApplyLanguage target={rememberedLanguage()} />
        <div className="flex justify-end p-4">
          <LanguageSwitcher />
        </div>
        <SignIn title={t("saasSignInTitle")} intro={t("saasSignInIntro")} />
      </>
    );
  if (!state.isOwner)
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card title={t("saasNoAccessTitle")}>
            <p className="text-body text-text-muted">{t("saasNoAccessBody")}</p>
            <div className="mt-4">
              <Button onClick={() => void port?.signOut()}>{t("actionSignOut")}</Button>
            </div>
          </Card>
        </div>
      </main>
    );
  return (
    <Shell>
      <ApplyLanguage target={rememberedLanguage()} />
      <SchoolsScreen />
    </Shell>
  );
}
