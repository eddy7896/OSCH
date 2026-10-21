"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { DEFAULT_LOCALE, isLocale, readLocaleCookie } from "@oruschools/i18n";
import { usePathname, useRouter } from "@/i18n/navigation";

/** The device's remembered language choice (the ORU_LOCALE cookie), or nothing. Browser only. */
export const rememberedLanguage = () => (typeof document === "undefined" ? undefined : readLocaleCookie(document.cookie));

/**
 * Applies a person's language once per page load (ADR-0006: a choice, never detected). Only when they arrived at the
 * default-language address: an address that already names a language (`/ur/...`) is itself the choice for that visit.
 * Nothing is rendered; the redirect keeps the page and changes only the language prefix.
 */
export function ApplyLanguage({ target }: { target: string | null | undefined }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !target) return;
    done.current = true;
    if (isLocale(target) && locale === DEFAULT_LOCALE && target !== DEFAULT_LOCALE) router.replace(pathname, { locale: target });
  }, [target, locale, router, pathname]);

  return null;
}
