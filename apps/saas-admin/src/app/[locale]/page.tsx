import { setRequestLocale } from "next-intl/server";
import { PlatformApp } from "@/components/PlatformApp";

// The shell is prerendered; everything behind sign-in is a client island (ADR-0009).
export default async function Home({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PlatformApp />;
}
