# ADR 0002: Code and content promote on separate rails (no environment sync)

- **Status:** Accepted
- **Date:** 2026-07-04
- **Issues:** #157, #158, #159 (pipeline), #161 (refresh), #162 (backups)
- **Decision:** Code and schema flow **local to staging to prod through git**: PRs merge to the `staging` branch (auto-deploys the staging environment), get verified at `stage.mapsnational.org`, then `staging` merges to `master` (auto-deploys prod). Staging is a **mandatory stop**, not an optional rehearsal. Content and media flow the **other way**: prod is the source of truth, copied down to staging or local as one-way point-in-time snapshots. There is **no bidirectional sync** between any two environments.

## Context

The site runs on Railway: one project with the web service, managed Postgres, and a media bucket. Pages are `force-dynamic` (SSR), so content edited in the prod admin goes live with no redeploy. During go-live setup the question recurred in several forms: can local and prod stay in sync both ways, how does staging get data, how does a new page with images reach prod.

Two-way data sync between environments means the same document can be edited in two places and something must decide who wins. That is an unsolved-in-general conflict problem; live bidirectional DB sync on a CMS clobbers editors' changes or gets clobbered.

## Decision

One source of truth per kind of thing, flowing in one direction:

| Thing | Source of truth | Direction | Mechanism |
|---|---|---|---|
| Code, blocks, config | git | local to staging to prod | PR to `staging` (auto-deploys staging), verify, merge `staging` to `master` (auto-deploys prod) |
| Schema | git (committed migrations) | local to staging to prod | `payload migrate` preDeploy on both environments (`push: false`), so staging rehearses the exact prod migration |
| Content (pages, collections) | prod Postgres | prod to staging/local | `pg_dump` restore, on demand |
| Media | prod bucket | prod to staging/local | bucket sync, on demand |

Consequences of the model:

- A merge ships code and migrations only. It can never touch content or media.
- Every change reaches prod through staging first: feature branch, PR to `staging`, verify on `stage.mapsnational.org`, then merge `staging` to `master`. Direct-to-master is reserved for reverts/hotfixes via the branch-protection bypass, consciously.
- **Merge method: merge commits only, enforced repo-wide.** Squash and rebase merging are **disabled in repo settings**, so every PR — feature to `staging` and the `staging` to `master` promotion alike — lands as a real merge commit. This keeps `master`'s ancestry continuous with `staging`: the merge-base stays current and the phantom "everything is new" diff (dominated by the two ~19k-line Drizzle schema snapshots) never appears. Rationale: a squash (or rebase) promotion mints a fresh `master` commit that shares no ancestry with `staging`'s commits, so the two branches — though tree-identical right after — diverge in history and need a manual "merge master into staging to reconcile" commit to clear. It bit us twice, so the merge method is now enforced by settings rather than a per-PR choice. **This supersedes the original per-rail guidance** (feature-to-`staging` squash for tidy history): GitHub has no per-branch merge-method control, so the only way to guarantee merge-commit promotions is to disable squash/rebase repo-wide, which also makes feature merges into `staging` merge commits. The mildly noisier `staging` history is an accepted trade for an ancestry that can't drift.
- Editors work in the prod admin; their changes are live immediately (SSR) and are never overwritten by a deploy.
- Seed and import scripts (`seed:pages`, `npm run import`) are **manual bootstrap tools**, never part of the deploy pipeline. Populating a new page on prod is either authored in the prod admin (default for one-offs) or seeded by running the scripts against prod deliberately (for the reproducible assembled set).
- Refreshing staging or local with real data is a **full snapshot copy** (DB dump plus bucket sync together, since Media rows reference bucket objects; a full dump preserves document IDs so page-to-media references survive). Never re-seed to "sync": that mints new IDs.
- Because prod is the only home of post-launch content, prod needs its own backup story (#162); git does not back content up.

## Consequences

- No sync tooling is built or maintained; the refresh script (#161) is a one-way copy with a direction lock (refuses to write to prod).
- Local content goes stale by design; refresh it from prod when it matters.
- The one deploy-time risk to data is a destructive migration, which is why schema changes require committed, reviewed migrations gated in CI (#157, #158).
