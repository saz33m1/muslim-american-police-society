import type { Field } from 'payload'

/**
 * The source CMS's stable record id, kept so an import can find-or-create the
 * same row on re-run (idempotency) regardless of slug/title edits. Hidden and
 * read-only in the admin — it's a migration join key, not editable content.
 * Indexed because every import upsert queries it. Reusable across any collection
 * fed by the Webflow-CSV importer.
 */
export const legacyItemId = (): Field => ({
  name: 'legacyItemId',
  type: 'text',
  index: true,
  admin: {
    hidden: true,
    readOnly: true,
    description: 'Source CMS Item ID — import idempotency key. Do not edit.',
  },
})
