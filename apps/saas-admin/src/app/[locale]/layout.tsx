import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { directionOf } from "@oruschools/i18n";
import { routing } from "@/i18n/routing";
import { AuthProvider } from "@oruschools/web-auth";
import { config } from "@/lib/config";
import { fontVariables } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: t("appPlatform"), description: t("scaffoldNotice") };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    // lang drives the per-language fonts and line heights (generated i18n.css); dir flips the whole layout for RTL.
    <html lang={locale} dir={directionOf(locale)} className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col text-body">
        <NextIntlClientProvider>
          <AuthProvider firebase={config.firebase} apiUrl={config.apiUrl}>{children}</AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
