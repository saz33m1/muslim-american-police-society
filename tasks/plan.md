# Implementation Plan: Make this repo brand-agnostic

## Overview

Reframe of the fork plan: instead of forking first and find-and-replacing MAPS
across ~90 files in the new repo, centralize every brand coupling **in this
repo now** — strings into one config module, the Outseta domain into an env
var, logos/OG into fixed file slots. MAPS becomes just the current _values_
of those variables. The new repo then inherits agnosticism: fill in config +
env + drop in asset files + replace content. No org inputs are needed to do
this work; prod output must stay byte-identical throughout.

Backing reference: `docs/brand-audit-2026-07-16.md` (156 file:line findings),
`docs/new-site-checklist.md` (to be rewritten at the end of this plan).

## Architecture decisions

- **One brand module: `src/utilities/brand.ts`** (already exists with
  `SITE_NAME`/`SITE_DESCRIPTION`). Expand it. It sits in the Payload config
  graph (SEO plugin imports it), so it must stay plain data — **no React, no
  lucide, no client deps**. Social icons therefore stay in the Footer as a
  platform-key → Icon map; brand.ts holds keys + hrefs only.
- **Outseta stays** (user decision). Domain becomes `NEXT_PUBLIC_OUTSETA_DOMAIN`
  with the current MAPS value as the in-code default, so this repo needs no
  env change and the fork sets one var. Client script needs the
  `NEXT_PUBLIC_` prefix (inlined at build); `proxy.ts` reads the same var
  server-side.
- **Asset slots, not asset constants.** Rename `public/maps-logo-*.svg` →
  `public/logo-*.svg` and `public/maps-OG.webp` → `public/og.webp`. Logo alt +
  per-variant dims move into brand.ts. Fork swaps files + one dims object, no
  component edits. `favicon.ico`/`favicon.svg` already have generic names —
  files-to-replace only.
- **What stays fork-time (inherently content, not variables):** seed pages
  (`seed-pages.ts`, `src/seed/prose/*.json`), nav IA (`seedNav.ts`, footer
  COLUMNS values), showroom `gallery.ts` sample data, test fixtures pinned to
  seeded content, migrations baseline, `package.json` name +
  docker-compose names, CLAUDE.md narrative, `redirects.ts` legacy rules,
  import pipeline. Parameterizing content is over-engineering; the rewritten
  checklist covers these.
- Footer COLUMNS (labels + hrefs, plain data) moves to brand.ts anyway — it is
  content, but colocating it with SOCIAL/blurb makes the fork's "edit one
  file" story complete for chrome strings.

## Dependency graph

Phases 1–4 are independent of each other (different files). Phase 5 (sweep +
checklist rewrite) needs all of them landed.

```
Phase 1: brand.ts strings      Phase 2: Outseta env var
Phase 3: asset slots           Phase 4: ops env vars + .env.example
        └──────────────┬──────────────┘
              Phase 5: grep sweep + rewrite new-site-checklist.md
```

## Task List

### Phase 1: Brand strings → brand.ts

**Task 1: Expand brand.ts and rewire string consumers**

- Add to `src/utilities/brand.ts`: `TAGLINE`/footer mission blurb,
  `COPYRIGHT_NAME`, `SOCIAL` (array of `{ platform, href }`), `FOOTER_COLUMNS`,
  `MEMBERSHIP_CTA` (label + `/join` href), email-from fallback
  (`EMAIL_FROM_NAME`/`EMAIL_FROM_ADDRESS` defaults).
- Rewire consumers: `src/Footer/Component.tsx` (SOCIAL hrefs, COLUMNS, blurb,
  copyright, CTA — Icon map stays local, keyed by platform),
  `src/components/BeforeDashboard/index.tsx` (welcome copy uses SITE_NAME),
  `src/payload.config.ts` (Resend fallback reads brand.ts defaults),
  `src/collections/Team.ts` (genericize the admin description example, then
  `npm run generate:types`).
- Acceptance: rendered footer/admin/meta output identical to before; no MAPS
  string literal remains in those consumer files.
- Verification: `npx tsc --noEmit`, `npm run generate:types` clean diff apart
  from Team description, visual diff of footer both themes.
- Scope: M (5 files + brand.ts).

### Checkpoint: Phase 1

- Footer renders pixel-identical, `grep -i "mapsnational\|MAPS" src/Footer src/components/BeforeDashboard` only hits brand.ts imports.

### Phase 2: Outseta domain → env var

**Task 2: `NEXT_PUBLIC_OUTSETA_DOMAIN`**

- `src/components/OutsetaScript/index.tsx` `o_options.domain` and
  `src/proxy.ts` `OUTSETA_DOMAIN` both read
  `process.env.NEXT_PUBLIC_OUTSETA_DOMAIN ?? 'mapsnational.outseta.com'`.
- `tests/int/proxy.int.spec.ts` derives its expected login URL from the same
  var/default instead of a duplicated literal.
- Acceptance: login redirect + JWKS verification unchanged with no env set;
  setting the var switches tenant everywhere at once.
- Verification: `npm run test:int` (proxy spec), manual /members bounce on dev.
- Scope: S (3 files).

### Checkpoint: Phase 2

- `grep -rn "mapsnational.outseta" src/ tests/` hits only the single default (and the test's shared derivation).

### Phase 3: Asset slots

**Task 3: Logo slots + dims config**

- Rename `public/maps-logo-{primary,secondary}-{light,dark}.svg` →
  `public/logo-...svg`. Move `alt` + the `dims` object from
  `src/components/Logo/Logo.tsx` into brand.ts (`LOGO = { alt, dims }`);
  Logo.tsx imports it and builds paths from the generic names.
- Acceptance: header/footer logos render identically both themes, no
  distortion.
- Verification: visual check both themes; `grep -rn "maps-logo" src/ public/`
  = nothing.
- Scope: S (Logo.tsx + brand.ts + 4 file renames).

**Task 4: OG image slot**

- Rename `public/maps-OG.webp` → `public/og.webp`. Add `OG_IMAGE = '/og.webp'`
  to brand.ts; `src/app/(frontend)/layout.tsx`,
  `src/utilities/generateMeta.ts`, `src/utilities/mergeOpenGraph.ts` all
  import it (kills the 3-way duplication).
- Acceptance: og:image URL resolves; all three surfaces emit the same path.
- Verification: view-source on a page + a post; `grep -rn "maps-OG" src/` = 0.
- Scope: S (3 files + brand.ts + rename).

### Checkpoint: Phase 3

- Social preview debugger (or curl of og:image URL) returns the image; both logo variants correct in both themes.

### Phase 4: Ops env vars + env documentation

**Task 5: Railway project ID + .env.example**

- `scripts/refresh-staging.mjs` and `scripts/backup-prod.mjs`: `PROJECT_ID`
  becomes `process.env.RAILWAY_PROJECT_ID ?? '<current id>'`.
- `.env.example`: document `NEXT_PUBLIC_OUTSETA_DOMAIN`, `RAILWAY_PROJECT_ID`,
  and scrub MAPS-specific prose (Resend subdomain note) to generic wording.
- `scripts/register-backup-task.ps1`: parameterize task name + paths or mark
  clearly as machine-local (ponytail: a header comment saying "edit these two
  lines" is enough).
- Acceptance: `npm run refresh:staging:check` passes with no env set.
- Verification: run the check script; read .env.example top to bottom.
- Scope: S (3 scripts + .env.example).

### Checkpoint: Phase 4

- Fresh clone + `.env` from example boots dev with zero MAPS-specific edits.

### Phase 5: Sweep + checklist rewrite

**Task 6: Repo-wide verification sweep**

- `grep -ri "mapsnational\|maps national\|muslim americans" src/ scripts/ tests/`
  — every remaining hit must be one of: brand.ts values, an in-code env
  default, seed/content files, test fixtures pinned to seeded content, or
  showroom gallery data. Anything else gets fixed.
- Full gate: `npm run lint`, `npx tsc --noEmit`, `npm run build`,
  `npm run test:int`, e2e if chrome files changed.
- Scope: S.

**Task 7: Rewrite `docs/new-site-checklist.md`**

- New shape: (1) fill `src/utilities/brand.ts`, (2) set env vars
  (`NEXT_PUBLIC_OUTSETA_DOMAIN` for the new tenant, `RAILWAY_PROJECT_ID`,
  domains), (3) drop in asset files (4 logos + og.webp + favicons) and update
  the `dims` object, (4) swap `tokens.css` values, (5) replace content
  (seed-pages/seedNav/prose/tests/migrations baseline — the fork-time list
  from Architecture decisions), (6) Railway setup (unchanged section).
- Update `docs/brand-audit-2026-07-16.md` header to note findings are now
  centralized (audit stays as the historical record).
- Scope: S (docs only).

### Checkpoint: Phase 5 (FINAL)

- Checklist's "swap" section is ~1 config file + env + assets + tokens.
- All CI gates green locally. Human review before any push (standing rule).

## Risks and Mitigations

| Risk                                                               | Impact | Mitigation                                                                         |
| ------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------- |
| Refactor changes prod output subtly (footer markup, meta tags)     | High   | Values move verbatim; diff rendered HTML of footer + view-source meta before/after |
| brand.ts pulls a client dep into the Payload config graph          | High   | Plain data only; `npm run generate:types` in Phase 1 verification catches it       |
| `NEXT_PUBLIC_` var not inlined where expected                      | Med    | Keep in-code MAPS default so a missing var is a no-op, not a breakage              |
| Logo rename misses a reference (CSS, seed data, gallery)           | Med    | Phase 3 grep for `maps-logo`/`maps-OG` across the whole repo, not just src/        |
| Schema-touching change (Team.ts description) trips migration guard | Low    | Admin `description` is UI-only, no schema change; generate:types confirms          |

## Open questions

None blocking — this whole plan runs on MAPS's current values. The old
fork-plan's org-input questions (name, colors, logo, domain, content, Railway
account) move to the rewritten checklist as "what the new org fills in."
