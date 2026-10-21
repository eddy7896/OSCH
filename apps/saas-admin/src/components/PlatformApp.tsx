"use client";

import { useTranslations } from "next-intl";
import { Banner, Button, Card } from "@oruschools/shared-ui";
import { useSession } from "./AuthProvider";
import { SchoolsScreen } from "./SchoolsScreen";
import { Shell } from "./Shell";
import { SignIn } from "./SignIn";

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
  if (state.status === "out") return <SignIn />;
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
      <SchoolsScreen />
    </Shell>
  );
}
