import { setRequestLocale } from "next-intl/server";
import { WebAdminApp } from "@/components/WebAdminApp";

// The shell is prerendered; everything behind the school address and sign-in is a client island (ADR-0009).
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <WebAdminApp />;
}
