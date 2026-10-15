import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

// Next 16 renamed "middleware" to "proxy".
export function proxy(request: NextRequest) {
  return handleI18nRouting(request);
}

export const config = {
  // Everything except API routes, Next internals and files with an extension (icons, images).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
