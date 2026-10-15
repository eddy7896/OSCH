import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { getMessages } from "@oruschools/i18n";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  // English overlaid with the language's translations: a missing key shows English, never a blank or a raw key.
  return { locale, messages: getMessages(locale) };
});
