import path from "node:path";
import { loadEnvConfig } from "@next/env";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

// One master env file at the repo root (.env.local) serves every app.
// forceReload: Next has already read this app's own folder, and loadEnvConfig otherwise returns that cached result.
loadEnvConfig(path.resolve(import.meta.dirname, "../.."), process.env.NODE_ENV !== "production", undefined, true);

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Next only inlines NEXT_PUBLIC_* values it saw before this file ran, and the master file is read here, so the
// public values are handed over explicitly. Public by design: nothing secret belongs in this list.
const PUBLIC_ENV = ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_BASE_DOMAIN"] as const;

const nextConfig: NextConfig = {
  env: Object.fromEntries(PUBLIC_ENV.flatMap((name) => (process.env[name] ? [[name, process.env[name]]] : []))),
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // Monorepo root (where node_modules lives); required because each app dir has its own .git.
    root: path.resolve(import.meta.dirname, "../.."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
