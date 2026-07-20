// @vitest-environment node
// Node env (not jsdom): drives the Payload API only, and media uploads run sharp
// which rejects Node buffers across jsdom's realm (see api.int.spec.ts).
import fs from 'fs'
import os from 'os'
import path from 'path'

import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { collectionHref } from '@/utilities/collectionHref'
import { rankSearchResults, type RankableDoc } from '@/search/rank'

import { describe, it, beforeAll, expect } from 'vitest'

let payload: Payload

// Captured by the page/post tests below; the ranking test reads their search docs.
let pageId: number
let postId: number

// revalidatePath throws outside a request; the collections' revalidate hooks skip on this.
const context = { disableRevalidate: true }

// Per-run token so re-running locally (payload-poc persists) never collides on
// the unique `slug`, and search markers stay specific to this run.
const uniq = Date.now().toString(36)

// Minimal Lexical richText holding a single line of text.
const lex = (text: string) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        version: 1,
        children: [
          { type: 'text', text, version: 1, detail: 0, format: 0, mode: 'normal', style: '' },
        ],
      },
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

describe('search indexing (issues #244/#245)', () => {
  beforeAll(async () => {
    payload = await getPayload({ config: await config })
  })

  // #244: result links resolve per source collection, home maps to root.
  it('collectionHref: posts under /latest-updates, pages at root, home at /', () => {
    expect(collectionHref('posts', 'my-post')).toBe('/latest-updates/my-post')
    expect(collectionHref('pages', 'about-us')).toBe('/about-us')
    expect(collectionHref('pages', 'home')).toBe('/')
  })

  // #244 (pages indexed + relationTo) + #245 (page block text walked into `content`).
  it('indexes a page: block prose searchable, tagged relationTo=pages', async () => {
    const markers = {
      heading: `faqHeadingMarker${uniq}`,
      body: `faqBodyMarker${uniq}`,
      question: `faqQuestionMarker${uniq}`,
      answer: `faqAnswerMarker${uniq}`,
      // hero group: richText + the plain-string eyebrow. Exercises the separate
      // `collectText(originalDoc.hero, ...)` branch (pages index hero text too).
      hero: `heroRichMarker${uniq}`,
      eyebrow: `heroEyebrowMarker${uniq}`,
    }
    const page = await payload.create({
      collection: 'pages',
      context: { ...context },
      data: {
        title: `Search Verify Page ${uniq}`,
        slug: `verify-page-${uniq}`,
        _status: 'published',
        hero: { type: 'lowImpact', richText: lex(markers.hero), eyebrow: markers.eyebrow },
        layout: [
          {
            blockType: 'faq',
            layout: 'stacked',
            header: {
              enableHeader: true,
              heading: markers.heading,
              body: lex(markers.body),
            },
            items: [{ question: markers.question, answer: lex(markers.answer) }],
          },
        ],
      } as never,
    })
    pageId = page.id

    const res = await payload.find({
      collection: 'search',
      where: { content: { like: markers.answer } },
      depth: 0,
    })
    const hit = res.docs.find((d) => (d.doc as { value?: number })?.value === page.id) as
      | { doc: { relationTo: string }; content?: string }
      | undefined

    expect(hit).toBeDefined()
    expect(hit!.doc.relationTo).toBe('pages')
    // Every text-bearing field must reach `content` — the FAQ block (group heading,
    // group richText, array item question + answer) AND the hero group (richText +
    // eyebrow string). Proves the recursive walker across both page branches.
    for (const marker of Object.values(markers)) {
      expect(hit!.content).toContain(marker)
    }
  })

  // #245: post body richText walked into `content`, still tagged relationTo=posts.
  it('indexes a post: body prose searchable, tagged relationTo=posts', async () => {
    const marker = `quokkaPostBodyMarker${uniq}`
    const category = await payload.create({
      collection: 'categories',
      context: { ...context },
      data: { title: `Search Verify Category ${uniq}`, slug: `verify-cat-${uniq}` } as never,
    })
    // Posts require a square, >=1080px hero on publish; reuse the tracked 1200x1200
    // asset, copied to a unique filename so it never collides with api.int's hero
    // (same source → same `1.webp` → unique-filename ValidationError) or a re-run.
    const heroPath = path.join(os.tmpdir(), `verify-hero-${uniq}.webp`)
    fs.copyFileSync(path.resolve(process.cwd(), 'public/import/prose/1.webp'), heroPath)
    const hero = await payload.create({
      collection: 'media',
      overrideAccess: true,
      context: { ...context },
      data: { alt: 'search verify hero' },
      filePath: heroPath,
    })
    const post = await payload.create({
      collection: 'posts',
      context: { ...context },
      data: {
        title: `Search Verify Post ${uniq}`,
        slug: `verify-post-${uniq}`,
        _status: 'published',
        heroImage: hero.id,
        categories: [category.id],
        content: lex(marker),
      } as never,
    })
    postId = post.id

    const res = await payload.find({
      collection: 'search',
      where: { content: { like: marker } },
      depth: 0,
    })
    const hit = res.docs.find((d) => (d.doc as { value?: number })?.value === post.id) as
      | { doc: { relationTo: string }; content?: string }
      | undefined

    expect(hit).toBeDefined()
    expect(hit!.doc.relationTo).toBe('posts')
    expect(hit!.content).toContain(marker)
  })

  // #244: the results query paginates (real page metadata, not pagination:false).
  // 10 per page mirrors `limit` in search/page.tsx — keep the two in sync.
  it('search results paginate 10 per page', async () => {
    const res = await payload.find({ collection: 'search', limit: 10, page: 1, depth: 0 })
    expect(res.limit).toBe(10)
    expect(res.page).toBe(1)
    // Non-trivial: ties the page size to the reported page count.
    expect(res.totalPages).toBe(Math.ceil(res.totalDocs / 10))
  })

  // #244: defaultPriorities (posts 20 > pages 10) + the /search `-priority` sort put
  // posts above pages. Reads the search docs written by the two tests above.
  it('ranks posts above pages via priority', async () => {
    const res = await payload.find({ collection: 'search', depth: 0, limit: 0 })
    const priorityOf = (relationTo: string, value: number) =>
      (
        res.docs.find(
          (d) =>
            (d.doc as { relationTo?: string })?.relationTo === relationTo &&
            (d.doc as { value?: number })?.value === value,
        ) as { priority?: number } | undefined
      )?.priority

    const postPriority = priorityOf('posts', postId)
    const pagePriority = priorityOf('pages', pageId)
    expect(postPriority).toBeDefined()
    expect(pagePriority).toBeDefined()
    expect(postPriority!).toBeGreaterThan(pagePriority!)
  })

  // Page-based member search: a team block's members' names are folded into the
  // page's search content, so searching a member surfaces the page that lists
  // them (e.g. "azeem" → Board & Leadership).
  it('indexes team-block member names into the page content', async () => {
    const marker = `zatateammembermarker${uniq}`
    const cat = await payload.create({
      collection: 'team-categories',
      context: { ...context },
      data: { title: `Verify Team Cat ${uniq}`, slug: `verify-team-cat-${uniq}` } as never,
    })
    await payload.create({
      collection: 'team',
      context: { ...context },
      data: {
        name: `${marker} Verifyperson`,
        slug: `verify-member-${uniq}`,
        jobTitle: 'Verify Chief',
        categories: [cat.id],
      } as never,
    })
    const page = await payload.create({
      collection: 'pages',
      context: { ...context },
      data: {
        title: `Team Verify Page ${uniq}`,
        slug: `verify-team-page-${uniq}`,
        _status: 'published',
        layout: [
          {
            blockType: 'team',
            layout: 'grouped',
            density: 'medium',
            populateBy: 'collection',
            categories: [cat.id],
            limit: 0,
          },
        ],
      } as never,
    })

    const res = await payload.find({
      collection: 'search',
      where: { content: { like: marker } },
      depth: 0,
    })
    const hit = res.docs.find((d) => (d.doc as { value?: number })?.value === page.id) as
      | { doc: { relationTo: string }; content?: string }
      | undefined

    expect(hit).toBeDefined()
    expect(hit!.doc.relationTo).toBe('pages')
    expect(hit!.content).toContain(marker)
  })
})

// Relevance sort (rank.ts) is pure, so exercise it directly — no DB needed.
describe('search relevance ranking', () => {
  // The maaty case: a member's name lands in a page's `content`, tied with posts
  // that mention them in the body. Both are body matches, so priority alone would
  // bury the page (pages 10 < posts 20). A person query must lift the page.
  const page: RankableDoc = {
    title: 'Board & Leadership',
    slug: 'about-us/board-leadership',
    content: 'Ahmad Maaty Chair',
    priority: 10,
    doc: { relationTo: 'pages' },
  }
  const post: RankableDoc = {
    title: 'Iftar recap',
    slug: 'iftar-recap',
    content: 'guests included Ahmad Maaty and others',
    priority: 20,
    doc: { relationTo: 'posts' },
  }

  it('a person query lifts the roster page above posts that only mention them', () => {
    const ranked = rankSearchResults([post, page], 'maaty', true)
    expect(ranked[0]).toBe(page)
  })

  it('without a person query, priority (news-first) still orders body matches', () => {
    const ranked = rankSearchResults([page, post], 'maaty', false)
    expect(ranked[0]).toBe(post)
  })

  it('a title match outranks a body-only match regardless of collection', () => {
    const titlePage: RankableDoc = {
      title: 'Programs',
      content: '',
      priority: 10,
      doc: { relationTo: 'pages' },
    }
    const bodyPost: RankableDoc = {
      title: 'News',
      content: 'our programs are great',
      priority: 20,
      doc: { relationTo: 'posts' },
    }
    const ranked = rankSearchResults([bodyPost, titlePage], 'programs', false)
    expect(ranked[0]).toBe(titlePage)
  })
})
