# Handoff: building your site from this template

You've forked a working Next.js + Payload CMS website. This doc is the
orientation: what you inherited, how to run it, how it deploys, and what will
bite you. For the step-by-step rebrand, go to
[`new-site-checklist.md`](./new-site-checklist.md) — this doc doesn't repeat it.

## What you've got

One Next.js app serves **both** the public website and the CMS admin + API,
split by route group under `src/app/`:

- `(frontend)` — the public site
- `(payload)` — the admin UI at `/admin` and the REST/GraphQL API

Plus: a component library of ~25 content blocks, a token-driven theme with
light/dark support, an internal design-system showroom, membership auth
(Outseta), SEO/sitemap/search/redirects/forms wired up, CI, and a
two-environment Railway deploy.

**What is NOT in the repo**, so don't go looking:

- **No content.** The previous org's pages, posts, team, and media do not come
  with the fork. You start with an empty database.
- **No `migration/` folder.** It's gitignored — it held the old site's Webflow
  export. Anything referencing it won't work; that's expected, and the
  checklist tells you to delete the import pipeline.
- **No secrets.** You create your own `.env` (see `.env.example`).

## Day one: run it locally

**Prerequisites, in order of how badly they'll hurt if you skip them:**

1. **Node 22.** Not 24. `.nvmrc` pins it. Node 24 crashes the Payload
   migrate CLI (a `tsx` bug), which you'll need on day two. The dev server
   itself tolerates 24; the tooling doesn't.
2. **Docker Desktop** — runs MinIO, the local S3-compatible media store.
   `npm run dev` auto-starts it for you (a `predev` hook boots Docker Desktop
   if it's closed, then brings the container up), so you rarely touch it
   directly. If images 404, check `docker ps` before debugging app code.
3. **PostgreSQL**, local instance.
4. **Port 3000 specifically.** CORS and `NEXT_PUBLIC_SERVER_URL` assume it.

This repo assumes a **Windows** dev environment (the `predev` Docker hook is a
PowerShell script). A Git Bash shell is available if you want POSIX syntax.

```bash
cp .env.example .env      # then fill DATABASE_URL, PAYLOAD_SECRET, S3_* (MinIO block)
npm install               # npm, not pnpm — see gotchas
npm run dev               # http://localhost:3000
npm run ensure:admin      # creates a local admin login
```

Then open `/admin` and log in. In development the DB schema auto-syncs — no
migrations needed locally.

## How the site actually works

**Pages are built from blocks.** A page in the admin is an ordered list of
blocks (hero, content, gallery, FAQ, CTA…). Each block colocates its CMS field
schema (`config.ts`) with its React component (`Component.tsx`) under
`src/blocks/`.

To add a block you touch **two registries** — this trips everyone up once:

- `src/blocks/index.ts` — field configs only. **Never import React here.**
  It's pulled into the Payload config graph; a client import breaks type
  generation.
- `src/blocks/blockComponents.ts` — maps block slug → React component.

Then run `npm run generate:types`. Browse every block with sample data at
`/design-system/blocks`, and the theme tokens at `/design-system`.

**Who edits what — the non-obvious split:**

| Thing | Where it lives | Editable in admin? |
|---|---|---|
| Page content | Pages collection (blocks) | Yes |
| Header nav | `header` global | Yes |
| Footer links, social, tagline | `src/utilities/brand.ts` | **No — it's code** |
| Colors, fonts | `tokens.css` / `layout.tsx` | No |

The footer is deliberately code, not CMS. If your org wants editors to control
footer links, that's a change you'd need to make.

**Brand config is centralized.** Site name, description, social URLs, footer
columns, CTAs, logo alt/dimensions, OG image path, email-from — all in
`src/utilities/brand.ts`. Keep it plain data; no React imports.

## Content: seeded vs authored

`npm run seed:pages` builds pages from code (`scripts/seed-pages.ts`). It's
idempotent — safe to re-run. `npm run seed:header` populates the nav, and only
fills an *empty* nav global, so it won't clobber admin edits.

Decide early: **code-seeded or admin-authored?** Seeding is reproducible and
good for a fresh environment; admin-authoring is what editors expect. Most
teams seed the initial structure, then hand the admin to editors and stop
re-seeding. Re-running `seed:pages` after editors start working is fine (it's
idempotent) but it won't reflect their changes back into code.

## Deploying

Two Railway environments, each with its own web service, Postgres, and media
bucket, with **independent credentials** (staging cannot touch prod data).

Branch flow, enforced by CI:

```
feature branch → PR into `staging` → merge → deploys staging
staging        → PR into `master`  → merge → deploys production
```

**Never PR a feature branch straight into `master`** — that skips the staging
rehearsal and deploys to prod. CI fails it anyway.

**Schema changes need a committed migration.** Production runs with
auto-sync *off*, so any collection/field/block change that alters the database
must ship a migration:

```bash
npm run payload -- migrate:create <name>   # under Node 22
```

A CI job ("migration guard") fails if your config drifts from the committed
migrations. Local dev auto-syncs and hides this — the guard is what catches it.

**Green CI is the only merge gate.** Three jobs: lint/build/integration tests,
the migration guard, and end-to-end tests.

## Things that will bite you

- **npm, not pnpm.** `engines` asks for pnpm but the repo is installed with npm
  (`package-lock.json`). The `test`, `dev:prod`, and `reinstall` scripts
  hardcode pnpm and POSIX `rm -rf` — they don't work as-is. Run the underlying
  commands directly.
- **Run `generate:types` after any CMS schema change**, or TypeScript will lie
  to you.
- **Switching branches that each add blocks can hang the dev server.** Two
  branches adding different tables leaves the schema tool unable to tell a
  create from a rename, so it prompts interactively — and a headless dev server
  has no way to answer, so it hangs holding the database. Symptom: every
  DB-backed page stalls while static pages stay fast. Merge block work promptly
  to avoid it.
- **Media scripts must flush before exiting.** Any script creating media has to
  `await payload.destroy()` before `process.exit()`, or uploads are killed
  mid-flight and you get database rows pointing at files that don't exist.
- **Never reuse a `context` object across media uploads.** The storage plugin
  stashes the first file and silently drops the rest. Build a fresh object per
  upload.
- **The ops scripts are destructive by design.** `refresh-staging` /
  `refresh-local` wipe their target and restore a snapshot. They have direction
  locks so they can never write to production — but read
  [`scripts.md`](./scripts.md) before running any of them, and never import
  them to "test" (they execute on import).

## Where to look next

| Doc | What's in it |
|---|---|
| [`new-site-checklist.md`](./new-site-checklist.md) | **Start here** — the rebrand steps |
| [`scripts.md`](./scripts.md) | Every script: what it does, run order, what's destructive |
| `CLAUDE.md` (repo root) | Deep architecture notes + gotchas (written for AI agents, but accurate and the most detailed thing here) |
| [`adr/`](./adr/) | Why the big decisions were made |
| [`brand-audit-2026-07-16.md`](./brand-audit-2026-07-16.md) | Historical record of where brand strings used to be hardcoded |
| `README.md` | Upstream Payload Website Template reference — how the underlying template's features work (draft preview, live preview, access control, revalidation). Generic, not about this project specifically. |

## Known deliberate limits

Called out so you don't read them as bugs:

- Footer nav/social are code, not CMS (above).
- The design-system showroom still contains the previous org's sample copy and
  photos. It's internal and noindexed, so it's cosmetic — clean it when you
  care, not before.
- `docker-compose.yml` names the container/volume after the old repo. Cosmetic,
  but **renaming the volume can strand your local media data** — leave it
  unless you have a reason.
- Membership (Outseta) is wired into ~7 files. It's an architecture, not a
  toggle: keep it and point it at your tenant, or remove it wholesale per the
  checklist. Don't leave it half-configured.
