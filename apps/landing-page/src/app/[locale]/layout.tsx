import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import localFont from "next/font/local";
import { directionOf } from "@oruschools/i18n";
import { routing } from "@/i18n/routing";
import { fontVariables } from "../fonts";
import "../globals.css";

// Marketing headlines only (brand guidelines): Poppins Bold/Medium, Latin only; other scripts fall back through
// --font-script-stack (see globals.css). Self-hosted from packages/shared-design-tokens/fonts (no Google request at build).
const poppins = localFont({
  variable: "--font-poppins",
  display: "swap",
  src: [
    { path: "../../../../../packages/shared-design-tokens/fonts/Poppins-Medium.woff2", weight: "500", style: "normal" },
    { path: "../../../../../packages/shared-design-tokens/fonts/Poppins-Bold.woff2", weight: "700", style: "normal" },
  ],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: t("appWebsite"), description: t("scaffoldNotice") };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    // lang drives the per-language fonts and line heights (generated i18n.css); dir flips the whole layout for RTL.
    <html lang={locale} dir={directionOf(locale)} className={`${fontVariables} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-body">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
