# Plan — `/about-us/committees` page

Spec: `SPEC.md`. Branch: `feat/committees` (off `staging`). One task, RED→GREEN→build→commit.

## Task 1 — Seed the Committees page + nav link ✅ done

**Goal:** a seeded `about-us/committees` page (LowImpact hero + 3-card CardGrid +
CTA), national MAPS voice, deduped focus-area copy, plus an About Us nav link.
Clone of `aboutUsSlice`; no new block/dependency/migration.

**Changes**

- `scripts/seed-pages.ts`:
  - add `bulletList` lexical helper (list + listitem nodes) next to `heading`/`paragraph`.
  - add `committeesSlice: PageSlice` returning the page (LowImpact hero →
    `cardGrid` w/ 3 committee cards, each body = intro paragraph + `bulletList` of
    focus areas → `cta` linking `/join`).
  - register `committeesSlice` in `PAGE_SLICES`.
  - add `META_BY_SLUG['about-us/committees']`.
- `src/Header/seedNav.ts`: add `{ label: 'Committees', href: '/about-us/committees' }`
  to About Us `items` (after Leadership).

**RED:** `tests/int/committees.int.spec.ts` (node env, mirror `aboutUs.int.spec.ts`):

- page seeded, `_status === 'published'`, hero type `lowImpact`.
- layout has `cardGrid` + `cta`; CardGrid has exactly 3 cards, each with a truthy
  `heading`, and any `lucideIcon` present is in `cardIconNames`.
- hero links include `/join`.

**GREEN:** implement the slice + helper + nav so the test passes against the seeded DB.

**Verify:** `seed:pages` (idempotent) → full `test:int` → `generate:types` no-op →
`build`. Preview `/about-us/committees`.

**Done when:** test green, suite green, build compiles, page renders 3 committee
cards with bullets and a CTA to `/join`.
