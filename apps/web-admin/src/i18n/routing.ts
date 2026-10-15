import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "@oruschools/i18n";

// The language lives in the URL (English at "/", others at "/ur", "/hi", ...): every language is prerendered, which works
// with cacheComponents (no cookie read in the root layout), is bookmarkable, and gives the public site per-language SEO.
// English is primary and the browser's Accept-Language is NOT used to switch language (ADR-0006).
export const routing = defineRouting({
  locales: LOCALES.map((l) => l.code),
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeDetection: false,
});
