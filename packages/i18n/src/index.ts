import { DEFAULT_LOCALE, LOCALES, type LocaleCode, type LocaleInfo } from "./locales.generated.js";
import { MESSAGES } from "./messages.generated.js";

export { DEFAULT_LOCALE, LOCALES, MESSAGES };
export type { LocaleCode, LocaleInfo };

/** Cookie that stores an explicit language choice (web). Languages are chosen, never auto-detected: English is primary (ADR-0006). */
export const LOCALE_COOKIE = "ORU_LOCALE";

const BY_CODE: ReadonlyMap<string, LocaleInfo> = new Map(LOCALES.map((l) => [l.code, l]));

export const isLocale = (value: unknown): value is LocaleCode => typeof value === "string" && BY_CODE.has(value);

export const localeInfo = (code: string): LocaleInfo => BY_CODE.get(code) ?? (BY_CODE.get(DEFAULT_LOCALE) as LocaleInfo);

/** Text direction for `<html dir>`. Unknown languages are ltr. */
export const directionOf = (code: string): "ltr" | "rtl" => BY_CODE.get(code)?.dir ?? "ltr";
export const isRtl = (code: string): boolean => directionOf(code) === "rtl";

/**
 * Map any language tag to a supported code: "ur-PK" -> "ur", "ks-Arab-IN" -> "ks", "HI_in" -> "hi".
 * Returns undefined for languages we do not support.
 */
export function matchLanguageTag(tag: string | null | undefined): LocaleCode | undefined {
  if (!tag) return undefined;
  const language = tag.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(language) ? language : undefined;
}

/** The language stored in a `Cookie` header / `document.cookie` string, if it is a supported one. */
export function readLocaleCookie(cookieString: string | null | undefined): LocaleCode | undefined {
  if (!cookieString) return undefined;
  for (const part of cookieString.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === LOCALE_COOKIE) {
      const raw = part.slice(eq + 1).trim();
      try {
        return matchLanguageTag(decodeURIComponent(raw));
      } catch {
        return undefined; // a malformed escape is not a choice
      }
    }
  }
  return undefined;
}

/** The `document.cookie` assignment that remembers a language choice on this device for a year. */
export function serializeLocaleCookie(code: LocaleCode, { secure = false }: { secure?: boolean } = {}): string {
  return `${LOCALE_COOKIE}=${code}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export interface NegotiationInput {
  /** Value of the ORU_LOCALE cookie (the user's explicit choice). */
  readonly cookie?: string | null;
  /** The school's default language (school settings), if configured. */
  readonly schoolDefault?: string | null;
}

/**
 * Pick the UI language: explicit user choice, then the school's default, then English.
 * The browser's Accept-Language header is deliberately NOT consulted (English is primary; changing language is a choice).
 */
export function negotiateLocale({ cookie, schoolDefault }: NegotiationInput = {}): LocaleCode {
  return matchLanguageTag(cookie) ?? matchLanguageTag(schoolDefault) ?? DEFAULT_LOCALE;
}

/** Messages for a language: English first, overlaid with that language's translations (missing keys stay English). */
export function getMessages(code: string): Record<string, string> {
  const locale = matchLanguageTag(code) ?? DEFAULT_LOCALE;
  return { ...MESSAGES[DEFAULT_LOCALE], ...MESSAGES[locale] };
}

/** True when this language has translations for every English key. */
export function isFullyTranslated(code: string): boolean {
  const locale = matchLanguageTag(code);
  if (!locale) return false;
  return Object.keys(MESSAGES[DEFAULT_LOCALE]).every((k) => k in MESSAGES[locale]);
}
