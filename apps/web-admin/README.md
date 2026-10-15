# OruSchools ERP (web-admin)

The school ERP for principals, finance and academic admins, system admins. **Scaffold only**: features arrive in Phases 1-3 (see `documentation/implementation_plan.md`).

Next.js 16 (App Router, Turbopack) + Tailwind v4. **Before writing Next.js code read `node_modules/next/dist/docs/`** (this Next version has breaking changes; see `AGENTS.md`).

```bash
npm run dev -w web-admin      # http://localhost:3002
npm run build -w web-admin
```

## Design system and languages
Styling comes only from the generated design tokens (`@oruschools/shared-design-tokens`, imported in `src/app/globals.css`): utilities such as `bg-surface`, `text-text-muted`, `text-title`, `rounded-lg`, `shadow-card`. No raw colours, **light theme only** (ADR-0005). See `packages/shared-design-tokens/README.md`.

**Languages (ADR-0006):** English is primary and lives at `/`; every other language is in the URL (`/ur`, `/hi`, `/ks`, ...) and is statically prerendered. `src/app/[locale]/layout.tsx` sets `<html lang dir>` (Urdu, Kashmiri, Sindhi, Pashto, Persian and Arabic are right-to-left). All user-visible text comes from `@oruschools/i18n` through `next-intl` (`getTranslations()`); never hard-code copy. Use **logical** Tailwind utilities only (`ms-`, `me-`, `ps-`, `pe-`, `text-start`; `check:drift` rejects `ml-4`, `text-left`, ...). The browser's `Accept-Language` is deliberately ignored. Fonts: `src/app/fonts.ts` is generated (one self-hosted Noto family per script, lazy); do not edit it, change `packages/i18n/locales.json` and run `npm run i18n:build`.

## Environment
Public values only, in `apps/web-admin/.env.local` (copy `.env.example`). See `documentation/environment.md`.
