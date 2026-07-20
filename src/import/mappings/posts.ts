import type { CollectionImport } from '../types'

const CSV_DIR = 'migration/webflow_cms_data'

/**
 * Latest Update Categories — the topic taxonomy for posts (events, press
 * releases, statements, …), imported into the EXISTING `categories` collection.
 * The Latest Updates "Category" column references these by slug, so they must
 * import first. Plain Name + Slug; idempotent on the Webflow Item ID.
 */
export const updateCategoriesImport: CollectionImport = {
  collection: 'categories',
  csv: `${CSV_DIR}/MAPS National - Latest Update Categories - 675912fab8f1079e44081d7a.csv`,
  fields: [
    { column: 'Name', field: 'title', required: true },
    { column: 'Slug', field: 'slug', transform: 'slug', required: true },
  ],
}

/**
 * Latest Updates — the news feed, imported into the EXISTING `posts` collection.
 * The hero `Image` and the `Photos` gallery are downloaded and re-hosted as
 * Media (no Webflow CDN URLs survive); the `Post` HTML becomes Lexical richText;
 * `Category` is a slug-keyed reference into the categories imported above (so
 * `dependsOn` them). Webflow Draft/Archived → Payload draft/published is handled
 * by the envelope. `content` is required (Posts requires a body), so a row with
 * an empty Post is skipped with an error rather than creating a bodyless post.
 */
export const latestUpdatesImport: CollectionImport = {
  collection: 'posts',
  csv: `${CSV_DIR}/MAPS National - Latest Updates - 6742b30c0a6fcb3f29557150.csv`,
  dependsOn: ['update-categories'],
  fields: [
    { column: 'Title', field: 'title', required: true },
    { column: 'Slug', field: 'slug', transform: 'slug', required: true },
    { column: 'Date', field: 'publishedAt', transform: 'date' },
    {
      column: 'Category',
      field: 'categories',
      transform: 'multiRef',
      options: { relationTo: 'categories', by: 'slug', sep: ';' },
    },
    {
      column: 'Image',
      field: 'heroImage',
      transform: 'externalImage',
      options: { publicDir: 'public/import/updates' },
    },
    { column: 'Post', field: 'content', transform: 'html', required: true },
    {
      column: 'Photos',
      field: 'gallery',
      transform: 'mediaGallery',
      options: { publicDir: 'public/import/updates' },
    },
    { column: 'Members Only URL', field: 'membersOnlyUrl' },
    { column: 'Sticky', field: 'sticky', transform: 'bool' },
  ],
  // The posts listing card (src/components/Card) renders the SEO `meta.image`,
  // not `heroImage` — so without this a migrated post shows a "No image" card.
  // Mirror the imported hero into meta so the archive view matches the detail page.
  finalize: (doc) => {
    const meta = { ...(doc.meta as Record<string, unknown> | undefined) }
    if (doc.heroImage != null && meta.image == null) meta.image = doc.heroImage
    return { ...doc, meta }
  },
}
