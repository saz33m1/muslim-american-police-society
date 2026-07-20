# Block anatomy & registration

How a native block is laid out in this repo, why the registry is split in two, and the exact steps to register one. Mirrors the **Layout builder** section of `CLAUDE.md`; this is the operational detail.

## File layout

Each block colocates its pieces under `src/blocks/<Name>/`:

```
src/blocks/FAQ/
├── config.ts        # Payload field schema (server-only — no React imports)
├── Component.tsx     # React render (server component; may render a client child)
└── gallery.ts        # sample-data entry for the /design-system/blocks showroom
```

- **`config.ts`** exports a `Block` (`slug`, `interfaceName`, `fields`). The `slug` string lives here and nowhere else — both registries key off it. `interfaceName` names the generated TS type (e.g. `FAQBlock`).
- **`Component.tsx`** is a React server component whose props are the generated block type from `@/payload-types`. Resolve uploads/relationships to plain values here.
- **`gallery.ts`** exports a `GalleryBlock<Props>` (type defined in `src/blocks/gallery-types.ts`; the aggregator `src/blocks/gallery.ts` widens the registry array to `GalleryBlock<any>`) — `slug` (matches `config.slug`), `title`, `category`, `description`, and an ordered list of `variants`, each a labeled set of props shaped like the block's generated props. Sample media + rich-text helpers live in `src/blocks/gallery-helpers.ts`; reuse them.

## Why the registry is split in two

Two modules, separate **on purpose**:

- `src/blocks/index.ts` → `layoutBlocks` (field **configs** only). Collections consume this for their `layout`/`blocks` field. It must **never** import a React component — doing so pulls client-only deps (`next/image`, `@payloadcms/ui`) into the Payload config graph and **breaks `npm run generate:types`**.
- `src/blocks/blockComponents.ts` → `blockComponents` (`config.slug → React component`). `RenderBlocks` reads this map. There is **no hand-edited switch** — registering the component here is what makes it render.

So a config-side import of a server `Component.tsx` is forbidden; the slug bridges the two sides.

## Registering a block

Four edits, then regenerate. To add `src/blocks/FAQ`:

1. **`src/blocks/index.ts`** — import the config, add it to the `layoutBlocks` array:
   ```ts
   import { FAQ } from './FAQ/config'
   export const layoutBlocks: Block[] = [ /* … */ FAQ ]
   ```
2. **`src/blocks/blockComponents.ts`** — import the config (for its slug) and the component, add the map entry:
   ```ts
   import { FAQ } from './FAQ/config'
   import { FAQBlock } from './FAQ/Component'
   export const blockComponents = { /* … */ [FAQ.slug]: FAQBlock }
   ```
3. **`src/blocks/gallery.ts`** — import and list the gallery entry (order = display order):
   ```ts
   import { faqGallery } from './FAQ/gallery'
   export const galleryBlocks = [ /* … */ faqGallery ]
   ```
4. Run `npm run generate:types`.

A block registered in `blockComponents` but missing a `gallery.ts` still appears in the showroom as a "no example yet" stub — the route derives its section list from the render registry, so a newly-registered block never silently disappears.

## The server → client interactive pattern

The config graph must stay server-only, so a block that needs client interactivity (state, listeners, a modal/lightbox, filter tabs) keeps the split **inside** the block:

- `Component.tsx` (server, may be `async`) resolves data — `getMediaUrl(upload.url, upload.updatedAt)` for images, `payload.find(...)` for collection queries, rich text pre-rendered to a node — into plain, serializable descriptors.
- A sibling `*Client.tsx` marked `'use client'` receives those descriptors and owns the interactivity.

Reference implementation: `src/blocks/MediaGallery` (grid/slider + focus-managed lightbox); the team-grid block (filter tabs + bio modal, lands with the Team collection) is a second example of the same split. Two patterns worth copying:
- **Hoist repeated child components to module scope** (not nested in the parent) so their identity is stable across re-renders — otherwise every open/close remounts the children and detaches the element captured for focus restoration.
- **Restore focus in an effect** (after the dialog unmounts), not in the close handler, or the browser resets focus to `<body>`.

## Generate commands

- `npm run generate:types` — after **any** config/field/block/collection change. Regenerates `src/payload-types.ts`.
- `npm run generate:importmap` — only changes when a block adds a custom **admin** component. For plain field/render blocks it reports "No new imports". It (and `payload-types.ts`) frequently show **CRLF-only** diffs — revert those with `git checkout --` before committing.
- `npx tsc --noEmit` — the real correctness gate (0 errors). `npm run lint` can fail with an unrelated eslintrc config error in some setups; if it does, rely on `npx tsc --noEmit` as the gate rather than skipping the check.

## Schema drift {#schema-drift}

The Postgres adapter runs with `push: true` in dev (schema auto-syncs). With one shared dev DB, switching between feature branches that each add fields/blocks accumulates columns/tables the current branch doesn't define. When a new block introduces a table while an old branch's table is now orphaned — **or you rename a field/table within a branch** — drizzle-kit can't tell *create* from *rename* and **prompts interactively** ("Is X created or renamed from another table?", or a data-loss y/N). The headless dev server has no TTY to answer, so it **hangs holding the DB**: DB-backed routes (`/`, `/api/*`) stall for tens of seconds while DB-free routes (the showroom) stay fast. That symptom = a schema-push prompt, not slow rendering.

Avoid it: keep `master ⊇ the dev DB schema by **merging block PRs promptly** (one block per branch, merged before the next). If you hit it mid-branch after renaming a field (e.g. a `select` → a `relationship`), the superseded **empty** tables are the ambiguity source — stop the dev server, drop those empty tables (with the user's OK — dropping tables needs explicit authorization), and restart for a clean non-interactive push.
