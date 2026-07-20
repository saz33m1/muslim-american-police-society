# Webflow + Relume to OSS Migration Runbook

A followable, offline pipeline for moving a Webflow CMS + Relume site to a self-hosted, open-source stack with no-code content editing.

This document reflects the current state of decisions. Update the "Decision log" as choices change.

---

## Goal

Replace Webflow CMS + Relume while meeting four criteria:

1. No-code content editing for content managers.
2. Automated migration of the design system that Relume produced.
3. Minimal vendor lock-in.
4. Automated migration of page layouts, content, and media from Webflow.

---

## Target stack

| Layer | Choice | Notes |
|---|---|---|
| Framework / rendering | Next.js (App Router) | Installed: Next 16.2.6 (Turbopack). |
| CMS + admin + media | Payload (MIT, self-hosted) | Installed: 3.85.1 with `@payloadcms/next` 3.85.1. Owns content in your own Postgres. |
| Page composition + no-code editing | Payload native block builder | Blocks under `src/blocks/` rendered by `RenderBlocks` via the `Pages.layout` field. Form-based block editor in the Payload admin with Live Preview. No Puck. |
| Rich text | Lexical (native to Payload) | Single editor. Puck was rejected partly because it pulls in TipTap as a second rich-text editor. |
| Storage | S3-compatible (Cloudflare R2 or MinIO) | Self-hostable, portable media. |
| UI base | Tailwind + CSS-variable tokens | Installed: Tailwind 4.1.18. Smallest possible library footprint. |
| App UI atoms (optional) | shadcn/ui primitives | Only where you need dialogs, dropdowns, menus, etc. |
| Migration engine | Claude Code + a Skill + CLAUDE.md | The repeatable workhorse. CLAUDE.md already has a "Layout builder" section. |
| Design capture (optional) | Claude Design | One-time token capture and net-new sections only. |

Everything in the runtime is open source and self-hostable. No vendor you cannot walk away from.

---

## Decision log

### Locked
- Drop Webflow AND Relume. Do not adopt Relume's npm packages; that only swaps one lock-in for another.
- The Relume/Client-First design system is already baked into the Webflow export as CSS custom properties. Extract once, then never depend on Relume again.
- UI base is Tailwind + CSS-variable tokens (minimal library). The library is the small decision.
- Dropped Puck. Standardized on Payload's native block builder (ADR 0001, 2026-06-22). Page composition is blocks under `src/blocks/` rendered by `RenderBlocks` via `Pages.layout`. Reasons: native blocks already ship and integrate (admin, Lexical, SEO, Live Preview), zero new dependencies, avoids a second rich-text editor (TipTap) and a `cloud-client` dependency, and avoids reworking page rendering. Tradeoff accepted: editors use a form-based block UI, not a drag-drop canvas, and layouts are not a standalone portable JSON spec.
- Claude Code is the migration engine, not Claude Design. Repeatability comes from a Skill plus CLAUDE.md.
- Strip all Claude attribution from code, commits, PRs, issues, and docs.

### Still open
- DaisyUI vs pure Tailwind for theming ergonomics (both fine; see below).
- Whether any sections justify a licensed block source (Tailwind Plus) vs hand-built.
- Final hosting target for the Next front end (any host works).

---

## How criterion 1 is met (no-code editing)

Content managers compose pages in the Payload admin by adding and ordering blocks in the `Pages.layout` field, with Live Preview. This is form-based block editing, not a free drag-drop canvas. If a true non-technical drag-drop requirement emerges later, revisit per ADR 0001.

---

## UI library decision (criteria 2 and 3)

Given the lock-in goal, use as little library as possible. The lowest-lock-in, most-repeatable target is plain Tailwind sections themed entirely by CSS variables, with no component-library runtime at all.

Options, in order of preference:

1. Pure Tailwind + CSS-variable tokens. Zero runtime library to lock into. Claude Code generates it consistently from the Skill.
2. DaisyUI (MIT). A Tailwind plugin where a theme is literally a set of CSS variables, so the extracted Relume tokens map almost 1:1. Cleanest theming ergonomics. Tradeoff: it ships app components, not marketing sections, so you still compose heroes and footers.
3. shadcn/ui primitives. Source copied into your repo, so you own it. Use only for real app UI (dialogs, dropdowns). shadcn primitives are UI atoms, not marketing sections.
4. Tailwind Plus blocks rebuilt as your own Tailwind components. The most direct port for marketing sections close to Relume's catalog. Output is just Tailwind markup (no runtime lock-in), but the source blocks are commercially licensed and cannot be open-sourced raw.

---

## Repeatability backbone

This is what makes the workflow efficient and repeatable inside the Claude ecosystem.

- CLAUDE.md holds the conventions every Claude Code run must follow, including the existing "Layout builder" section, token usage, block structure, and the attribution-stripping rule.
- A custom Skill encodes the section-port conversion contract:
  - Input: one exported Webflow section (HTML + the relevant classes).
  - Output: an owned React block under `src/blocks/` using the token theme, wired into `RenderBlocks`, following the CLAUDE.md conventions.
- Once the Skill exists, every section and every future page runs the same path with consistent output. Build the Skill with the skill-creator skill.

---

## Pipeline

### Phase 0 - Prep and exports
- [ ] Confirm you are on a Webflow Workspace plan (code export is workspace-plan only).
- [ ] Webflow Designer: open the site, press Shift+E (Export code), download the ZIP. Keep `webflow.css` and the page HTML.
- [ ] Generate a read-only Webflow Data API token: Site settings > Apps & Integrations.
- [ ] Optional: export each CMS collection as CSV (per-collection Export button) as a backup.

### Phase 1 - Design tokens (criterion 2) [in progress in payload-poc]
- Note: the Phase 1 design system is already being built in `payload-poc` on the native block foundation (Tailwind 4 + Lexical).
- [ ] Have Claude Code parse `:root` CSS custom properties out of `webflow.css` (the Relume/Client-First tokens: colors, spacing scale, typography, radius).
- [ ] Emit a `tokens.css` (or Tailwind theme) you own and wire it into the Tailwind config.
- [ ] Map tokens onto your chosen base:
  - Pure Tailwind: expose tokens as CSS variables and reference them in the Tailwind theme.
  - DaisyUI: define a theme as CSS variables from the extracted palette.
  - shadcn (if used for atoms): map onto `--primary`, `--background`, `--foreground`, `--radius`, etc.
- [ ] Optional alternative capture: feed the export into Claude Design's design-system import, then sync back to code.

### Phase 2 - Repo and stack (criterion 3)
- [ ] `payload-poc` already provides Next + Payload + native blocks at the versions above. No Puck install, no `payload-puck` plugin.
- [ ] Confirm Live Preview is configured for the `Pages` collection.
- [ ] Wire Payload to your own Postgres and S3-compatible storage.
- [ ] If using shadcn atoms or DaisyUI, add them now.

### Phase 3 - Repeatability setup
- [ ] Keep CLAUDE.md conventions current (Layout builder, tokens, block shape, no Claude attribution).
- [ ] Build the section-port Skill (input contract, output contract, one worked example).

### Phase 4 - Port sections to Payload blocks (criteria 1 and 2)
- [ ] Run the Skill with Claude Code across each exported section, producing owned React blocks.
- [ ] Implement each section as a Payload block under `src/blocks/` and wire it into `RenderBlocks`.
- [ ] Content managers then add and order these blocks via `Pages.layout`.
- [ ] For app UI (forms, menus, dialogs), use shadcn primitives directly.

### Phase 5 - Content and media migration (criterion 4)
- [ ] Have Claude Code write a script against the Webflow Data API to:
  - Pull each collection and its items (handle pagination).
  - Map Webflow fields to Payload collection fields.
  - Download every referenced asset and upload to Payload media / S3.
  - Rewrite asset URLs to your storage (drop the Webflow CDN dependency).
  - Resolve reference and multi-reference fields by ID programmatically (avoids the manual relinking that CSV import forces).
- [ ] Convert rich-text HTML into Payload's Lexical format where needed.

### Phase 6 - Page assembly
- [ ] Compose each page via the `Pages.layout` blocks field in the Payload admin, using Live Preview, selecting and ordering the ported blocks.
- [ ] Bind CMS fields from Payload collections into the blocks.

### Phase 7 - Cutover
- [ ] Reimplement the interactions and animations you actually need (Webflow's do not carry; use Framer Motion or CSS).
- [ ] Point forms at your own handler or endpoint (Webflow forms do not carry).
- [ ] Set up 301 redirects from old URLs.
- [ ] Verify content, media, SEO metadata, and responsive behavior, then ship.

### Optional - Claude Design for net-new sections
- [ ] Use Claude Design only for brand-new sections or visual exploration.
- [ ] Use design-sync to keep it aligned with your code design system.
- [ ] Pass the handoff bundle back to Claude Code to turn into Payload blocks.

---

## What does not carry over from Webflow
- Interactions and animations (driven by `webflow.js`) stop functioning on export. Reimplement the ones you need.
- Forms, file upload, reCAPTCHA, and site search do not work on exported code.
- Static code export shows empty states for CMS collection lists; the data comes via the Data API, not the export.
- Password protection is lost outside Webflow hosting.

---

## Tool roles (Claude ecosystem)
- Claude Code: the engine. Writes the token-extraction script and the Webflow Data API pull, runs the section-port Skill to produce Payload blocks, and keeps output consistent via CLAUDE.md. Deterministic and reusable.
- Skill: the section-port conversion contract that makes the port repeatable.
- Claude Design: optional. One-time design-system capture and net-new section exploration only. It is a research-preview beta that shares usage limits with chat, Cowork, and Claude Code, so it is not the per-page workhorse.

---

## Standing conventions for this repo
- No Claude attribution anywhere: not in code, commits, PRs, issues, or docs. No co-author lines, no generated-with footers.
- Keep the design system as plain CSS variables you own.
- Layouts are stored as Payload block data on `Pages.layout`, rendered by `RenderBlocks`. Content lives in your own Postgres so the stack stays portable. Layouts are not a standalone portable JSON spec; this is an accepted tradeoff per ADR 0001.
