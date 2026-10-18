# AGENTS.md — Siperpad

## What this is
Nuxt 4 + Preline UI (Tailwind CSS v4) dashboard app (siperpad). Single package, no monorepo.

## Commands
```bash
npm run dev       # starts on http://localhost:3000
npm run build     # production build
npm run preview   # preview production build
npm run generate  # static export
```
No test, lint, or typecheck scripts are defined. `vue-tsc` is installed but not wired up.

## Aturan
Jangan pernah menjalankan `npm run dev`, `npm run build`, atau `npx nuxt build` tanpa di minta terlebih dahulu.

## Directory layout
- `app/pages/` — file-based routes (Nuxt 4 convention)
- `app/layouts/` — layout wrappers
- `app/composables/` — shared client composables
- `app/components/` — shared components (incl. Preline adapters: `AppSelect`, `AppMenu`, `AppDialog`, `AppToast`, `AppPagination`)
- `app/plugins/` — Nuxt plugins (client-only OverlayScrollbars init for `<body>`)
- `app/assets/css/main.css` — Tailwind v4 entry + Preline `@source`/`variants`/`theme`
- `server/api/` — Nitro server routes (file = `[route].[method].ts`)
- `server/utils/` — server-side helpers (Turso client, Dropbox client)
- `public/` — static assets

## Environment
`.env` is gitignored but present locally; it contains real secrets. Required keys (see `nuxt.config.ts` `runtimeConfig`):
- `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` — libSQL/Turso database
- `DROPBOX_APP_KEY`, `DROPBOX_APP_SECRET`, `DROPBOX_REFRESH_TOKEN` — Dropbox sync
- `NUXT_SESSION_PASSWORD` — session encryption (must be 32+ chars)

## Framework quirk: Preline UI + Tailwind v4
Tailwind is wired through `vite.plugins: [tailwindcss()]` in `nuxt.config.ts` (`@tailwindcss/vite`), not a Nuxt module. `app/assets/css/main.css` is the Tailwind entry: it must keep `@source "../../../node_modules/preline/dist/*.js"` (so classes that only appear in Preline's runtime config get generated), plus `@import` of `preline/variants.css` and `preline/theme.css`.

Preline's JS plugins are **DOM-driven**, so they are confined to two adapters:
- `AppSelect.vue` — wraps `HSSelect`; keeps `<select>` in the DOM and re-inits when the option list changes.
- `AppMenu.vue` — wraps `HSDropdown`; one instance per component, destroyed on unmount (safe inside `v-for`).

Do **not** re-enable blanket OverlayScrollbars auto-apply. OverlayScrollbars forces `display:flex` + `position:relative` on its host, and its viewport is always `overflow-y: scroll` — a permanent clipping context. That breaks dynamically created Preline nodes: `HSSelect` uses `dropdownScope: 'parent'` (dropdown is `position:absolute` inside its wrapper), so it gets clipped. Note that `AppSelect`'s `inModal` prop only sets `dropdownVerticalFixedPlacement` (adds `top-full` + margin) — it does **not** make the dropdown `position: fixed`.

OverlayScrollbars is therefore mounted **explicitly** on exactly two elements:
- `document.body` — `app/plugins/scrollbar.client.ts`
- sidebar scroll container — `mountScrollbar()` in `app/layouts/default.vue`

Dialog body (`AppDialog.vue`) uses the native CSS scrollbar class `.siperpad-dialog-scroll` (defined in `main.css`) instead, keeping `overflow-y-auto` so clipping only happens when the content actually overflows. Scrollbar visibility is `auto` (OS default), so bars only appear on overflow.

Icons come from `lucide-vue-next` (imported per file). Dark mode is a `dark` class on `<html>` managed by `useTheme()` (cookie-backed, SSR-safe). Breakpoint helper is `useBreakpoint()` with `md` = 768px (Tailwind), not Vuetify's 960px.

Dark mode overrides Preline's palette from `neutral` to **`slate`** in `main.css` (`.dark { … }`, placed after the `preline/theme.css` import). Reason: the sidebar is a fixed blue-navy `#1a2332` (luminance 1.7%) and Preline's default neutral greys (0.9–1.9%) made it nearly invisible against the canvas (contrast 1.04–1.14). With slate: sidebar↔canvas 1.28, canvas↔card 1.38, text 16:1. Do not revert to neutral without re-checking those ratios.

`SiperpadChart.vue` cannot inherit CSS tokens (ApexCharts paints SVG), so it reads `useTheme().isDark` and passes `foreColor` / `grid.borderColor` / `tooltip.theme` explicitly.

## Layout: sidebar states
`app/layouts/default.vue` has two independent sidebar states:
- `drawer` (`ref`, mobile only) — slide-in overlay below `md`.
- `collapsed` (`useCookie('siperpad-sidebar')`, desktop only) — mini rail (icons only).

Layout rules are **CSS-driven** (`md:` variants + `collapsed` class binding), never `mdAndUp` in template class bindings: the server can't know viewport width, so JS-gated classes cause hydration mismatches. `useBreakpoint()` is only used for behaviour (auto-close drawer, `isRail` for `v-if` on labels/submenus).

Width/padding must stay paired: `w-[272px]` ↔ `md:ps-[272px]`, `w-[72px]` ↔ `md:ps-[72px]`. Clicking a group button while in rail auto-expands the sidebar (`toggleGroup`). The sidebar scroll container needs `overflow-x-hidden` because `mx-2` items overflow the 72px rail.

Header height is `h-[72px]`, which must match the sidebar branding block (`min-h-[72px]`, with `border-b` instead of a separate `<hr>` so the divider lands exactly at 72px) and the content `min-h-[calc(100vh-4.5rem)]`.

## TypeScript
`tsconfig.json` is a project-references stub pointing to `.nuxt/tsconfig.*.json`. Those files are generated by `nuxt prepare` (also runs on postinstall). Don't try to run `tsc` directly on this project without Nuxt having generated the referenced configs first.

## OpenCode permissions
`opencode.json` denies `npm run dev`, `npm run build`, and `npx nuxt build *`. Use `nuxt dev` / `nuxt build` directly if you need to run them.

## External services
- **Turso (libSQL)**: primary data store; health-checked at `GET /api/health`
- **Dropbox**: sync target `/siperpad`; `DROPBOX_REFRESH_TOKEN` is currently empty in `.env`

## Migrations
SQL migrations live in `server/database/migrations/` (`001_init.sql` … `005_role_user.sql`). Apply with `npm run migrate` (or `migrate:only` to apply without reseeding); `npm run migrate:fresh` drops and rebuilds. Seeding lives in `server/database/seed.ts`.

## Plan
`PLAN.md` adalah sumber kebenaran roadmap. Selalu baca di awal sesi dan anggap prioritas/DoD di sana mengikat.
Update `PLAN.md` setiap fase/task selesai, scope berubah, atau keputusan mempengaruhi roadmap. Jaga tetap living document.
