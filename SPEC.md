# SPEC — /about-us/committees page

## 1. Objective

Add a **Committees** page under About Us, based on the source page
`https://mudduserhm1.sg-host.com/our-committees/`. It explains how the
organization is structured into focus-area committees and routes interested
visitors toward membership.

- **Slug:** `about-us/committees` (nested, sibling of `about-us/mission` and
  `about-us/leadership`).
- **Framing:** National **Muslim American Police Society** (MAPS) — no
  NJMOS/New Jersey specifics (consistent with the `/join` decision).
- **Audience:** prospective members and community partners deciding where to
  plug in.

Seeded from code like every other page (`scripts/seed-pages.ts`), editable in
admin thereafter. No new block, no new dependency — reuses the exact about-us
shape.

## 2. Page composition

Mirror `aboutUsSlice` (LowImpact hero → 3-card CardGrid → CTA):

1. **LowImpact hero** (no media, matching its About Us siblings)
   - eyebrow: `How we're organized`
   - h1: `Committees`
   - lede: one sentence — MAPS is structured into committees, each owning a
     distinct area of focus, so members can engage where they have the most
     impact.
   - links: `[ Become a member → /join, Contact us → /contact (outline) ]`

2. **CardGrid** — `columns: '3'`, `mediaType: 'none'`, `anchorId: 'committees'`,
   header eyebrow `MAPS` / heading `Our Committees`. Three cards, one per
   committee; each card body = a short intro paragraph + a **bulleted focus-area
   list**. Deduped copy (source repeats the first two verbatim):

   | Card                     | lucideIcon  | Focus areas (bullets)                                           |
   | ------------------------ | ----------- | --------------------------------------------------------------- |
   | **Community Outreach**   | `megaphone` | Education & information, event planning, community partnerships |
   | **Membership Services**  | `users`     | Recruiting & onboarding, mentoring, scholarships, member events |
   | **Business Development** | `handshake` | Corporate partnerships, sponsorships, fundraising               |

   (Confirm each `lucideIcon` is in `src/blocks/CardGrid/icons.ts`; substitute
   the nearest listed name if not.)

3. **CTA** (`blockType: 'cta'`)
   - h2 `Get involved`, one paragraph inviting members to join a committee.
   - links: `[ Become a member → /join ]`

## 3. Implementation (scope of changes)

All in `scripts/seed-pages.ts` unless noted:

1. **`bulletList` lexical helper** — none exists yet; add one next to
   `heading`/`paragraph`:
   ```ts
   const listItem = (value: string, i: number) => node('listitem', { value: i + 1 }, [text(value)])
   const bulletList = (...items: string[]) =>
     node(
       'list',
       { listType: 'bullet', tag: 'ul', start: 1 },
       items.map((v, i) => listItem(v, i)),
     )
   ```
2. **`committeesSlice: PageSlice`** — returns the single PageData above (cast
   `as unknown as PageData` like the others). Card `body` =
   `richText(paragraph(intro), bulletList(...focusAreas))`.
3. Register `committeesSlice` in `PAGE_SLICES`.
4. Add `META_BY_SLUG['about-us/committees']` = `{ title: 'Committees',
description: 'The committees of ' + SITE_NAME + ' and the focus areas each one leads.' }`.
5. **Nav** — add `{ label: 'Committees', href: '/about-us/committees' }` to the
   About Us `items` in `src/Header/seedNav.ts` (after Leadership). Idempotent
   seed only fills an empty global, so this shows on fresh DBs / CI e2e; an
   existing dev/prod nav needs the same link added by hand in admin.

**No** new block, config, component, migration, or type change — CardGrid and
LowImpact already exist, so `generate:types` / migration guard are untouched.

## 4. Code style

- Follow the existing slice idioms exactly: `richText`/`heading`/`paragraph`
  helpers, `ctaLink(label, url, appearance?)`, `PageData` cast, `_status:
'published'`.
- Tokens/`.type-*` only — no styling work (blocks already own their styles).
- Reuse; don't fork. Bullet list is the one genuinely-missing primitive.

## 5. Testing strategy

New int spec `tests/int/committees.int.spec.ts` (node env, mirror
`aboutUs.int.spec.ts`). Assert on the seeded `about-us/committees` page:

- exists, `_status === 'published'`, hero type `lowImpact`.
- layout contains a `cardGrid` and a `cta`.
- the CardGrid has exactly **3** cards, each with a truthy `heading`, and any
  `lucideIcon` present is in `cardIconNames` (guards the empty-chip trap).
- hero links include `/join`.

Run: `npx vitest run --config ./vitest.config.mts tests/int/committees.int.spec.ts`.
Then `seed:pages` (idempotent) → `generate:types` no-op check → `build`.
Verify in preview at `/about-us/committees` (renders 3 committee cards with
bullets, CTA to /join).

## 6. Boundaries

**Always:** national MAPS voice; reuse CardGrid/LowImpact; seed from code;
keep the change to `seed-pages.ts` + `seedNav.ts` + one test; commit message /
PR text as if written solely by the author (no AI/co-author trailers); PR base
= **`staging`**.

**Ask first:** adding a hero image (deliberately omitted to match the About Us
family — upgrade path: switch hero to `highImpact` + a Photo Library group
photo via `findMediaByFilename` with a LowImpact fallback, exactly like
`joinSlice`); adding a 4th committee; any new block or dependency.

**Never:** hardcode hex/px; edit generated files by hand (`payload-types.ts`,
`importMap.js`); mass-push content over prod; open the PR against `master`.

---

_Deliberately lazy: no hero image, no new block, no committee-detail subpages —
the source page has none. Add any of them only when real content exists._
