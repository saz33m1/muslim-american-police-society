# ADR 0001 — Visual editor: Puck vs native Payload block builder

- **Status:** Accepted
- **Date:** 2026-06-22
- **Issue:** #12 (spike)
- **Decision:** Formalize the **native Payload block builder** as the canonical page-composition system. **Do not adopt Puck.**

## Context

The OSS migration runbook prescribes **Puck** (`@puckeditor/core` + `@delmaredigital/payload-puck`) as the JSON-based visual page builder. The repository instead already ships Payload's **native block builder** — 8 blocks under `src/blocks/` rendered by `RenderBlocks`, with the entire Phase 1 design system built on top of it. Both solve the same job (compose a page from reusable sections). A spike evaluated Puck hands-on before committing.

## Spike evidence (measured, not estimated)

Hands-on: installed both packages and wired `createPuckPlugin({ pagesCollection: 'puckpages' })` into the real `payload.config.ts` against a throwaway `puckpages` collection, then ran type-gen and booted the app.

**Compatibility — all peers satisfied by the current stack:**

| Peer | Required | Installed | OK |
|---|---|---|---|
| `payload` | ≥3.69 | 3.85.1 | ✓ |
| `@payloadcms/next` / `ui` | ≥3.69 | 3.85.1 | ✓ |
| `next` | ≥15.4.8 (≥16.2.6 for Turbopack CVE fix) | 16.2.6 | ✓ |
| `react` / `react-dom` | ≥19.2.1 | 19.2.6 | ✓ |
| `tailwindcss` | ≥4 | 4.1.18 | ✓ |
| `zod` | ≥3 | added in spike | ✓ |

- Package name: Puck 0.21+ moved from `@measured/puck` to `@puckeditor/core` (runbook name was correct; `@measured/puck` is the older line at 0.20.x).
- Install added **137 transitive packages** with no peer-dependency conflicts.
- `npm run generate:types` passed. Plugin auto-injects onto the target collection: `puckData` (JSON), `editorVersion: 'legacy' | 'puck'` (a hybrid/migration flag), `pageLayout`, `meta`, **and a separate `puck-templates` collection** (reusable component templates).
- DB (`push: true`) auto-synced the new `puckpages` / `puck-templates` tables on boot.
- Admin **and** frontend bundles compiled and booted clean (Next 16 + Turbopack); **zero browser console errors**. `Puckpages` and `Puck Templates` render as admin collections with their own views.
- **Vulnerabilities:** `npm audit` reports 16, but the critical/high entries are **pre-existing repo deps** (vitest dev-only; `payload`→`undici`; `plugin-redirects`) — **not** introduced by Puck. The Puck delta is additional moderate-severity transitive surface, not the headline critical.
- **Dependency weight worth noting:** the plugin hard-pulls **TipTap** (a second rich-text editor, alongside our existing **Lexical**), plus `@puckeditor/cloud-client` and `@puckeditor/plugin-ai`.

**Not exercised:** authoring a page through the drag-drop canvas and rendering that JSON on the public site. Reaching the canvas needs a saved doc; rendering needs a dedicated route (see collision below). Editor *infrastructure* (collections, views, API, types, build, boot) was confirmed; the live author→render round-trip was not.

## Key architectural finding

Puck's integration model expects to **own the pages collection** (store `puckData`) and render via a catch-all `app/(frontend)/[[...slug]]/page.tsx` using `PageRenderer`. Our repo already composes pages from `Pages.layout` (native blocks) rendered by `RenderBlocks` through existing routing. These are **two competing page-body models** for the same collection and route — adopting Puck on the real `Pages` collection means reworking page rendering, not just adding a dependency. The plugin's `editorVersion` flag and documented "hybrid integration" exist precisely to manage this overlap/migration.

## Options considered

### A. Adopt Puck (per runbook)
- **Pros:** true drag-and-drop visual canvas; portable layout JSON; mature, well-documented plugin (templates, dark mode, page-tree, AI, hybrid migration path); MIT; clean compat with our stack.
- **Cons:** +137 deps; second RTE (TipTap) duplicating Lexical; `cloud-client` / AI deps to review against the "no vendor lock-in" goal; competes with/duplicates the working native blocks; requires page-render rework; ongoing reliance on a single-maintainer community plugin (smaller bus factor).

### B. Formalize native Payload blocks — **chosen**
- **Pros:** already shipped and integrated (admin, Lexical, SEO, live-preview); Phase 1 design system built on it; zero new deps; fully OSS (Payload is MIT, self-hostable — the runbook's lock-in goal is already met); type-safe via `payload-types`; no migration.
- **Cons:** no true drag-drop/visual canvas (editors use Payload's form-based block UI); diverges from the runbook; layouts not portable as a standalone JSON spec.

## Decision

Adopt **Option B**. Native Payload blocks are already the working foundation — they satisfy the migration's actual goal (OSS, self-hostable, no vendor lock-in) without the cost of a second rich-text editor, a 137-package dependency surface, a `cloud-client` dependency, and a rewrite of page rendering. Puck's primary advantage (a drag-drop canvas) does not outweigh duplicating a system that already ships and underpins the Phase 1 design system.

## Consequences

- The Phase 2 visual-editor criterion is satisfied by the native block builder.
- Issue #13 (Puck tracer-bullet) is dropped / closed as not planned.
- New page sections are added as Payload blocks under `src/blocks/` and wired into `RenderBlocks` (see CLAUDE.md "Layout builder").
- Runbook deviation: this project standardizes on Payload native blocks rather than Puck. Revisit only if a true non-technical drag-drop editing requirement emerges.

## Spike record

Evaluated on branch `spike/puck-eval-12` (now deleted). Puck packages and the throwaway `puckpages` collection were removed; no Puck code remains in the tree.
