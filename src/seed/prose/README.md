# Migrated prose-page seed data (issue #76)

Seed-ready artifacts produced by `npm run import:prose` (`scripts/import-prose.ts`)
from the gitignored Webflow export. **This is Phase 5 output, not assembled
pages** — a Phase 6 page slice consumes these to bind prose + images onto Pages.

## What's here

- `<slug>.json` — one per prose page: `{ slug, title, richText, images, blocks }`
  - `richText` — the page's block-level editorial prose (headings, paragraphs,
    lists, blockquotes) as Payload Lexical, ready to drop into a Pages hero or a
    rich-text block. Structured components (accordions, card grids, forms, maps)
    are deliberately excluded — Phase 6 assembles those as blocks.
  - `images` — `{ src, filename, id }` for every content image, re-hosted as
    Media (served from the configured storage backend, not a Webflow CDN URL).
    Bind by `filename` (stable) or `id`.
  - `blocks` — structured sections captured as ready-to-place Payload blocks
    (currently the page timeline → a `timeline` block: `{ blockType, header,
    items }`). Phase 6 drops these into the page layout alongside the prose.
- `index.json` — manifest of all pages.

## Deliberately excluded

- **Structured components** (FAQ/resource accordions, card grids, pricing tiers,
  contact/location grids, contact forms, map widgets, blog lists) — Phase 6
  assembles these as their own blocks. Their images are still re-hosted.
- **Section eyebrows/kickers** (`.text-style-tagline`, e.g. "Connect", "Support
  MAPS") — these are hero/section labels, not body prose; Phase 6 places them as
  eyebrow fields on the relevant hero/section, where they render correctly
  (pulling them into the rich-text blob would dump them as stray paragraphs).

## Regenerating

`npm run import:prose` is idempotent: Media dedupe by filename, artifacts
regenerated deterministically. Originals are copied into `public/import/prose/`
(tracked) so a clean checkout can re-host without the gitignored export. To add
a page, append a `ProsePage` (with its content `root` + `exclude` selectors) to
`PAGES` in `scripts/import-prose.ts`.
