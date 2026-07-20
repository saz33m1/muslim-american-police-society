import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_gallery_highlights_variant" AS ENUM('compact', 'polaroid');
  CREATE TYPE "public"."enum__pages_v_blocks_gallery_highlights_variant" AS ENUM('compact', 'polaroid');
  ALTER TABLE "pages_blocks_gallery_highlights" ADD COLUMN "variant" "enum_pages_blocks_gallery_highlights_variant" DEFAULT 'compact';
  ALTER TABLE "_pages_v_blocks_gallery_highlights" ADD COLUMN "variant" "enum__pages_v_blocks_gallery_highlights_variant" DEFAULT 'compact';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_gallery_highlights" DROP COLUMN "variant";
  ALTER TABLE "_pages_v_blocks_gallery_highlights" DROP COLUMN "variant";
  DROP TYPE "public"."enum_pages_blocks_gallery_highlights_variant";
  DROP TYPE "public"."enum__pages_v_blocks_gallery_highlights_variant";`)
}
