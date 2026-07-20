import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Drop the two retired Posts fields (`postSummary`, `legacyItemId`) and their
// version-table twins + the legacyItemId index. postSummary was dead on the
// frontend (nothing rendered it); legacyItemId was the Webflow-import upsert key,
// no longer needed now that the one-shot import is retired. Only the `posts` /
// `_posts_v` tables are touched — the other collections keep their legacy_item_id.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX "posts_legacy_item_id_idx";
  DROP INDEX "_posts_v_version_version_legacy_item_id_idx";
  ALTER TABLE "posts" DROP COLUMN "post_summary";
  ALTER TABLE "posts" DROP COLUMN "legacy_item_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_post_summary";
  ALTER TABLE "_posts_v" DROP COLUMN "version_legacy_item_id";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "posts" ADD COLUMN "post_summary" varchar;
  ALTER TABLE "posts" ADD COLUMN "legacy_item_id" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_post_summary" varchar;
  ALTER TABLE "_posts_v" ADD COLUMN "version_legacy_item_id" varchar;
  CREATE INDEX "posts_legacy_item_id_idx" ON "posts" USING btree ("legacy_item_id");
  CREATE INDEX "_posts_v_version_version_legacy_item_id_idx" ON "_posts_v" USING btree ("version_legacy_item_id");`)
}
