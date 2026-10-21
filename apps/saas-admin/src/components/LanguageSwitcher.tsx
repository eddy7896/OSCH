"use client";

import { useLocale, useTranslations } from "next-intl";
import { LOCALES } from "@oruschools/i18n";
import { usePathname, useRouter } from "@/i18n/navigation";

/** The language is an explicit choice, never guessed from the browser (ADR-0006). Each language is shown in its own script. */
export function LanguageSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  return (
    <label className="flex items-center gap-2 text-body">
      <span className="text-text-muted">{t("settingsLanguage")}</span>
      <select
        className="min-h-10 rounded-md border border-border-strong bg-surface px-3 text-body text-text"
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value })}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </label>
  );
}
