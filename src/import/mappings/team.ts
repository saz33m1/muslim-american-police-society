import type { CollectionImport } from '../types'

const CSV_DIR = 'migration/webflow_cms_data'

/**
 * Team Categories — the groups a member belongs to. Plain title + slug; `order`
 * has no source column, so it keeps the collection default.
 */
export const teamCategoriesImport: CollectionImport = {
  collection: 'team-categories',
  csv: `${CSV_DIR}/MAPS National - Team Categories - 67834bbb3298c602eb16663f.csv`,
  fields: [
    { column: 'Name', field: 'title', required: true },
    { column: 'Slug', field: 'slug', transform: 'slug', required: true },
  ],
}

/**
 * Team Members — the full directory. Job titles pass through verbatim (their `;`
 * is prose, not a list separator); `Team Category` is the one `; `-list, resolved
 * to category relationships; the headshot is downloaded and re-hosted as Media;
 * the HTML bio becomes Lexical richText. Categories must import first so the
 * references resolve.
 */
export const teamMembersImport: CollectionImport = {
  collection: 'team',
  csv: `${CSV_DIR}/MAPS National - Team Members - 678343390148c6789eb580a3.csv`,
  dependsOn: ['team-categories'],
  fields: [
    { column: 'Name', field: 'name', required: true },
    { column: 'Slug', field: 'slug', transform: 'slug', required: true },
    { column: 'Job Title (1st)', field: 'jobTitle' },
    { column: 'Job Title (2nd)', field: 'jobTitleSecondary' },
    { column: 'Email', field: 'email' },
    { column: 'LinkedIn URL', field: 'linkedin' },
    { column: 'Ordering (1st)', field: 'order', transform: 'number' },
    { column: 'Ordering (2nd)', field: 'orderSecondary', transform: 'number' },
    {
      column: 'Team Category',
      field: 'categories',
      transform: 'multiRef',
      options: { relationTo: 'team-categories', by: 'slug', sep: ';' },
    },
    {
      column: 'Profile Picture',
      field: 'photo',
      transform: 'externalImage',
      options: { publicDir: 'public/import/team' },
    },
    { column: 'Bio', field: 'bio', transform: 'html' },
  ],
}
