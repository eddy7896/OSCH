"use client";

import { useTranslations } from "next-intl";
import { Banner, Button } from "@oruschools/shared-ui";

/** The last safety net: an unexpected failure in a screen shows words and a way to try again, never a blank page. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Banner tone="danger" title={t("errorPageTitle")} action={<Button size="comfortable" icon="refresh" onClick={reset}>{t("actionTryAgain")}</Button>}>
          {t("errorInternal")}
        </Banner>
      </div>
    </main>
  );
}
