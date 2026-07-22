# Plan — `/join` membership page

Spec: `SPEC.md`. Branch: `feat/join-page` (off `staging`). Two tasks, each RED→GREEN→build→commit.

## Task 1 — Outseta "register" CTA control

**Goal:** a CTA whose href is the sentinel `#o-register` opens the Outseta signup
modal instead of navigating, reusing the SDK the footer login already uses.

- `src/components/OutsetaRegisterLink/index.tsx` — `'use client'`. Exports:
  - `openOutsetaRegister(e)` — `e.preventDefault()` + `window.Outseta?.auth?.open({ widgetMode: 'register' })`.
  - `OutsetaRegisterLink` — renders the same `Button`/inline styling as `CMSLink`,
    anchor `href="#"`, `onClick={openOutsetaRegister}`.
- `src/components/Link/index.tsx` — after computing `href`, if `href === '#o-register'`
  delegate to `<OutsetaRegisterLink appearance size className label>{children}</>`.
  One conditional; every other link path unchanged (CMSLink stays server for all other hrefs).

**RED:** `tests/int/outsetaRegister.int.spec.ts` (node env) — `openOutsetaRegister`
calls `preventDefault` and `window.Outseta.auth.open({widgetMode:'register'})` with a
stubbed `window.Outseta`; no-op-safe when `window.Outseta` is undefined.

**Acceptance:** handler fires the SDK register widget + prevents default; missing SDK
doesn't throw. `tsc` clean.

## Task 2 — Rebuild `joinSlice` (the page)

**Goal:** `/join` = HighImpact hero (chosen photo, CI-safe) + PricingTiers (2 plans,
national copy, `#o-register` CTAs) + closing CallToAction → `/contact`. Idempotent seed.

- `scripts/seed-pages.ts`:
  - `findMediaByFilename(payload, base)` helper — media `filename like '<base>%'`, return id or `null`.
  - Rewrite `joinSlice`: resolve hero id from `1080925567501035`; found →
    `highImpact` hero with `media`, else → `lowImpact` no-media hero (CI/prod fallback).
    Hero: eyebrow "Join MAPS", h1 "Become a Member", one-line national lead, CTA
    "Join now" (`#o-register`).
  - `pricingTiers` block, `columns:'2'`, `anchorId:'membership'`, header "Membership"
    - short intro. Plans: **Regular Membership** (sworn officers, national eligibility,
      3-item features, CTA "Join now" → `#o-register`), **Supporting Membership**
      (civilian support staff, national, features, CTA). No prices (dues unknown → omit).
  - Closing `callToAction` block — buttons "Join now" (`#o-register`) and "Contact us"
    (`/contact`, outline).
  - `META_BY_SLUG['join']` — title + description.

**RED:** `tests/int/join.int.spec.ts` (node env) — the published `join` page: hero
`type` is `highImpact`|`lowImpact` and has a CTA; layout has a `pricingTiers` block
with exactly **2 plans**, each plan CTA url === `#o-register`; a `callToAction` block
links to `/contact`. Structural only → CI-safe (no dependency on the local-only hero object).

**Acceptance:** test green; `npm run seed:pages` idempotent; `npm run build` compiles;
preview `/join` renders hero + tiers, "Join now" opens Outseta. No migration / no `generate:types`.

## Out of scope / flagged

- Real dues/prices, a third tier, Outseta plan UIDs → ask first (spec).
- Pushing the hero photo to prod/staging bucket → separate media cutover (ADR 0002).
