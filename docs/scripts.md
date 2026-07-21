# Scripts reference

Every script under `scripts/`. Run all from the repo
root. "Idempotent" = safe to re-run; "Destructive" = drops/overwrites data.

Media-creating scripts flush S3 before exit and build a fresh `context` per
file-carrying `payload.create` — see the CLAUDE.md "Media storage" traps before
editing any of them.

## Content pipeline (fresh-DB seed order)

Run in this order into an empty DB: **migrate → `seed:pages` → `seed:header`.**

The Webflow CSV import pipeline (`src/import/`, `import:prose`, `import:slider`,
`rehost:images`) was removed with the fork — this site has no legacy export to
migrate. Content is either seeded from code or authored in the admin.

| Command | Script | What | Notes |
|---|---|---|---|
| `npm run seed:pages` | `seed-pages.ts` | Assemble every registered Page (home, about-us, programs, join, donate, contact, members) plus two sample posts. `ensureTrackedMedia` first creates any missing images from `public/import/prose`. | Idempotent (upsert by slug). Page bodies are **placeholder copy** — replace them. |
| `npm run seed:header` | `seed-header.ts` | Populate the `header` nav global from `src/Header/seedNav.ts`. | Idempotent; only fills an **empty** nav, never clobbers admin edits. |

## Environment sync (Railway)

All are Node scripts (not bash: `npm run` on Windows resolves `bash` to WSL where the `railway` shim dies). All need Docker (`postgres:18` + `amazon/aws-cli` in throwaway containers) and a logged-in `railway`. See CLAUDE.md "Deployment" and ADR 0002.

| Command | Script | Direction | What |
|---|---|---|---|
| `npm run refresh:staging [-- --yes]` | `refresh-staging.mjs` | prod → staging | Mirror prod bucket → staging bucket and restore a full `pg_dump` of prod into staging. Direction-locked; prod is read-only. Then rebuilds staging's search index over HTTP using staging's **deployed** code (`/api/search/reindex`; `/api` is ungated). Best-effort: set `STAGING_ADMIN_EMAIL`/`STAGING_ADMIN_PASSWORD` (your prod login) to auto-run, else click Reindex in admin. |
| `npm run refresh:local [-- --yes]` | `refresh-local.mjs` | prod → local | Mirror prod bucket → local MinIO bucket and restore a full `pg_dump` of prod into the local dev DB. Prod comes from Railway; the local target from `.env` (`DATABASE_URL` + `S3_*`). Direction-locked to a **loopback** target (refuses prod/staging); prod is read-only. Keeps the `form_submissions` PII scrub. Containers reach host Postgres/MinIO via `host.docker.internal` (Docker Desktop). Destructive to local. Then rebuilds the local search index (`reindex:search`, best-effort). |
| `npm run refresh:staging:check` / `refresh:local:check` | `refresh-lock.check.mjs` | — | No-infra self-check of both direction locks and the PII scrubs (same file). |
| `npm run backup:prod [-- --out <dir>]` | `backup-prod.mjs` | prod → local/offsite | Read-only offsite backup of prod: gzipped full `pg_dump` (+ `.sha256`) into `<out>/db/` and an incremental `s3 sync` of the media bucket into `<out>/media/`. Creds pulled live from Railway. Point `--out` at a synced cloud folder. Default out `./backups` (gitignored). Restore drill: `docs/restore-drill.md`. |
| `npm run ensure:admin` | `ensure-admin.ts` | env (via `DATABASE_URL`) | Ensure a Payload admin `User` from `ADMIN_EMAIL`/`ADMIN_PASSWORD`: match by email, create when absent, reset password when present. No S3 writes, so safe against a remote env. Point `DATABASE_URL` at the target. Idempotent. |
| `npm run reindex:search` | `reindex-search.ts` | env (via `DATABASE_URL`) | Rebuild the search index for every published page + post so search reflects the **current** code's indexing. Calls the search plugin's own `/reindex` endpoint handler in-process (the same code the admin Reindex button runs): re-syncs each doc without re-validating the source and clears orphans. In-process (uses this repo's code); only point at an env that runs this same code, else use the deployed app's Reindex button. Touches no S3. Idempotent. Run after `refresh:local` (which now calls it) or a `beforeSync` change. |

## One-off maintenance

Run directly with tsx (no npm script). Each skips work already done.

| Script | What | Safety |
|---|---|---|
| `node --import tsx/esm scripts/set-focal.ts` | Bias CardGrid card focal points toward the top (heads stay in the object-cover crop). Skips images already moved off-centre. | Idempotent. |
| `npx tsx scripts/trim-logo-padding.ts` | `sharp.trim()` baked-in padding off partner logos so object-contain scales the real artwork consistently. | Idempotent. |
| `node --import tsx/esm scripts/purge-junk-pages.ts` | Drop `E2E CRUD*` test pages and empty autosave-orphan drafts from the shared dev DB. | Idempotent. Dev DB only. |
| `node --import tsx/esm scripts/wipe-media.ts` | **Delete every Media doc + versions.** For a storage-backend switch (disk ↔ S3); re-seed pages afterward. | **Destructive.** |
| `node scripts/make-og.mjs` | Regenerate `public/og.webp` (1200×630 share cover): navy brand surface + the white lockup (`logo-primary-dark.svg`) + a gold rule, rasterized via `sharp`. Rerun after a logo or brand-navy change. | Idempotent (overwrites `og.webp`). |

## Infra

| Script | What |
|---|---|
| `scripts/ensure-docker.ps1` | `predev` hook: best-effort boot Docker Desktop + `docker compose up -d` (MinIO). Always exits 0. |
