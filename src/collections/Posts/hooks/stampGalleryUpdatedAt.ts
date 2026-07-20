import type { CollectionBeforeChangeHook } from 'payload'

// Normalize a hasMany upload value (ids or populated docs) to a SORTED id list, so
// we compare gallery *membership* regardless of order or populated shape. Sorting
// means a pure reorder doesn't count as a change (it isn't "new photos").
const galleryIds = (gallery: unknown): number[] =>
  Array.isArray(gallery)
    ? gallery
        .map((g) => (g && typeof g === 'object' ? (g as { id: number }).id : (g as number)))
        .filter((id): id is number => typeof id === 'number')
        .sort((a, b) => a - b)
    : []

/**
 * Stamp `galleryUpdatedAt` whenever the post's gallery membership changes, so the
 * Featured Galleries block can order by "most recently updated gallery" with a real
 * DB sort instead of computing max(media.updatedAt) in JS on every render.
 *
 * Only bumps on add/remove (not reorder, not unrelated post edits like body text) —
 * autosave fires this on every keystroke, so guarding on an actual membership change
 * is what keeps the timestamp meaningful.
 *
 * ponytail: an in-place media *replacement* (same doc id, new file, edited in the
 * Media collection) doesn't touch the post, so it won't bump this. Acceptable —
 * adding photos is the case that matters, and that edits this field.
 */
export const stampGalleryUpdatedAt: CollectionBeforeChangeHook = ({
  data,
  operation,
  originalDoc,
}) => {
  // Only react when this write actually carries the gallery field. A partial
  // update that omits it (data.gallery === undefined) leaves the gallery
  // untouched — don't misread the absence as "emptied" and re-stamp.
  if (data == null || !('gallery' in data)) return data
  const next = galleryIds(data.gallery)
  const prev = operation === 'create' ? [] : galleryIds(originalDoc?.gallery)
  const changed = next.length !== prev.length || next.some((id, i) => id !== prev[i])
  if (changed && next.length > 0) {
    data.galleryUpdatedAt = new Date().toISOString()
  }
  return data
}
