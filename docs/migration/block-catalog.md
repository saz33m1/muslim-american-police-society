# Block catalog — Webflow/Relume → Payload

> **Phase 3 (#19) — draft for review.** The de-duplicated, page-driven source of truth for what blocks to build. The payload-webflow-section-port skill (#18) and Phase 4 port **against this catalog, not page-by-page.** Authoring contract: see "Section porting" in [CLAUDE.md](../../CLAUDE.md).

**Source:** Webflow/Relume export at `migration/_extracted/` (gitignored), ~30 content pages + CMS templates. **Method:** every page's sections inventoried, grouped by *intent* (not markup), classified, and checked for cross-page consistency.

**Classification legend**
- **port** — a Relume source section exists → build a new native block.
- **existing-variant** — no new block; an existing block/hero/collection covers it (maybe + a `variant`).
- **net-new** — no source and nothing existing fits → design from the system (tokens + `src/components/ui`).

The big finding: the same intent is rendered under many different Webflow class names. **Card grid**, **mini-hero**, and **blog listing** each appear under 4+ wrappers but are one block apiece. Consolidating by intent takes ~30 pages of ad-hoc sections down to **11 new blocks + 5 reused + ~5 CMS collections**.

---

## 1. New blocks to build (port)

> **Build status (2026-06-23).** 9 of these 11 are shipped as native blocks on `master`: **CardGrid, FeatureSplit, FAQ, LogoStrip, Gallery** (shipped as `MediaGallery` — renamed to avoid colliding with the blocks-gallery showroom), **PricingTiers, ComparisonTable, Timeline** (built vertical, not horizontal), **ContactDetails**. Remaining: **Testimonials** (blocked — needs the Testimonials collection in §4 first) and **MapLocationCards** (blocked — needs a Google Maps API key). Each ships with a colocated `gallery.ts` and appears in `/design-system/blocks`.

| Block | Intent | Source classes (deduped) | Pages | Key fields / variants |
|---|---|---|---|---|
| **CardGrid** ⭐ | feature-grid / resource cards / icon steps | `membership_grid-wrapper`, `home_features-list-1`, `states_layout-component`, `layout_list`, `career_layout-component`, `layout311_list` | index, partners, programs (A), members (5), portal | `items[]` (media, heading, body, `buttons[]`, `requiredPlans[]`), `mediaType` (icon/image/none), `columns`. **Highest reuse.** |
| **FeatureSplit** | alternating image + text | `academic_layout-component`, `layout_component`, `layout69`, `home_features-list-2` | partners, programs (A), members/new-york-state, portal | `imageSide` (L/R), `eyebrow`, `heading`, `body`, `cta`, `image`/`backgroundVideo` |
| **FAQ** ⭐ | intro-fused accordion | `faq_component` / `section_fellowships-young` | join, about-us/faq, programs/community-building + policy-initiatives, resources ×3 | optional intro column (heading, rich text, `ctas[]`) + `items[]` (unbounded). Rebuild Webflow IX2 toggle natively. |
| **Testimonials** | quote slider (CMS) | `testimonial_component` | index (×2) | bound to **Testimonials** collection; `variant` (slider/grid) |
| **LogoStrip** | partner logos | `slider-partners`, `logo_component` | index, partners | `items[]` (logo, optional link), `layout` (carousel/grid) |
| **Gallery** | lightbox image grid/slider | `gallery_component`, `section_slider` | mission, members/new-york-state, index, post detail | `images[]`, `layout` (grid/slider), `lightbox` |
| **PricingTiers** | membership plans | `pricing_grid-list` | join | `plans[]` (title, price, desc, `features[]`, cta) |
| **ComparisonTable** | method/feature compare | `comparison_component` | donate | `columns[]`, `rows[]` (label, per-column check/value), QR/icon support |
| **Timeline** | horizontal year timeline | `timeline_component` | mission | `items[]` (year, title, body). Static; scroll-animated. Low reuse. |
| **MapLocationCards** | venue + embedded map cards | `contact_grid-list` / `contact_location` | resources/jumuah | `items[]` (map latlng, heading, address richtext). **Needs a Maps API key.** Borderline net-new. |
| **ContactDetails** | email/address sidebar | `contact_component` (left col) | contact-us | small block paired with the Form block; `items[]` (icon, label, value). Could fold into Form layout. |

⭐ = build first (highest leverage / appears across the most pages).

---

## 2. Page intros / heros → existing heros (existing-variant)

Every page intro maps onto an **existing hero**; none needs a new component. The win here is standardizing one rendering.

| Hero variant | Used for | Pages |
|---|---|---|
| **HighImpact** (big, bg image + dual CTA) | full marketing hero | index |
| **MediumImpact** (split text + side image) | donate, join, portal | donate, join, members/portal |
| **LowImpact** (page-title header) ⭐ | interior page titles | about-us/* (6), programs A (3), members content pages, new-york-state |

**LowImpact must absorb the variation** (see §5): optional **eyebrow/tagline**, optional **breadcrumb**, intro rich text, 0–2 CTAs. ✅ **Done (2026-06-23)** — the LowImpact hero now has `eyebrow`, `breadcrumbs`, and CTA fields.

---

## 3. Existing blocks / collections reused (existing-variant)

| Source pattern | Maps to | Pages |
|---|---|---|
| Blog/news/events listing (`hero_blog-component`, `events_blog-component`, `blog_component`, `portal_blog-list`, `section_blog`) | **ArchiveBlock** + Posts | index, events, press, portal, latest-updates(+archive) |
| Post detail (`blog_post-header_component` + richtext) | **PostHero + Content** | detail_latest-updates |
| Prose sections (mission/values/history, "under construction") | **Content** | mission, resources-points-of-contact |
| Contact form + footer newsletter | **Form** (form-builder) | contact-us, footer (all pages) |

---

## 4. CMS collections implied (model in Payload)

| Collection | Status | Evidence |
|---|---|---|
| **Posts** | exists | latest-updates listing + detail |
| **Team** ⭐ | new | `team_component` grids on 4 about-us pages (board ×4, advisory, state-committees ×10), per-member bio modal, `detail_team` stub. Needs category/state filter. |
| **Testimonials** | new | index sliders + `detail_testimonials-career`/`-membership` stubs (type: career/membership) |
| **Events** | new | events list, portal member-only events |
| **AcademyVideos** (+ categories) | new | members video lists, policy-legal-advocacy `rights-issues`, `detail_maps-acadmey-videos`/`detail_video-categories` stubs |
| **Partners** | optional | logo strip could be a collection or inline block items |

> The Webflow CMS lists are all empty placeholders in the export (`w-dyn-bind-empty`) — content is re-entered in Payload, not migrated as markup.

---

## 5. Gaps & net-new (no source / unfinished)

**No hero at all (source gap)** — these pages open cold; add a **LowImpact mini-hero** on migration: `events`, `press`, `contact-us`, all 4 `resources/*`, `latest-updates`(+archive), programs `community-building` + `policy-initiatives`, `members/resources-points-of-contact`.

**Unfinished / stub (decide: build real or drop)**
- `members/resources-points-of-contact` — "Under Construction" + an **empty** `section_team`. Stub.
- `members/portal` — `layout311` + `layout69` sections are Webflow template boilerplate (Lorem ipsum, placeholder buttons, empty background-video).
- `detail_team`, `detail_testimonials-*` — exported as **empty 2538-byte stubs**; detail layouts must be **designed net-new** from the collection schema.

**True net-new** — `MapLocationCards` (jumuah; needs Maps API). Post per-item **gallery/slider** on Posts.

---

## 6. Consistency recommendations (advisory — HITL to accept)

The `design:` review lens — `design:design-critique` (consistency / hierarchy), `design:design-system` (token + variant conformance), `design:accessibility-review` (WCAG / AAA). These are *recommendations to standardize on migration*, not auto-applied.

1. **Mini-hero rendered 4+ ways** — `section_content` h2 (board/advisory/state-committees), `content_component` h1 (mission), `doneate_header-component` h1 (partners), breadcrumb embedded-in-section h2 (maps-academy-vids), no-breadcrumb (new-york-state). → **one LowImpact variant**, consistent heading level, optional breadcrumb.
2. **Blog listing under 4 class names**, identical structure → **one ArchiveBlock**.
3. **Card grid under 6 class names**, same structure → **one CardGrid** block; `feature-grid` items need an *optional* per-item CTA (career-support has none, legal-advocacy has buttons).
4. **FAQ pages bury the page title** in an `<h2 id="top">` inside the FAQ (programs/community-building, policy-initiatives, resources/*) instead of a real header → give them a LowImpact mini-hero.
5. **One-off wrapper classes** — `section_georgia` (state-committees) should be the standard team section; normalize.
6. **Authoring bugs to fix on migration** — public-sector-engagement renders its feature-grid **twice** (verbatim copy-paste); board-leadership has a **duplicate anchor id**; maps-academy-vids breadcrumb mislabeled "Professional Development".

---

## 7. Build order (suggested)

1. **LowImpact** mini-hero variant (eyebrow + breadcrumb + CTAs) — unblocks every interior page.
2. **CardGrid** ⭐ — highest reuse.
3. **FAQ** ⭐ — ~7 pages.
4. **Team** collection + team-grid block — 4 pages, modal.
5. **FeatureSplit**, **Gallery**, **LogoStrip**.
6. Long tail: **PricingTiers**, **ComparisonTable**, **Timeline**, **MapLocationCards**, **ContactDetails**.
7. CMS: **Events**, **Testimonials**, **AcademyVideos**.

> The worked example for the payload-webflow-section-port skill (#18) should be **CardGrid** or **FAQ** — highest reuse, real variants, exercises the full port → register → render path.
