# New site bootstrap checklist

How to spin a new org's website off this repo. Most brand coupling has been
centralized (`docs/brand-audit-2026-07-16.md` has the historical file:line
detail and now notes what moved). Create the new repo via GitHub "Use this
template" (clean history, no fork coupling), not the Fork button. To
cherry-pick generic fixes later: `git remote add upstream <this-repo>` in the
new repo.

## 1. Fill in `src/utilities/brand.ts`

One file, plain data (no React/client imports — it's in the Payload config
graph via the SEO plugin). Edit every export: `SITE_NAME`, `SITE_DESCRIPTION`,
`FOOTER_TAGLINE`, `COPYRIGHT_NAME`, `SOCIAL` (platform + href pairs — icons
are looked up by platform key in `Footer/Component.tsx`'s local `SOCIAL_ICONS`
map, so adding a platform not already in that map needs one lucide import
too), `FOOTER_COLUMNS`, `MEMBERSHIP_CTA`, `EMAIL_FROM_NAME`/`EMAIL_FROM_ADDRESS`,
`LOGO.alt`, `LOGO.dims` (see step 3), `OG_IMAGE` (see step 3).

`src/collections/Team.ts`'s admin field description and
`src/components/BeforeDashboard/index.tsx` already read `SITE_NAME`/generic
text — no further edit needed unless the new org drops the Team collection
(see step 5).

## 2. Set environment variables

- `OUTSETA_DOMAIN` — the new org's Outseta tenant domain. Unprefixed (both
  `OutsetaScript/index.tsx` and `proxy.ts` are server-side, no client
  build-time inlining needed). If the new org has no membership area, drop
  Outseta entirely instead (see step 5b) rather than leaving it configured
  and unused — it's a 7-file architectural integration, not a toggle.
- `RAILWAY_PROJECT_ID` — new Railway project id, used by
  `refresh-staging.mjs` / `refresh-local.mjs` / `backup-prod.mjs` to pin
  `railway` CLI calls.
- `NEXT_PUBLIC_SERVER_URL` — the new domain (also feeds `next-sitemap.config.cjs`
  and the `refresh-staging.mjs` search-reindex fallback at line ~227, which
  falls back to a hardcoded `stage.mapsnational.org` only if this var is
  unset or resolves to a Railway-internal host).
- See `.env.example` for the full set (DB, S3, secrets, optional Resend/reCAPTCHA).

## 3. Drop in asset files

- 4 logo SVGs at `public/logo-{primary,secondary}-{light,dark}.svg` (replace
  the existing files, same names — `Logo.tsx` doesn't need editing). Update
  `LOGO.dims` in `brand.ts` to the new files' aspect ratio or the mark
  renders distorted.
- `public/og.webp` (1200×630) — replace, same name. Feeds all three meta
  surfaces (`layout.tsx`, `generateMeta.ts`, `mergeOpenGraph.ts`) via the one
  `OG_IMAGE` constant.
- `public/favicon.ico` / `favicon.svg` — replace, generic names already.

## 4. Swap design tokens

`src/app/(frontend)/tokens.css` — the navy/maroon hex ramp
(`--brand-primary-base`, `--brand-secondary-base`) and font stack
(`--font-body`/`--font-heading`). Re-map the shadcn slots in `globals.css`
only if hue *roles* change (e.g. which token is "primary" vs "secondary").
Keep text pairs WCAG AAA — `/design-system` verifies both themes.

## 5. Replace content (fork-time, not variables)

This is genuinely per-org content, not centralized — a simpler org doesn't
need the import pipeline at all:

- `scripts/seed-pages.ts` — rewrite the `PageSlice` factories for the new
  org's pages. Keep the file's shape (idempotent registry +
  `payload.destroy()` flush).
- `src/Header/seedNav.ts` — the new site's nav IA.
- `src/seed/prose/*.json` — delete; only referenced by the old MAPS slices.
- `src/import/` + `scripts/import-prose.ts`, `scripts/import-slider.ts`,
  `scripts/rehost-images.ts` — the Webflow CSV import pipeline. Skip
  entirely for a small site; seed via `seed-pages.ts` or build in admin.
- `docs/migration/` — MAPS Webflow migration docs.
- `src/migrations/*` — delete all, then
  `npm run payload -- migrate:create initial` once the new schema settles
  (includes `restore-assets/` and the nav-seed migration).
- Collections the new site doesn't need (e.g. `Team`, `Testimonials`,
  `AcademyVideos`) and their blocks — delete from `src/collections/`,
  `src/blocks/index.ts`, `src/blocks/blockComponents.ts`, then
  `npm run generate:types`.
- `redirects.ts` — the `legacyPosts*` rules 301 MAPS's old Webflow URLs; a
  new org has no such legacy site, delete them.
- e2e/int tests assert against seeded MAPS content (post slugs, page routes,
  the fixture image). Update alongside `seed-pages.ts` — expect swapped
  fixture values, not a rewrite of test structure.
- Every `src/blocks/*/gallery.ts` and `src/heros/gallery.ts` (~20 files) plus
  `src/blocks/gallery-helpers.ts` — the `/design-system/blocks` showroom's
  sample data is real MAPS copy/photography, not placeholders. Cosmetic only
  (internal, noindexed) — budget time here only if the showroom matters to
  the new org.

### 5b. If dropping Outseta (no membership area)

Delete together: `OutsetaScript/`, `proxy.ts`'s gate + route matcher,
`Footer/PortalLogin.tsx`, `MemberPortalHero/` (+ deregister from block
registries), `types/outseta.d.ts`, login/logout blocks in `DesktopNav.tsx` /
`NavMenu.tsx`, `/members/*` routes, members e2e/int specs. Also drop
`MEMBERSHIP_CTA` usage in `Footer/Component.tsx` if there's no join flow at
all.

## 6. Railway setup

Same shape as MAPS: web service + Postgres + Storage Bucket per environment
(production + staging fork), `railway.json` carries builder/preDeploy/health
check. Connect the repo on the web service: staging env tracks `staging`,
production tracks `master`, "Wait for CI" on.

Required vars per env: `DATABASE_URL`, `PAYLOAD_SECRET`, `CRON_SECRET`,
`PREVIEW_SECRET`, `NEXT_PUBLIC_SERVER_URL`, `S3_BUCKET` / `S3_ENDPOINT` /
`S3_REGION` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY`,
`S3_FORCE_PATH_STYLE=false`, plus `OUTSETA_DOMAIN` / `RAILWAY_PROJECT_ID` from
step 2. Staging only: `STAGING_GATE_USER` / `STAGING_GATE_PASSWORD`
(Basic-auth gate + noindex, inert when unset). Optional:
`RESEND_API_KEY` + `EMAIL_FROM_*`, reCAPTCHA keys.

## Keep as-is (org-agnostic, no action needed)

- CI (`.github/workflows/ci.yml`): lint/build/int, migration guard, e2e,
  branch flow guard. Branch model (feature → `staging` → `master`) and
  merge-commits-only both carry over; re-apply the repo settings
  (Settings → Pull Requests → only "Allow merge commits"; default branch
  `master`, create `staging` from it).
- Block registries, `/design-system` + `/design-system/blocks` showroom,
  heros, `RenderBlocks`/`RenderHero`.
- `scripts/refresh-local.mjs` / `refresh-lock.mjs`, `ensure-admin.ts`,
  `ensure-docker.ps1` — resolve targets from Railway env names / `.env`,
  no hardcoded org coupling.
- Husky hooks, tests scaffolding, MinIO docker-compose (bucket name is
  generic; `container_name`/volume `name` in `docker-compose.yml` do embed
  `maps-website` — cosmetic, only matters if `docker ps` output bothers you).
- `scripts/register-backup-task.ps1` — machine-local by design (task name,
  checkout path, maintainer's backup folder); edit the four marked lines
  directly, not via env.
- `package.json` `name` — cosmetic only, no code reads it.

## First-run order (fresh repo, fresh DB)

1. `.env` from `.env.example` (local Postgres + MinIO vars, `OUTSETA_DOMAIN`,
   `RAILWAY_PROJECT_ID`), `npm install`.
2. `npm run dev` (push:true syncs schema), `npm run ensure:admin`.
3. Complete steps 1-5 above (brand.ts, assets, tokens, content).
4. When schema settles: `npm run payload -- migrate:create initial`, commit.
5. Railway envs up (step 6), push `staging`, verify, promote to `master`.
