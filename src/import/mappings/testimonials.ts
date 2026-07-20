import type { CollectionImport, FieldMapping } from '../types'

const CSV_DIR = 'migration/webflow_cms_data'

/**
 * Both Webflow testimonial CSVs share the same two content columns (Name + the
 * quote), differing only in which source they came from — the destination
 * `type` discriminator. So the field map is identical; each entry just stamps
 * its `type` in `finalize`. The quote is the destination's richText, so the
 * plain-text source is run through `html` (which wraps it in a paragraph).
 */
const fields: FieldMapping[] = [
  { column: 'Name', field: 'author', required: true },
  { column: 'Slug', field: 'slug', transform: 'slug', required: true },
  { column: 'Testimonial', field: 'quote', transform: 'html', required: true },
]

/**
 * Stamp the source `type` and namespace the slug by it. The two source files
 * carry the same numeric Webflow slugs (e.g. both have `10`), which collide on
 * the merged collection's unique `slug`; testimonials have no own route, so a
 * `${type}-${slug}` prefix is a harmless way to keep them unique. Upsert is by
 * `legacyItemId`, so re-runs stay idempotent.
 */
const finalizeType =
  (type: 'career' | 'programs') =>
  (doc: Record<string, unknown>): Record<string, unknown> => ({
    ...doc,
    type,
    slug: `${type}-${doc.slug}`,
  })

export const testimonialsCareerImport: CollectionImport = {
  collection: 'testimonials',
  csv: `${CSV_DIR}/MAPS National - Testimonials (Career) - 68d4a29f3dd2006fee77a3fb.csv`,
  fields,
  finalize: finalizeType('career'),
}

export const testimonialsProgramsImport: CollectionImport = {
  collection: 'testimonials',
  csv: `${CSV_DIR}/MAPS National - Testimonials (Programs) - 68d4a3f4d8196fedfd52da41.csv`,
  fields,
  finalize: finalizeType('programs'),
}
