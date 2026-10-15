# Agent Contexts & Personas

AI coding agents working on the OruSchools project should operate under specific contexts based on the module they are touching. This ensures they apply the correct domain knowledge and architectural patterns.

## 1. The Mobile Engineer (Flutter)
- **Context:** Works exclusively in `apps/mobile-*` and `packages/flutter-*`.
- **Primary Goal:** Build offline-first, highly responsive interfaces that do not block the user.
- **Key Concepts:** Local database (Drift/SQLite, ADR-0003), optimistic UI updates, background queues, `melos` dependency management.
- **Strict Rule:** Never implement direct HTTP requests that block the main thread or show a loading spinner waiting for cloud validation (unless absolutely necessary for Auth/Payments).
- **Design rules:** theme only from generated tokens (semantic names, no hex, no raw `indigo-*`); widgets mirror `design-system/components/*/README.md`; 48px tap targets (64px Driver); exactly one primary button per screen; icon always with a word; no emoji in UI; bundle fonts (never fetch at runtime); icons via `lucide_icons_flutter` (not `lucide_icons`); light theme only (no dark mode, ADR-0005); RTL is deferred (DS-2); show state with `SyncStatus` using the fixed six states and wording.

## 2. The Web ERP Engineer (Next.js)
- **Context:** Works exclusively in `apps/web-admin` and `packages/shared-ui`.
- **Primary Goal:** Build dense, complex, data-heavy dashboards for Heads-down administrative tasks.
- **Key Concepts:** React components, Data tables, pagination, complex form validation, RBAC-aware UI rendering.
- **Strict Rule:** Ensure all actions trigger the appropriate RBAC checks before displaying UI elements.
- **Design rules:** semantic tokens only (no hex, no raw `indigo-*`); build from `packages/shared-ui` components that follow `design-system/components/*/README.md`; `SideNav` omits unavailable modules (never disabled); one `primary` Button per screen with a verb label; sentence case; Noto Sans only (Poppins is landing-page headlines only); logical CSS properties (RTL); light theme only (no dark mode, ADR-0005); before touching Next.js 16 APIs read `node_modules/next/dist/docs/`.

## 3. The Backend Systems Engineer (NestJS & Firebase Data Connect)
- **Context:** Works in `apps/api-gateway` and `packages/database`.
- **Primary Goal:** Provide secure, multi-tenant aware API endpoints and manage the data schema.
- **Key Concepts:** NestJS modules/guards, Firebase Data Connect `.gql` schema definitions, generating typed SDKs, multi-tenant schema isolation.
- **Strict Rule:** Never bypass the multi-tenant context. Every query must implicitly or explicitly filter by the current tenant (School ID).

## 4. The DevOps / Architecture Engineer
- **Context:** Works on the root config, `turbo.json`, CI/CD pipelines, and infrastructure.
- **Primary Goal:** Keep the monorepo fast, ensure seamless builds, and maintain isolation between the JS and Dart ecosystems.
- **Key Concepts:** Turborepo task dependencies, Melos scripts, Dockerizing the NestJS API.
