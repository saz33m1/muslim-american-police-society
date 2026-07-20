# Brand-coupling audit — 2026-07-16

Full sweep for hardcoded MAPS-specific content, run via a 6-lens agent audit
(names/domains, site chrome, contact/social, assets, sample/seed data,
tests/config) with per-file verification and a completeness pass. 150
confirmed items across ~90 files, grouped below by area.

**Update (2026-07-16, later):** most of the items below were centralized
directly in this repo rather than left as fork-time find-and-replace — see
`docs/new-site-checklist.md` for the current (post-centralization) bootstrap
steps. Site strings, the Outseta domain, and the logo/OG assets now live
behind `src/utilities/brand.ts` + two env vars + fixed asset filenames
instead of scattered literals. What's below is the historical record of
where those literals used to live; still accurate for what remains
genuinely fork-time (content, tests, tokens, Railway setup).

Legend: **swap** = replace value for the new org · **strip** = delete
entirely · *(keep)* = looked brand-ish, verified as a false alarm or
genuinely vendor/mechanism-generic.

## Core brand strings & SEO

| File | Lines | What |
|---|---|---|
| `src/utilities/brand.ts` | 4, 6-7 | `SITE_NAME` / `SITE_DESCRIPTION` — single source for SEO/OG |
| `src/utilities/generateMeta.ts` | 12 | Default OG image fallback `/maps-OG.webp` |
| `src/utilities/mergeOpenGraph.ts` | 11 | Default OG image `/maps-OG.webp` |
| `src/app/(frontend)/layout.tsx` | 84 | Twitter card image `/maps-OG.webp` |
| `src/app/(frontend)/layout.tsx` | 54-55 | Favicon paths (files are the MAPS logomark) |
| `src/app/(frontend)/search/page.tsx` | 135 | Comment example URL uses `mapsnational.org` |
| `src/app/(frontend)/design-system/page.tsx` | 154, 223 | Type-specimen samples ("Empowering public servants", `'maps'` slug) |
| `src/app/(frontend)/design-system/page.tsx` | 195, 204 | Hadith citation sample in RichText blockquote demo |

## Footer & header chrome

| File | Lines | What |
|---|---|---|
| `src/Footer/Component.tsx` | 42-56 | `SOCIAL` const — 5 hardcoded social URLs |
| `src/Footer/Component.tsx` | 9-32 | `COLUMNS` const — hardcoded nav IA, not CMS-driven |
| `src/Footer/Component.tsx` | 71-74 | Mission blurb naming MAPS |
| `src/Footer/Component.tsx` | 130 | `© {year} MAPS. All rights reserved.` |
| `src/Footer/Component.tsx` | 76-81 | "Become a member" CTA → `/join` |
| `src/Footer/Component.tsx` | 7, 83-84 | `<PortalLogin />` — Outseta login wiring |
| `src/components/Logo/Logo.tsx` | 39, 52, 62, 69, 71 | Alt text "MAPS National" + 4 SVG asset paths |
| `src/components/Logo/Logo.tsx` | 21-24 | Hardcoded intrinsic width/height per variant |
| `src/Header/seedNav.ts` | 9-41 | Full MAPS IA (About Us / Programs groups, "MAPS Events" label) |
| `src/Header/DesktopNav.tsx` | 163, 180 | Outseta login/logout SDK calls *(swap only if dropping Outseta)* |
| `src/Header/DesktopNav.tsx` | 181, 183 | Hardcoded `/donate` CTA button |
| `src/Header/NavMenu.tsx` | 116-129 | Mobile Outseta login/logout *(keep — vendor-generic)* |
| `src/Header/NavMenu.tsx` | 233-238 | Mobile `/donate` CTA *(keep — internal route, no brand string)* |
| `src/Header/config.ts` | 11 | Admin help-text example path *(keep — editor-only)* |
| `src/components/BeforeDashboard/index.tsx` | 12, 16-18 | Admin dashboard welcome text names MAPS |

## Outseta / membership (architectural, not cosmetic)

| File | Lines | What |
|---|---|---|
| `src/proxy.ts` | 21-25 | `OUTSETA_DOMAIN` — drives the `/members` JWT gate + JWKS |
| `src/proxy.ts` | 9-11 | Doc comment recounts MAPS migration history — strip |
| `src/proxy.ts` | 71-72 | Cookie-name check *(keep — vendor-generic)* |
| `src/components/OutsetaScript/index.tsx` | 25 | Tenant domain in `o_options` |
| `src/components/OutsetaScript/index.tsx` | 29, 34 | Post-login callback → `/members/portal` |
| `src/Footer/PortalLogin.tsx` | 5-11, 16, 20 | Entire component — Outseta nocode + auth.open |
| `src/blocks/MemberPortalHero/Component.tsx` | 17-119 | `getUser`/`profile.open()`, state-committee tile, collage bg |
| `src/blocks/MemberPortalHero/gallery.ts` | 3-21 | Sample copy mirrors MAPS org structure + names Outseta |
| `src/types/outseta.d.ts` | 1-13 | *(keep — pure vendor SDK typing, no brand strings)* |
| `tests/int/proxy.int.spec.ts` | 10 | Duplicates `OUTSETA_DOMAIN` as a literal |
| `tests/helpers/e2e.ts` | 17-21 | Outseta console-noise ignore pattern |

## Payload config, admin, collections

| File | Lines | What |
|---|---|---|
| `src/payload.config.ts` | 76-77 | Resend `defaultFromAddress`/`defaultFromName` fallback |
| `src/collections/Team.ts` | 49 | Admin field description example ("President, MAPS Texas") |
| `src/collections/AcademyVideos.ts` | whole file | MAPS Academy-specific collection — strip if no equivalent program |
| `src/payload-types.ts` | 1572 | Generated JSDoc copy of the Team.ts example — regenerate, don't hand-edit |

## Design tokens & CSS

| File | Lines | What |
|---|---|---|
| `src/app/(frontend)/tokens.css` | 4 | Comment naming migration source file — strip |
| `src/app/(frontend)/tokens.css` | 9, 25 | `--brand-primary-base` / `--brand-secondary-base` hex ramp |
| `src/app/(frontend)/tokens.css` | 69-70 | `--font-body` / `--font-heading` stacks (Montserrat/Lora) |
| `src/app/(frontend)/globals.css` | 447-467 | Outseta nocode counter-rules *(keep — vendor-generic, no brand strings)* |

## Brand assets (`public/`)

All **swap** (replace the file) unless noted:

- `public/maps-logo-{primary,secondary}-{light,dark}.svg` (4 files) — logo artwork
- `public/maps-OG.webp` — OG/social share image (has the wordmark baked into pixels)
- `public/favicon.ico`, `public/favicon.svg` — logomark
- `public/gallery/event-capitol.webp` and siblings — real MAPS event photography used across gallery.ts showroom files
- `public/portal/member-collage.webp` — MemberPortalHero background collage (real people)
- `public/import/team/*` (86 files), `public/import/prose/*` (77), `public/import/slider/*` (40) — **strip**, real people/events, tied to the import pipeline being deleted
- `public/documents/MAPS-Messaging-Policy-*.pdf` + 2 sibling docs — **strip**, MAPS-authored policy docs

## Seed content (`scripts/seed-pages.ts`, `src/seed/prose/*.json`)

Entire page bodies are MAPS prose (mission, programs, FAQ, join, donate,
contact, press, resources) — **strip** and author fresh for the new org's
3-4 pages. Notable embedded specifics beyond prose copy:

- Real EIN (`86-2920622`), PayPal/Zelle donation details, QR code images
- Physical mailing address (420 Florida Ave NE)
- ~15 real MAPS functional mailboxes (`outreach@`, `legaladvocacy@`, 7 state-chapter addresses)
- Named individuals: state-committee officers, board chair, staff (Aamer Uddin, etc.)
- 13 live Signal chat invite links + 8 bit.ly shortlinks to member spaces
- 13 live Google Forms/Drive URLs for program intake
- Outseta plan UIDs on the join page's pricing tiers
- `jumuahServicesSlice` — DC-metro venue addresses/phones — **strip** whole slice
- `TEAM_ORDER`/`TEAM_INACTIVE` — ~70 real people, display order
- `SLUG_REDIRECTS` — legacy Webflow URL 301s, meaningless without that old site

## Import pipeline (`src/import/`, `scripts/import-*.ts`, `scripts/rehost-images.ts`)

Whole pipeline is **strip** per the checklist (skip imports for 3-4 pages).
If a new org *does* do a Webflow migration, the mapping *machinery* is
reusable — only the CSV filenames (they embed MAPS's Webflow export IDs) and
column-name comments need swapping.

## Showroom sample data (`src/blocks/*/gallery.ts`, `src/heros/gallery.ts`)

Systemic — not a one-off. `src/blocks/gallery-helpers.ts` holds the shared
pool (11 event photos + 4 partner logos, all real MAPS content with MAPS
alt text), consumed by ~20 gallery.ts files: Team, ContactDetails,
MapLocationCards, PricingTiers, FAQ, Timeline, CardGrid, heros,
AcademyVideos, ArchiveBlock, CallToAction, Content, Form, MediaBlock,
FeatureSplit, LogoStrip, ComparisonTable, MediaGrid, MediaSlider,
Testimonials. The showroom is internal/noindexed, so this is cosmetic-only —
budget real time here only if `/design-system/blocks` matters to the new org.

## Ops scripts & docs

| File | Lines | What |
|---|---|---|
| `scripts/refresh-staging.mjs` | 34-36, 226 | Railway `PROJECT_ID` const + staging URL fallback |
| `scripts/backup-prod.mjs` | 11, 19, 28 | Railway `PROJECT_ID` const + example paths |
| `scripts/register-backup-task.ps1` | 12-14 | Task name + local checkout/backup paths (embeds Windows username) |
| `docker-compose.yml` | 14, 40-43 | **Two** hardcoded strings: `container_name: maps-website-images` (14) and the pinned volume `name: maps-website-media` (43) |
| `.env.example` | 54-62 | Resend setup prose names MAPS + example subdomain |
| `CLAUDE.md` | 44, 76, 90 | Volume name, prod + staging custom domains |
| `docs/adr/0002-*.md`, `0003-*.md` | — | Staging domain referenced |
| `docs/restore-drill.md` | 11, 24, 35, 45, 55-66 | Backup paths + a historical drill log with real MAPS data counts |
| `docs/migration/*.md` | — | Entire directory is MAPS Webflow-migration history — strip |
| `.claude/skills/payload-webflow-section-port/SKILL.md` | 36, 53 | Live Webflow cross-check URL, brand hex colors |
| `docs/new-site-checklist.md` | — | *(keep — this doc is itself org-agnostic meta-instruction)* |

## Tests pinned to seeded content

e2e (`posts.e2e.spec.ts`, `members.e2e.spec.ts`, `heros.e2e.spec.ts`,
`responsive.e2e.spec.ts`, `a11y.e2e.spec.ts`) and int
(`api.int.spec.ts`, `search.int.spec.ts`) specs assert against specific
seeded MAPS slugs (`maps-academy-climbing-the-federal-ladder`, `/programs`,
`/members/community-building`) and one tracked fixture image
(`public/import/prose/1.webp`). These aren't independently brand-coupled —
they just need matching fixture values once the new org's seed content
exists. `redirects.ts` (repo root) also strips its three `legacyPosts*`
Webflow-migration redirect rules.

## Follow-up pass (2026-07-16, completed)

The 6 files/agents that failed on the spend-limit cap were re-run to
completion, plus a completeness critic against the full ~150-item list.

| File | Lines | What |
|---|---|---|
| `src/seed/prose/programs-career-support.json` | 26, 45, 65, 84, 85, 103, 104, 123 | MAPS/membership-tier copy, "MAPS Academy Training Series" heading — **strip** with the rest of seed prose |
| `src/seed/prose/programs-career-support.json` | 132-153 | Four page-specific migrated images, likely org photography — **swap** |
| `src/seed/prose/resources-jumuah-prayer-services-washington-dc.json` | — | *(keep — DC-metro/Federal-agency topic scoping, no literal org name/domain/person)* |
| `tests/e2e/public.e2e.spec.ts` | 9, 10, 12 | Homepage/programs h1 regexes tied to MAPS copy, `/about-us/mission` route — **swap** alongside seed content |
| `tests/e2e/public.e2e.spec.ts` | 11 | `/about-us` route check *(keep — generic slug convention)* |
| `tests/e2e/navigation.e2e.spec.ts` | 17-35 | "About Us"/"Programs" nav label+href assertions *(keep — generic once the new org has equivalent hub pages)* |
| `next.config.ts` | — | *(keep — fully generic, nothing brand-coupled)* |

**Critic gap found:** `docker-compose.yml` line 14, `container_name:
maps-website-images` on the minio service — a second hardcoded org-name
string distinct from the volume `name` on line 43. Folded into the
docker-compose row above and into the checklist. No further gaps reported —
sweep is now complete.
