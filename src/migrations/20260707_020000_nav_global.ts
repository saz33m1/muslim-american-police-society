import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { seedHeaderNav } from '../Header/seedNav'

// Move the header nav from hardcoded config into the `header` global. Replaces the
// old template `navItems` (single-level link array + its `_rels`) with grouped
// `navGroups` (sections → items) + `flatLinks`. DDL matches what dev `push`
// generated for the new config (captured from the live schema); the seed fills the
// global with the default IA so the live nav is not blank post-deploy. Idempotent:
// the seed skips a global that already has sections, so a re-run / an env seeded via
// `npm run seed:header` is a no-op. `req` runs the seed inside this migration's txn.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE "header_nav_groups" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar,
  	"gated" boolean
  );

  CREATE TABLE "header_nav_groups_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );

  CREATE TABLE "header_flat_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );

  DROP TABLE IF EXISTS "header_nav_items" CASCADE;
  DROP TABLE IF EXISTS "header_rels" CASCADE;
  DROP TYPE IF EXISTS "public"."enum_header_nav_items_link_type";

  ALTER TABLE "header_nav_groups" ADD CONSTRAINT "header_nav_groups_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_nav_groups_items" ADD CONSTRAINT "header_nav_groups_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header_nav_groups"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_flat_links" ADD CONSTRAINT "header_flat_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;

  CREATE INDEX "header_nav_groups_order_idx" ON "header_nav_groups" USING btree ("_order");
  CREATE INDEX "header_nav_groups_parent_id_idx" ON "header_nav_groups" USING btree ("_parent_id");
  CREATE INDEX "header_nav_groups_items_order_idx" ON "header_nav_groups_items" USING btree ("_order");
  CREATE INDEX "header_nav_groups_items_parent_id_idx" ON "header_nav_groups_items" USING btree ("_parent_id");
  CREATE INDEX "header_flat_links_order_idx" ON "header_flat_links" USING btree ("_order");
  CREATE INDEX "header_flat_links_parent_id_idx" ON "header_flat_links" USING btree ("_parent_id");`)

  // Fill the global with the default IA (same tx, so the tables above are visible).
  const result = await seedHeaderNav(payload, req)
  payload.logger.info(`nav_global migration: header nav ${result}`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  CREATE TYPE "public"."enum_header_nav_items_link_type" AS ENUM('reference', 'custom');

  CREATE TABLE "header_nav_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"link_type" "enum_header_nav_items_link_type" DEFAULT 'reference',
  	"link_new_tab" boolean,
  	"link_url" varchar,
  	"link_label" varchar NOT NULL
  );

  CREATE TABLE "header_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"pages_id" integer,
  	"posts_id" integer
  );

  DROP TABLE IF EXISTS "header_nav_groups_items" CASCADE;
  DROP TABLE IF EXISTS "header_nav_groups" CASCADE;
  DROP TABLE IF EXISTS "header_flat_links" CASCADE;

  ALTER TABLE "header_nav_items" ADD CONSTRAINT "header_nav_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_rels" ADD CONSTRAINT "header_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;

  CREATE INDEX "header_nav_items_order_idx" ON "header_nav_items" USING btree ("_order");
  CREATE INDEX "header_nav_items_parent_id_idx" ON "header_nav_items" USING btree ("_parent_id");
  CREATE INDEX "header_rels_order_idx" ON "header_rels" USING btree ("order");
  CREATE INDEX "header_rels_parent_idx" ON "header_rels" USING btree ("parent_id");
  CREATE INDEX "header_rels_path_idx" ON "header_rels" USING btree ("path");
  CREATE INDEX "header_rels_pages_id_idx" ON "header_rels" USING btree ("pages_id");
  CREATE INDEX "header_rels_posts_id_idx" ON "header_rels" USING btree ("posts_id");`)
}
