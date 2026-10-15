import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-card">
        <Image src="/brand/oruschools-horizontal.svg" alt="OruSchools" width={148} height={40} unoptimized priority />
        <h1 className="mt-6 text-title font-display font-bold">{t("appWebsite")}</h1>
        <p className="mt-2 text-body text-text-muted">{t("scaffoldNotice")}</p>
      </section>
    </main>
  );
}
