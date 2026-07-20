# Redirect audit — old Webflow URLs

Closes #154. Confirms every old Webflow URL resolves to a live 200 destination
(directly, via a permanent redirect, or via the members auth gate) so no inbound
link 404s after the prod cutover.

## Source of old URLs

No Webflow `sitemap.xml` shipped in the export, so the authoritative old-URL set
is the static HTML tree in `migration/mapsnational.webflow/` (gitignored). Excluded
as non-URLs: Webflow error pages (`401.html`, `404.html`) and CMS **template**
pages (`detail_*.html`, e.g. `detail_team.html` — Webflow collection layouts, never
served as real paths).

## CMS collection items resolve by identity, not by redirect

Old CMS detail URLs (`/latest-updates/<slug>`, etc.) need no redirects: the import
`slug` transform ([src/import/transforms.ts:66](../../src/import/transforms.ts))
carries the original Webflow Slug column over verbatim, so new slug == old slug by
construction. One outlier row whose raw slug fails to import is tracked separately
as #163; it is a data/import bug, not a missing redirect.

## Redirect map

Four legacy slug moves are upserted into the `redirects` collection by
`applyRedirects` / `SLUG_REDIRECTS` in
[scripts/seed-pages.ts:5562](../../scripts/seed-pages.ts). `PayloadRedirects`
serves them as **308** (permanent, method-preserving — equivalent to a 301 for
link and SEO preservation):

| Old URL | Redirects to |
| --- | --- |
| `/contact-us` | `/contact` |
| `/latest-updates-archive` | `/latest-updates` |
| `/programs/public-sector-engagement` | `/programs/private-sector-engagement` |
| `/resources/jumuah-prayer-services-washington-dc` | `/resources/jumuah-services` |

## Live resolution (prod, mapsnational.org)

Every old static URL was curled against prod following redirects. All land on a
200 final destination:

- **Direct 200** — `/`, all `/about-us/*`, `/donate`, `/events`, `/join`, `/press`,
  all `/programs/*` (except the moved one), `/resources/federal-employment`, both
  `/resources/public-service-fellowships-*`, `/latest-updates`, `/members/portal`.
- **308 → 200** — the four moved slugs above, each landing on the correct target.
- **Members gate → 200** — the Outseta-gated `/members/*` pages
  (`community-building`, `maps-academy-vids`, `new-york-state`,
  `policy-legal-advocacy`, `professional-development`, `resources-points-of-contact`)
  redirect an unauthenticated visitor to `/` (200). The pages exist (they are in
  `pages-sitemap.xml`); this is the auth gate, not a broken link.

## The one intentional 404

`/style-guide` (Webflow's auto-generated style-reference page) returns 404 by
design. It is not real content and carries no external inbound links, so it gets
no redirect.

## Acceptance criteria

- [x] Full list of old Webflow URLs assembled — from the static export tree (no
  Webflow sitemap existed).
- [x] Every old URL resolves to a 200 destination — verified live; sole exception
  `/style-guide` is a deliberate 404 (non-content, unlinked).
- [x] Any missing redirects added — none were missing; the four known slug moves
  were already in `SLUG_REDIRECTS`, CMS items are identity-preserved.
- [x] Known moved slugs covered — private-sector-engagement plus the three others.
- [x] Prod spot-check — the four moved slugs return 308 to the correct target on
  mapsnational.org.
