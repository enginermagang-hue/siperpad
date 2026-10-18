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

Two surfaces use native CSS scrollbars (`.siperpad-dialog-scroll` for the `AppDialog` body, `.siperpad-select-scroll` for the `AppSelect` dropdown) instead, keeping `overflow-y-auto` so clipping only happens when the content actually overflows. Both are defined in `main.css` and use the `--scrollbar-thumb` / `--primary` tokens. Scrollbar visibility is `auto` (OS default), so bars only appear on overflow.

`AppSelect`'s dropdown uses `px-1` (4px horizontal) + `pb-1` (no top padding), so the searchbar can sit flush against the top edge via `searchWrapperClasses: 'bg-select p-2 -mx-1 sticky top-0 z-10'`. The negative margin is **horizontal only** (`-mx-1`) to compensate `px-1`; do **not** go back to `-m-1` — a vertical negative margin pushes the searchbar through the dropdown's top border. The `sticky top-0` + `bg-select` pair (from Preline's official searchable-dropdown example) is what keeps the search field pinned while the option list scrolls. `searchClasses` is overridden with app tokens (`bg-transparent border-layer-line text-foreground`) instead of Preline's default grey/blue input. The dropdown also carries `overflow-x-hidden` as a safety net.

Icons come from `lucide-vue-next` (imported per file). Dark mode is a `dark` class on `<html>` managed by `useTheme()` (cookie-backed, SSR-safe). Breakpoint helper is `useBreakpoint()` with `md` = 768px (Tailwind), not Vuetify's 960px.

Dark mode overrides Preline's palette in `main.css` (`.dark { … }`, placed after the `preline/theme.css` import) with a palette **derived from the sidebar colour**. The sidebar is a fixed blue-navy `#1a2332` = `oklch(25.5% 0.031 260.4)`. Every dark token uses the *same hue and chroma* (H=260.4, C=0.031) with only lightness varied — background L 20% `#0e1624`, card/layer L 28% `#202938`, dropdown L 24.5% `#18212f`, surface L 32.5% `#2b3444`, `*-line` L 36.5% `#353f4f`.

Do not switch back to `neutral` (pure grey — sidebar invisible, contrast 1.04) or stock `slate` (chroma 0.042 > sidebar's 0.031 and hue 265 ≠ 260, so the canvas looks *more* blue than the sidebar). Measured with this palette: sidebar↔canvas 1.15, canvas↔card 1.24, card↔border 1.38, text 14.4 (canvas) / 11.6 (card), muted 5.66 — all WCAG AA. Because sidebar↔canvas is only 1.15, the sidebar's right edge is reinforced with `md:border-e border-white/15` (contrast 1.84).

`SiperpadChart.vue` cannot inherit CSS tokens (ApexCharts paints SVG), so it reads `useTheme().isDark` and passes `foreColor` (`#cfd6e0`) / `grid.borderColor` (`#353f4f`) / `tooltip.theme` explicitly — keep those hexes in sync with the palette above.

## Layout: sidebar states
`app/layouts/default.vue` has two independent sidebar states:
- `drawer` (`ref`, mobile only) — slide-in overlay below `md`.
- `collapsed` (`useCookie('siperpad-sidebar')`, desktop only) — mini rail (icons only).

Layout rules are **CSS-driven** (`md:` variants + `collapsed` class binding), never `mdAndUp` in template class bindings: the server can't know viewport width, so JS-gated classes cause hydration mismatches. `useBreakpoint()` is only used for behaviour (auto-close drawer, `isRail` for `v-if` on labels/submenus).

Width/padding must stay paired: `w-[272px]` ↔ `md:ps-[272px]`, `w-[72px]` ↔ `md:ps-[72px]`. Clicking a group button while in rail auto-expands the sidebar (`toggleGroup`). The sidebar scroll container needs `overflow-x-hidden` because `mx-2` items overflow the 72px rail.

Header height is `h-[72px]`, which must match the sidebar branding block (`min-h-[72px]`, with `border-b` instead of a separate `<hr>` so the divider lands exactly at 72px) and the content `min-h-[calc(100vh-4.5rem)]`.

Active-link detection in the sidebar uses the `isActive(href, exact?)` helper, never raw `route.path.startsWith`. Non-exact matching compares whole segments (`href + '/'`) so `/pad` doesn't light up for `/pad-history`. Routes that are *also* a prefix of other routes must pass `exact = true` — currently only `/verifikasi` (parent of `/verifikasi/audit`, `/verifikasi/batch`, …); without it, "Realisasi Diajukan" stays highlighted on every verification sub-page. `syncOpenGroup()` auto-expands the group containing the active route on mount and on every navigation (it only opens, never closes, so groups the user opened manually stay open).

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
