import type { CsvRow } from './types'

/**
 * Every Webflow CMS export shares the same wrapper columns around the content:
 * an `Item ID`, `Slug`, `Archived`/`Draft` flags, and created/updated/published
 * dates. This reads the two that every import needs regardless of collection —
 * the stable id (for idempotent upsert) and the publish state — so mappings only
 * have to describe their *content* columns, not this boilerplate.
 */
export interface Envelope {
  /** Webflow `Item ID` — the durable idempotency key. */
  legacyItemId?: string
  /** Derived publish state, for collections that support drafts. */
  status: 'published' | 'draft'
}

const isTrue = (v: string | undefined): boolean => (v || '').trim().toLowerCase() === 'true'

export const readEnvelope = (row: CsvRow): Envelope => {
  const itemId = (row['Item ID'] || '').trim()
  const live = !isTrue(row['Archived']) && !isTrue(row['Draft'])
  return {
    ...(itemId ? { legacyItemId: itemId } : {}),
    status: live ? 'published' : 'draft',
  }
}
