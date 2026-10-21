"use client";

import { useLocale, useTranslations } from "next-intl";
import { LOCALES, isLocale, serializeLocaleCookie } from "@oruschools/i18n";
import { useSession } from "@oruschools/web-auth";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * The language is an explicit choice, never guessed from the browser (ADR-0006). Each language is shown in its own script.
 * A choice is remembered on this device (cookie) and, when someone is signed in, saved to their account (best effort: the
 * page changes language either way).
 */
export function LanguageSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { api, state } = useSession();

  function choose(code: string) {
    if (!isLocale(code)) return;
    document.cookie = serializeLocaleCookie(code, { secure: window.location.protocol === "https:" });
    if (api && state.status === "in") void api.mePreferences({ body: { language: code } }).catch(() => undefined);
    router.replace(pathname, { locale: code });
  }

  return (
    <label className="flex items-center gap-2 text-body">
      <span className="text-text-muted">{t("settingsLanguage")}</span>
      <select className="min-h-10 rounded-md border border-border-strong bg-surface px-3 text-body text-text" value={locale} onChange={(e) => choose(e.target.value)}>
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code} lang={l.code}>
            {l.native}
          </option>
        ))}
      </select>
    </label>
  );
}
