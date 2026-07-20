// @vitest-environment node
// Node env (not jsdom): drives the Payload API + sharp media uploads, same as
// api.int.spec. Verifies the Featured Galleries query end to end — the filters
// (published, has-gallery, not-a-Statement), the gallery-recency sort, and cover
// selection — against a real DB.
import path from 'path'

import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getGalleryHighlights } from '@/blocks/GalleryHighlights/data'
import type { Category, Media, Post } from '@/payload-types'

let payload: Payload
const context = { disableRevalidate: true } // revalidatePath throws outside a request
const created: { collection: 'posts' | 'media' | 'categories'; id: number }[] = []

const img = async (file: string, alt: string): Promise<Media> => {
  const doc = await payload.create({
    collection: 'media',
    overrideAccess: true,
    context: { ...context },
    data: { alt },
    filePath: path.resolve(process.cwd(), 'public/import/prose/' + file),
  })
  created.push({ collection: 'media', id: doc.id })
  return doc
}

const findOrCreateCat = async (slug: string, title: string): Promise<Category> => {
  const found = await payload.find({
    collection: 'categories',
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  })
  if (found.docs[0]) return found.docs[0]
  const doc = await payload.create({
    collection: 'categories',
    overrideAccess: true,
    context: { ...context },
    data: { title, slug } as never,
  })
  created.push({ collection: 'categories', id: doc.id })
  return doc
}

const makePost = async (data: Record<string, unknown>): Promise<Post> => {
  const doc = await payload.create({
    collection: 'posts',
    overrideAccess: true,
    context: { ...context },
    data: data as never,
  })
  created.push({ collection: 'posts', id: doc.id })
  return doc
}

// Ids of the posts this spec creates, so assertions ignore any other DB content.
let A: number, B: number, stmt: number, noGal: number, draft: number

describe('getGalleryHighlights', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })

    const hero = await img('1.webp', 'gh hero') // 1200x1200, satisfies the square-hero rule
    const g1 = await img('102.webp', 'gh photo 1')
    const g2 = await img('103.webp', 'gh photo 2')

    const events = await findOrCreateCat('gh-test-events', 'GH Test Events')
    const statements = await findOrCreateCat('statements', 'Statements')

    const base = { heroImage: hero.id, _status: 'published' }
    // content is required; a paragraph with one text node is the minimal valid body.
    const body = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            version: 1,
            children: [
              {
                type: 'text',
                text: 'gh',
                version: 1,
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
              },
            ],
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      },
    }

    A = (
      await makePost({
        ...base,
        title: 'gh A two photos custom cover',
        categories: [events.id],
        gallery: [g1.id, g2.id],
        galleryCover: g2.id, // custom cover = 2nd photo
        content: body,
      })
    ).id
    B = (
      await makePost({
        ...base,
        title: 'gh B one photo',
        categories: [events.id],
        gallery: [g1.id],
        content: body,
      })
    ).id
    stmt = (
      await makePost({
        ...base,
        title: 'gh statement',
        categories: [statements.id],
        gallery: [g1.id],
        content: body,
      })
    ).id
    noGal = (
      await makePost({
        ...base,
        title: 'gh no gallery',
        categories: [events.id],
        content: body,
      })
    ).id
    draft = (
      await makePost({
        title: 'gh draft',
        heroImage: hero.id,
        _status: 'draft',
        categories: [events.id],
        gallery: [g1.id],
        content: body,
      })
    ).id

    // Pin deterministic gallery-recency order: B newer than A. Gallery is included
    // and unchanged, so the hook leaves the explicit galleryUpdatedAt in place.
    await payload.update({
      collection: 'posts',
      id: A,
      overrideAccess: true,
      context: { ...context },
      data: { gallery: [g1.id, g2.id], galleryUpdatedAt: '2020-01-01T00:00:00.000Z' } as never,
    })
    await payload.update({
      collection: 'posts',
      id: B,
      overrideAccess: true,
      context: { ...context },
      data: { gallery: [g1.id], galleryUpdatedAt: '2025-01-01T00:00:00.000Z' } as never,
    })
  })

  afterAll(async () => {
    for (const { collection, id } of created.reverse()) {
      await payload.delete({ collection, id, overrideAccess: true, context: { ...context } })
    }
  })

  it('excludes Statements, no-gallery posts, and drafts; includes real galleries', async () => {
    const cards = await getGalleryHighlights(payload, 100)
    const ids = cards.map((c) => c.post.id)
    expect(ids).toContain(A)
    expect(ids).toContain(B)
    expect(ids).not.toContain(stmt)
    expect(ids).not.toContain(noGal)
    expect(ids).not.toContain(draft)
  })

  it('orders by most recent gallery activity (B before A)', async () => {
    const ids = (await getGalleryHighlights(payload, 100)).map((c) => c.post.id)
    expect(ids.indexOf(B)).toBeLessThan(ids.indexOf(A))
  })

  it('caps the result set at the requested limit, keeping the newest galleries', async () => {
    // The block's `limit` field (default 6) is the only control an editor has over how
    // many prints appear. Assert it actually reaches the query: with limit 1 we get one
    // card, and it is the most recently updated gallery, not an arbitrary one.
    const cards = await getGalleryHighlights(payload, 1)
    expect(cards).toHaveLength(1)

    const all = await getGalleryHighlights(payload, 100)
    expect(cards[0].post.id).toBe(all[0].post.id)
  })

  it('honors the custom cover and counts all gallery photos', async () => {
    const cards = await getGalleryHighlights(payload, 100)
    const cardA = cards.find((c) => c.post.id === A)!
    const cardB = cards.find((c) => c.post.id === B)!
    expect(cardA.count).toBe(2)
    expect(cardA.cover.alt).toBe('gh photo 2') // galleryCover, not the first photo
    expect(cardB.count).toBe(1)
    expect(cardB.cover.alt).toBe('gh photo 1')
  })
})
