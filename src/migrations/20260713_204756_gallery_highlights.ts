import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "pages_blocks_gallery_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" jsonb,
  	"limit" numeric DEFAULT 6,
  	"anchor_id" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_gallery_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"body" jsonb,
  	"limit" numeric DEFAULT 6,
  	"anchor_id" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "posts" ADD COLUMN "gallery_cover_id" integer;
  ALTER TABLE "posts" ADD COLUMN "gallery_updated_at" timestamp(3) with time zone;
  ALTER TABLE "_posts_v" ADD COLUMN "version_gallery_cover_id" integer;
  ALTER TABLE "_posts_v" ADD COLUMN "version_gallery_updated_at" timestamp(3) with time zone;
  ALTER TABLE "pages_blocks_gallery_highlights" ADD CONSTRAINT "pages_blocks_gallery_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_gallery_highlights" ADD CONSTRAINT "_pages_v_blocks_gallery_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_gallery_highlights_order_idx" ON "pages_blocks_gallery_highlights" USING btree ("_order");
  CREATE INDEX "pages_blocks_gallery_highlights_parent_id_idx" ON "pages_blocks_gallery_highlights" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_gallery_highlights_path_idx" ON "pages_blocks_gallery_highlights" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_gallery_highlights_order_idx" ON "_pages_v_blocks_gallery_highlights" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_gallery_highlights_parent_id_idx" ON "_pages_v_blocks_gallery_highlights" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_gallery_highlights_path_idx" ON "_pages_v_blocks_gallery_highlights" USING btree ("_path");
  ALTER TABLE "posts" ADD CONSTRAINT "posts_gallery_cover_id_media_id_fk" FOREIGN KEY ("gallery_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_posts_v" ADD CONSTRAINT "_posts_v_version_gallery_cover_id_media_id_fk" FOREIGN KEY ("version_gallery_cover_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "posts_gallery_cover_idx" ON "posts" USING btree ("gallery_cover_id");
  CREATE INDEX "_posts_v_version_version_gallery_cover_idx" ON "_posts_v" USING btree ("version_gallery_cover_id");`)

  // Backfill gallery_updated_at for existing posts so the Featured Galleries block
  // has a sensible initial order (the beforeChange hook maintains it afterward).
  // Rule: a gallery whose newest photo was uploaded AFTER the bulk-import day gets
  // that real upload time; everything from the bulk import falls back to the
  // publish date (its upload time is a bulk-import artifact, not real activity).
  // The "import day" is derived from the data (dominant gallery-upload day), so it
  // is correct per environment. On a clean DB (CI) there is no gallery media, so
  // this updates zero rows.
  await db.execute(sql`
    WITH import_day AS (
      SELECT date_trunc('day', m.created_at) AS d
      FROM posts_rels r JOIN media m ON m.id = r.media_id
      WHERE r.path = 'gallery' AND r.media_id IS NOT NULL
      GROUP BY 1 ORDER BY count(*) DESC LIMIT 1
    ),
    gal AS (
      SELECT r.parent_id AS post_id, MAX(m.created_at) AS max_created
      FROM posts_rels r JOIN media m ON m.id = r.media_id
      WHERE r.path = 'gallery' AND r.media_id IS NOT NULL
      GROUP BY r.parent_id
    )
    UPDATE posts p
    SET gallery_updated_at = CASE
      WHEN gal.max_created >= (SELECT d FROM import_day) + interval '1 day' THEN gal.max_created
      ELSE COALESCE(p.published_at, gal.max_created)
    END
    FROM gal
    WHERE p.id = gal.post_id AND p.gallery_updated_at IS NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_gallery_highlights" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_pages_v_blocks_gallery_highlights" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "pages_blocks_gallery_highlights" CASCADE;
  DROP TABLE "_pages_v_blocks_gallery_highlights" CASCADE;
  ALTER TABLE "posts" DROP CONSTRAINT "posts_gallery_cover_id_media_id_fk";
  
  ALTER TABLE "_posts_v" DROP CONSTRAINT "_posts_v_version_gallery_cover_id_media_id_fk";
  
  DROP INDEX "posts_gallery_cover_idx";
  DROP INDEX "_posts_v_version_version_gallery_cover_idx";
  ALTER TABLE "posts" DROP COLUMN "gallery_cover_id";
  ALTER TABLE "posts" DROP COLUMN "gallery_updated_at";
  ALTER TABLE "_posts_v" DROP COLUMN "version_gallery_cover_id";
  ALTER TABLE "_posts_v" DROP COLUMN "version_gallery_updated_at";`)
}
