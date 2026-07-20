# Prod backup + restore drill

Recovery story for production content (issue #162). Prod is the source of truth:
post-launch editor changes live only in the prod Postgres and media bucket, and
the import source data (`migration/`) is gitignored with one laptop copy.

## What backs up what

| Asset | Tool | Destination | Cadence |
| --- | --- | --- | --- |
| Prod Postgres | `npm run backup:prod` → `db/prod-<UTC>.sql.gz` (+ `.sha256`) | Google Drive `…/maps-website-backup` | weekly Sun 02:00 (Task Scheduler) |
| Prod media bucket | `npm run backup:prod` → `media/` (`aws s3 sync`, incremental) | same | daily 02:00 |
| `migration/` source (Webflow export + CMS CSVs) | one-time `Compress-Archive` → `migration-source-archive.zip` (+ `.sha256`) | same Drive area | once (cold archive) |
| Railway-native Postgres backups | Railway console | Railway | **Unavailable on Hobby plan** (verified 2026-07-07: PITR + volume backups are Pro-only). Offsite `backup:prod` is the recovery path; revisit if the project moves to Pro. |

`backup:prod` (`scripts/backup-prod.mjs`) is read-only against prod — `pg_dump`
+ bucket read, never a write. It pulls all connection details live from Railway
by environment name (no committed creds), and shells out to dockerized
`postgres:18` / `amazon/aws-cli`, so no local Postgres or aws-cli is needed.

Scheduled command:

```
npm run backup:prod -- --out "C:\Users\syedw\My Drive\05_Projects\MAPS\maps-website-backup"
```

Docker Desktop must be running when the task fires (set it to launch on login).

## Restore drill (rehearsed)

Restores into a **scratch** DB + bucket — never prod, never staging.

1. **Verify the dump** is intact before trusting it:
   ```
   cd "<drive>/maps-website-backup/db"
   sha256sum -c prod-<UTC>.sql.gz.sha256      # -> OK
   ```
2. **Restore the DB** into a throwaway Postgres:
   ```
   docker run -d --name scratch-pg -e POSTGRES_PASSWORD=scratch -p 5433:5432 postgres:18
   gunzip -c prod-<UTC>.sql.gz | docker exec -i scratch-pg psql -U postgres -v ON_ERROR_STOP=1
   ```
3. **Restore media** into a scratch bucket (any S3 target — a local MinIO works):
   ```
   aws --endpoint-url <scratch-endpoint> s3 sync "<drive>/maps-website-backup/media" s3://scratch-bucket
   ```
4. **Confirm references resolve.** Point a local app at the scratch DB
   (`DATABASE_URL=postgres://postgres:scratch@localhost:5433/postgres`) and the
   scratch bucket (`S3_*`), then load a page with images and hit a
   `/api/media/file/*` URL. Media rows reference objects by **id**; a full dump
   preserves ids, so page → media links stay intact. If images 404, the media
   mirror is incomplete — re-run `backup:prod` and re-sync.
5. **Tear down:** `docker rm -f scratch-pg` and drop the scratch bucket.

## Result of last drill (2026-07-07)

Restored the Drive backup into a throwaway `postgres:18` (`:5433`) + `minio/minio`
(`:9100`) — no prod, no staging touched.

- Dump checksum verified (`sha256sum -c`): **OK**
- DB loaded clean into scratch Postgres: **35 pages, 79 posts, 854 media, 1 user**
- Media objects synced into scratch bucket: **5863**
- Referential integrity: every filename referenced by `media` (main + all 8 size
  variants) has a matching object — **0 missing of 5863**
- Fetchability: HEAD on sampled objects returned real byte counts, incl. the
  `-800x600` card and `-1200x630` og variants (the historical resized-variant
  404 case): **all resolve**

Backup is restorable end-to-end. Re-run this section's checks after any change to
`backup-prod.mjs` or the media schema.

## Notes / gotchas

- Restore media as a **folder**, not a zip: `s3 sync` reads a directory straight
  into a bucket, and both the sync and Drive stay incremental (only changed
  objects move). Zipping would re-archive + re-upload everything each run.
- The dump carries prod users; log into any restored env with your prod
  credentials (sessions stay isolated — JWTs are signed per-env).
- A full prod dump may carry a `dev` row in `payload_migrations` and prod
  form-submission PII. Those only matter when restoring into a **deployable**
  env (see `refresh-staging.mjs`, which strips both); a scratch drill can ignore
  them.
