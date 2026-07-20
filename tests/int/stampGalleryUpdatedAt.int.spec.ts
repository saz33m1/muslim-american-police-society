import { describe, expect, it } from 'vitest'

import { stampGalleryUpdatedAt } from '@/collections/Posts/hooks/stampGalleryUpdatedAt'

// Pure decision-logic test for the hook that stamps posts.galleryUpdatedAt. No DB:
// the hook is a synchronous function of (data, operation, originalDoc). Autosave
// fires it on every keystroke, so the contract that matters is "only bump when
// gallery MEMBERSHIP changes" — that's what these cases pin down.
const run = (args: { data: unknown; operation: 'create' | 'update'; originalDoc?: unknown }) =>
  // The real hook receives the full Payload hook arg; it only reads these three.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (stampGalleryUpdatedAt as any)(args) as { galleryUpdatedAt?: string }

const stamped = (r: { galleryUpdatedAt?: string }) => typeof r.galleryUpdatedAt === 'string'

describe('stampGalleryUpdatedAt', () => {
  it('stamps on create with a non-empty gallery', () => {
    expect(stamped(run({ operation: 'create', data: { gallery: [1, 2] } }))).toBe(true)
  })

  it('does not stamp on create with no gallery', () => {
    expect(stamped(run({ operation: 'create', data: { gallery: [] } }))).toBe(false)
    expect(stamped(run({ operation: 'create', data: {} }))).toBe(false)
  })

  it('stamps when a photo is added', () => {
    const r = run({ operation: 'update', originalDoc: { gallery: [1] }, data: { gallery: [1, 2] } })
    expect(stamped(r)).toBe(true)
  })

  it('stamps when a photo is removed (still non-empty)', () => {
    const r = run({ operation: 'update', originalDoc: { gallery: [1, 2] }, data: { gallery: [1] } })
    expect(stamped(r)).toBe(true)
  })

  it('does NOT stamp on a pure reorder', () => {
    const r = run({
      operation: 'update',
      originalDoc: { gallery: [1, 2] },
      data: { gallery: [2, 1] },
    })
    expect(stamped(r)).toBe(false)
  })

  it('does NOT stamp on an unrelated edit (gallery unchanged)', () => {
    const r = run({
      operation: 'update',
      originalDoc: { gallery: [1, 2] },
      data: { gallery: [1, 2] },
    })
    expect(stamped(r)).toBe(false)
  })

  it('does NOT stamp when the gallery is emptied', () => {
    const r = run({ operation: 'update', originalDoc: { gallery: [1] }, data: { gallery: [] } })
    expect(stamped(r)).toBe(false)
  })

  it('normalizes populated docs and ids to the same membership', () => {
    const r = run({
      operation: 'update',
      originalDoc: { gallery: [{ id: 1 }, { id: 2 }] },
      data: { gallery: [2, 1] },
    })
    expect(stamped(r)).toBe(false)
  })

  it('does NOT stamp on a partial update that omits the gallery field', () => {
    // data has no `gallery` key (e.g. updating only the title) — the gallery is
    // untouched, so absence must not read as "emptied" and re-stamp.
    const r = run({ operation: 'update', originalDoc: { gallery: [1, 2] }, data: { title: 'x' } })
    expect(stamped(r)).toBe(false)
  })

  it('preserves an explicitly provided timestamp when gallery is unchanged (backfill path)', () => {
    const r = run({
      operation: 'update',
      originalDoc: { gallery: [1] },
      data: { gallery: [1], galleryUpdatedAt: '2020-01-01T00:00:00.000Z' },
    })
    expect(r.galleryUpdatedAt).toBe('2020-01-01T00:00:00.000Z')
  })
})
