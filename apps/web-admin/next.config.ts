import path from "node:path";
import { loadEnvConfig } from "@next/env";
import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

// One master env file at the repo root (.env.local) serves every app.
loadEnvConfig(path.resolve(import.meta.dirname, "../.."));

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
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
