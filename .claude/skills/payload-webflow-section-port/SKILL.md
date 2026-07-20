---
name: payload-webflow-section-port
description: Port one Webflow/Relume source section into one native Payload block, end-to-end. Use this whenever migrating a section from the gitignored migration/ export into a block, building or revising a block from the block catalog (docs/migration/block-catalog.md), translating Relume/Client-First markup to brand tokens, or whenever the user says "port this section", "turn this into a block", "build the <X> block", or works through Phase 3/4 of the migration. Covers the port path: classify → trace source → build config + component (+ gallery) → register in both registries → generate types → cross-check the live site → run the design gates → emit consistency notes. Reach for it even when the user names a specific block (FAQ, CardGrid, FeatureSplit, LogoStrip, …) rather than the word "port". Not for net-new blocks with no source section, nor for standing up a new CMS collection (Team / Events / Testimonials) — those are handed off; the query-and-render block that *displays* a collection is in scope.
---

# Section Port (Webflow/Relume → native Payload block)

Turn **one** port-classified catalog entry into **one** native Payload block, mapped to brand tokens, registered, type-checked, cross-checked against the live site, and run through the design gates — with any drift surfaced as consistency notes for a human to accept (never silently ported).

This is the repeatable contract behind Phase 3/4 of the OSS migration (ADR 0001, [docs/adr/0001-visual-editor-puck-vs-native-blocks.md](../../../docs/adr/0001-visual-editor-puck-vs-native-blocks.md): Puck superseded by native blocks). The authoring conventions it encodes also live in the **Section porting** section of [CLAUDE.md](../../../CLAUDE.md); this skill operationalizes them into an ordered procedure.

## When this applies — and when it does not

**Use it for the port path:** a Relume/Webflow source section exists in `migration/_extracted/` and needs to become a native block, or an existing block/variant needs to absorb a source section.

**Out of scope — hand these off, don't force them through here:**
- **Net-new blocks** (no source, nothing existing fits) → compose from `src/components/ui` primitives + tokens per the conventions in CLAUDE.md. Do **not** use `frontend-design` here — that skill is generative/greenfield, and the port path reproduces an existing design inside a locked brand system. Reserve `frontend-design` for the net-new path only, guard-railed to the brand tokens.
- **CMS collections** (Team, Events, Testimonials, AcademyVideos) → modeling the **collection** is full-stack (schema + DB + query) and out of scope here. The boundary is collection-vs-block: once the collection exists, the **query-and-render block that displays it** *is* in scope and can use this skill for its presentation layer (the Team grid is exactly such a block, and the live cross-check illustration in the references).
- **Page-level audits** → a whole-page consistency pass is a separate, later effort; this skill is per-section.

## Input contract

A **port-classified** catalog block from [docs/migration/block-catalog.md](../../../docs/migration/block-catalog.md), including:
- its **intent** (the catalog clusters by intent, not markup — the same FAQ/CTA/card-grid rendered many ways is **one** block);
- its **variants** (rendered differently across pages → fields or a `variant` select, **not** duplicate blocks);
- a trace to the **source** in the gitignored `migration/_extracted/` (Client-First/Relume class names). The export is the **port source**; the live site is **reference only**.

## Output contract

A native block matching the existing `src/blocks/*` shape:
- colocated **`config.ts`** (Payload field schema) + **`Component.tsx`** (React render);
- a **`gallery.ts`** sample-data entry for the `/design-system/blocks` showroom;
- registered in **both** registries and the showroom (see step 4 — this repo uses a two-registry split, not a hand-edited switch);
- `npm run generate:types` run clean; `generate:importmap` only changes for a custom **admin** component (else "No new imports" — revert its CRLF-only churn);
- variants modeled as **fields / a `variant` select**, never near-duplicate blocks;
- **brand tokens only** — never an inlined Webflow hex/px; map to the nearest token (`tokens.css`). Base navy `#0d1e6c` / maroon `#8b0a03` are fixed.

## Procedure

Work an item top to bottom. Steps 6–8 are the gates that distinguish a *port* from a *re-skin*.

1. **Classify & confirm intent.** Find the catalog entry. Confirm it is **port** (not existing-variant or net-new). Cluster by intent: if an existing block or a `variant` of one already fits, extend that — do not build a near-duplicate. An interior-page header is almost always a `LowImpact` hero variant, not a new block.

2. **Trace the source.** Locate the section in `migration/_extracted/` by its catalog class names (e.g. `faq_component`, `team_component`). Read the real markup — structure, the fields it binds, its variants across pages. Webflow IX2 interactions, forms, CMS displays, and embedded scripts **do not carry over** — rebuild natively (native `<details>`, the form-builder, Payload collections).
   - Copy any real brand assets it needs into **tracked** `public/` (e.g. `public/gallery/`); `migration/` is gitignored, so anything referenced from it won't survive a clean checkout.

3. **Build the block.** Author `config.ts` + `Component.tsx` (+ `gallery.ts`), matching the shape and idiom of neighboring blocks. Model every cross-page difference as a field or `variant`. For client interactivity (state, listeners, modals), keep the server `Component.tsx` resolving data and rendering a `'use client'` child — the config graph must stay server-only. Map every style to a token. See [references/block-anatomy.md](references/block-anatomy.md) for the exact file layout, the server→client split, and the interactive-block pattern.

4. **Register in both registries + the showroom.** This repo splits the registry on purpose — `src/blocks/index.ts` exports field configs (consumed by collections; **never** imports React), `src/blocks/blockComponents.ts` maps `slug → component` (read by `RenderBlocks`; render-side only). Add the config to `index.ts`, the component to `blockComponents.ts`, and the `gallery.ts` to `src/blocks/gallery.ts`. Importing a component into `index.ts` breaks `generate:types`. Full step-by-step in [references/block-anatomy.md](references/block-anatomy.md#registering-a-block).

5. **Generate types & verify the build.** Run `npm run generate:types`, then `npx tsc --noEmit` (0 errors). Run `generate:importmap` only if you added a custom admin component. Revert any CRLF-only churn in `importMap.js` / `payload-types.ts` before committing. **Schema-drift caution:** with `push: true` and one shared dev DB, a renamed field/table can make drizzle-kit prompt interactively and hang the headless dev server — merge block PRs promptly and watch for it (see [references/block-anatomy.md#schema-drift](references/block-anatomy.md#schema-drift)).

6. **Cross-check the live site.** Compare the rendered block against its counterpart on `https://mapsnational.webflow.io/` — structure / content / interactions via `WebFetch`, visual fidelity (overlay, spacing, contrast, photo shape, card affordances) via a Preview screenshot or browser. **URL fidelity counts too:** when the block lands on a page, that page's slug must mirror the source's folder URL exactly (e.g. `about-us/board-leadership`, not a flattened `board-leadership`). The export is the source of truth; live is **reference only** — capture differences as consistency notes, never a silent override. Method + a worked illustration in [references/live-cross-check.md](references/live-cross-check.md).

7. **Run the design gates (advisory / HITL).** On the rendered output, optionally run the three `design:` skills and fold their findings into the consistency notes. Degrade gracefully if the plugin is absent.
   - **`design:design-critique`** — usability / hierarchy / consistency.
   - **`design:design-system`** — token + variant conformance; catches hardcoded values and near-duplicate variants that should collapse into one block.
   - **`design:accessibility-review`** — WCAG; gates the repo's mandated **AAA** text pairs.
   See [references/design-gates.md](references/design-gates.md).

8. **Emit consistency notes & verify.** Produce a short **Consistency notes** list (format in [references/design-gates.md](references/design-gates.md#consistency-notes)) — each item: what drifts from the catalog/source/live, and the recommendation to conform. **Surface, never auto-apply.** Confirm the block renders in `/design-system/blocks/block.<slug>` (both themes, every variant) and on its real page **at the source's URL path**. Nested page URLs are supported: the front-end `[...slug]` catch-all matches a page's full slug, and the Pages `slugField` is configured to preserve `/`, so a page slug like `about-us/board-leadership` serves at that exact path. Seed placement pages idempotently (match by slug, upsert) rather than via the destructive admin "seed database" button — see `scripts/seed-about-pages.ts`.

## Worked examples (canonical, already in the tree)

These prove the two halves of the path; read them as reference implementations.

- **Opening tracer — HighImpact gradient overlay** ([src/heros/HighImpact/index.tsx](../../../src/heros/HighImpact/index.tsx)). The source adds a navy scrim over the hero image (`migration/_extracted/index.html` `.image-overlay-layer`). Ported as a **token-mapped** navy gradient (no inlined source hex), driven by a new `overlay` select field (`none` / `navy-gradient`), alpha tuned so white hero text passes **AAA**. Minimal surface; exercises the `design-system` (token mapping) + `accessibility-review` (AAA) gates. Touches `RenderHero`, not `RenderBlocks`.
- **Primary — new-block port** ([src/blocks/FAQ](../../../src/blocks/FAQ), [src/blocks/CardGrid](../../../src/blocks/CardGrid)). A real catalog entry with variants ported to a native block, registered in both registries + the showroom, rendered on a public route. Proves the full **port → register → render** path. FAQ also shows rebuilding a Webflow IX2 toggle as native `<details>`.

## Quick checklist

- [ ] Catalog entry is **port**-classified; intent confirmed; no near-duplicate of an existing block/variant.
- [ ] Source traced in `migration/_extracted/`; assets copied into tracked `public/`.
- [ ] `config.ts` + `Component.tsx` (+ `gallery.ts`); variants as fields/`variant`; tokens only.
- [ ] Registered in `index.ts` + `blockComponents.ts` + `gallery.ts`.
- [ ] `generate:types` clean; `tsc --noEmit` 0 errors; importmap/types churn reverted.
- [ ] Live cross-check done; design gates run (or noted absent).
- [ ] **Consistency notes** emitted (drift → recommendation, HITL).
- [ ] Renders in the showroom (both themes, all variants) and on its page **at the source's exact URL path** (nested slugs supported).

## Reference files

- [references/block-anatomy.md](references/block-anatomy.md) — file layout, the two-registry split + exact registration steps, the server→client interactive pattern, `gallery.ts` shape, generate commands, the schema-drift gotcha.
- [references/design-gates.md](references/design-gates.md) — the three `design:` skills (when/how to run, graceful degradation), the AAA text-pair rule, and the consistency-notes output format.
- [references/live-cross-check.md](references/live-cross-check.md) — the WebFetch + Preview/screenshot method, the source-vs-reference rule, and a worked illustration.
