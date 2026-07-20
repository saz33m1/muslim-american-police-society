import { describe, expect, it } from 'vitest'

import { fmtDate, toGalleryCards } from '@/blocks/GalleryHighlights/data'
import type { Media, Post } from '@/payload-types'

// Pure card-mapping + date-formatting tests (no DB). These pin the block's custom
// logic: which photo becomes the cover, how photos are counted, and that a
// calendar date isn't shifted a day by the server's timezone.

const media = (id: number, url: string | null): Media =>
  ({ id, url, alt: `m${id}` }) as unknown as Media

const post = (over: Partial<Post>): Post =>
  ({ id: 1, title: 't', slug: 's', gallery: [], ...over }) as unknown as Post

describe('toGalleryCards', () => {
  it('uses the first gallery photo as cover when no galleryCover is set', () => {
    const g = [media(1, '/1.webp'), media(2, '/2.webp')]
    const [card] = toGalleryCards([post({ gallery: g })])
    expect(card.cover.id).toBe(1)
    expect(card.count).toBe(2)
  })

  it('uses the editor-chosen galleryCover when set', () => {
    const g = [media(1, '/1.webp'), media(2, '/2.webp')]
    const [card] = toGalleryCards([post({ gallery: g, galleryCover: media(2, '/2.webp') })])
    expect(card.cover.id).toBe(2)
    expect(card.count).toBe(2) // cover choice doesn't change the count
  })

  it('falls back to the first photo when galleryCover is unpopulated (an id)', () => {
    const g = [media(1, '/1.webp'), media(2, '/2.webp')]
    const [card] = toGalleryCards([post({ gallery: g, galleryCover: 2 })])
    expect(card.cover.id).toBe(1)
  })

  it('ignores gallery entries that are ids or have no url', () => {
    const g = [7 as unknown as Media, media(0, null), media(3, '/3.webp')]
    const [card] = toGalleryCards([post({ gallery: g })])
    expect(card.cover.id).toBe(3)
    expect(card.count).toBe(1)
  })

  it('drops posts whose gallery has no usable photo', () => {
    expect(toGalleryCards([post({ gallery: [] })])).toHaveLength(0)
    expect(toGalleryCards([post({ gallery: [media(0, null)] })])).toHaveLength(0)
  })

  it('preserves input order', () => {
    const cards = toGalleryCards([
      post({ id: 10, gallery: [media(1, '/1.webp')] }),
      post({ id: 20, gallery: [media(2, '/2.webp')] }),
    ])
    expect(cards.map((c) => c.post.id)).toEqual([10, 20])
  })
})

describe('fmtDate', () => {
  it('formats a midnight-UTC calendar date without shifting the day', () => {
    // The bug this guards: local (UTC-4/5) formatting rendered this as "Mar 18".
    expect(fmtDate('2026-03-19T00:00:00.000Z')).toBe('Mar 19, 2026')
  })

  it('formats a real timestamp in UTC', () => {
    expect(fmtDate('2026-07-11T16:13:00.000Z')).toBe('Jul 11, 2026')
  })

  it('returns null for empty input', () => {
    expect(fmtDate(null)).toBeNull()
    expect(fmtDate(undefined)).toBeNull()
  })
})
