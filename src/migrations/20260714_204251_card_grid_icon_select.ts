import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // `lucide_icon` was free text, so a row can hold a name the renderer never drew (that
  // was the bug: a silently empty chip). The `USING ...::enum` cast below THROWS on any
  // such row, which would fail the migration and BLOCK THE DEPLOY — so null the unknown
  // ones first.
  //
  // Every name actually in use on prod is in the enum (audited across all 35 published
  // pages via the API: badge-dollar-sign, briefcase, circle-plus, file-text, folder-open,
  // landmark, megaphone, mic, network, scale, star-plus, users, video) — including
  // `star-plus`, which 0.563 has no icon for and which we now ship vendored, so no prod
  // value is rewritten or lost. This guard exists for drafts and any other environment
  // that might still hold a stray name: nulling it changes nothing visible, since it
  // renders no icon today either.
  await db.execute(sql`
   UPDATE "pages_blocks_card_grid_items" SET "lucide_icon" = NULL
    WHERE "lucide_icon" IS NOT NULL
      AND "lucide_icon" NOT IN ('badge-dollar-sign', 'badge-plus', 'briefcase', 'circle-plus', 'file-text', 'folder-open', 'landmark', 'megaphone', 'mic', 'network', 'scale', 'star', 'star-plus', 'users', 'video');
  UPDATE "_pages_v_blocks_card_grid_items" SET "lucide_icon" = NULL
    WHERE "lucide_icon" IS NOT NULL
      AND "lucide_icon" NOT IN ('badge-dollar-sign', 'badge-plus', 'briefcase', 'circle-plus', 'file-text', 'folder-open', 'landmark', 'megaphone', 'mic', 'network', 'scale', 'star', 'star-plus', 'users', 'video');`)

  await db.execute(sql`
   CREATE TYPE "public"."enum_pages_blocks_card_grid_items_lucide_icon" AS ENUM('badge-dollar-sign', 'badge-plus', 'briefcase', 'circle-plus', 'file-text', 'folder-open', 'landmark', 'megaphone', 'mic', 'network', 'scale', 'star', 'star-plus', 'users', 'video');
  CREATE TYPE "public"."enum__pages_v_blocks_card_grid_items_lucide_icon" AS ENUM('badge-dollar-sign', 'badge-plus', 'briefcase', 'circle-plus', 'file-text', 'folder-open', 'landmark', 'megaphone', 'mic', 'network', 'scale', 'star', 'star-plus', 'users', 'video');
  ALTER TABLE "pages_blocks_card_grid_items" ALTER COLUMN "lucide_icon" SET DATA TYPE "public"."enum_pages_blocks_card_grid_items_lucide_icon" USING "lucide_icon"::"public"."enum_pages_blocks_card_grid_items_lucide_icon";
  ALTER TABLE "_pages_v_blocks_card_grid_items" ALTER COLUMN "lucide_icon" SET DATA TYPE "public"."enum__pages_v_blocks_card_grid_items_lucide_icon" USING "lucide_icon"::"public"."enum__pages_v_blocks_card_grid_items_lucide_icon";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "pages_blocks_card_grid_items" ALTER COLUMN "lucide_icon" SET DATA TYPE varchar;
  ALTER TABLE "_pages_v_blocks_card_grid_items" ALTER COLUMN "lucide_icon" SET DATA TYPE varchar;
  DROP TYPE "public"."enum_pages_blocks_card_grid_items_lucide_icon";
  DROP TYPE "public"."enum__pages_v_blocks_card_grid_items_lucide_icon";`)
}
