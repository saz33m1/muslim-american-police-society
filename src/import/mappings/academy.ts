import type { CollectionImport } from '../types'

const CSV_DIR = 'migration/webflow_cms_data'

/**
 * MAPS Academy Video Categories — the topic taxonomy the videos filter by.
 * Plain Name + Slug; the videos' `Category` column references these by slug, so
 * they import first.
 */
export const videoCategoriesImport: CollectionImport = {
  collection: 'video-categories',
  csv: `${CSV_DIR}/MAPS National - MAPS Academy Video Categories - 69f01e792b59dedc74598ccf.csv`,
  fields: [
    { column: 'Name', field: 'title', required: true },
    { column: 'Slug', field: 'slug', transform: 'slug', required: true },
  ],
}

/**
 * MAPS Academy Videos — the video library. The `Video` URL is stored verbatim
 * via `videoEmbed` (never fetched server-side); `Category` resolves by slug
 * into the categories imported above; `Ordering 1st` drives the list sort. No
 * source thumbnail/description columns, so those stay empty for editors to fill.
 */
export const academyVideosImport: CollectionImport = {
  collection: 'academy-videos',
  csv: `${CSV_DIR}/MAPS National - MAPS Academy Videos - 69ea6758de2a51cba0a07c84.csv`,
  dependsOn: ['video-categories'],
  fields: [
    { column: 'Title', field: 'title', required: true },
    { column: 'Slug', field: 'slug', transform: 'slug', required: true },
    { column: 'Video', field: 'videoUrl', transform: 'videoEmbed', required: true },
    {
      column: 'Category',
      field: 'categories',
      transform: 'multiRef',
      options: { relationTo: 'video-categories', by: 'slug', sep: ';' },
    },
    { column: 'Ordering 1st', field: 'order', transform: 'number' },
  ],
}
