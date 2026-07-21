/**
 * Canonical page-seed runner.
 *
 * After the destructive admin "seed database" button only home + contact exist.
 * This script idempotently upserts the assembled-page set — run it after every
 * admin re-seed:
 *
 *   npm run seed:pages
 *
 * Adding a new page: push one PageSlice into PAGE_SLICES below. A slice is an
 * async factory that receives the Payload instance (so it can resolve IDs) and
 * returns an array of page definitions. The runner upserts each by slug.
 *
 * ponytail: the page bodies below are a STARTER SKELETON, not real copy. They
 * exist so a fresh database comes up with the routes the nav, footer, and e2e
 * specs expect. Replace the prose (here or in the admin) with the org's actual
 * content — every string in a `paragraph(...)` call is placeholder text.
 */

import 'dotenv/config'

import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import configPromise from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import type { Payload } from 'payload'

import { SITE_NAME } from '../src/utilities/brand'

type PageData = RequiredDataFromCollectionSlug<'pages'>

type PageSlice = (payload: Payload) => Promise<PageData[]>

// ---------------------------------------------------------------------------
// Lexical rich-text helpers shared by all slices

const text = (value: string) => ({
  type: 'text',
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text: value,
  version: 1,
})

const node = (type: string, extra: Record<string, unknown>, children: unknown[]) => ({
  type,
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  children,
  ...extra,
})

const richText = (...children: unknown[]) => ({ root: node('root', {}, children) })
const heading = (value: string, tag = 'h1') => node('heading', { tag }, [text(value)])
const paragraph = (value: string) => node('paragraph', {}, [text(value)])
// Inline rich-text link node (Lexical custom link) for cross-page references.
const linkNode = (label: string, url: string, newTab = false) =>
  node('link', { version: 3, fields: { linkType: 'custom', url, newTab } }, [text(label)])

const proseColumn = (...children: unknown[]) => ({
  size: 'full',
  richText: richText(...children),
  enableLink: false,
})

const ctaLink = (label: string, url: string, appearance = 'default') => ({
  link: { type: 'custom', appearance, label, url },
})

// A plain one-section page: low-impact hero + a single prose content block.
// Every skeleton page is this shape; richer layouts get built in the admin or
// added as their own slice once the real content exists.
const simplePage = (
  slug: string,
  title: string,
  eyebrow: string,
  lede: string,
  body: string[],
  links: ReturnType<typeof ctaLink>[] = [],
): PageData =>
  ({
    slug,
    title,
    _status: 'published',
    hero: {
      type: 'lowImpact',
      eyebrow,
      richText: richText(heading(title, 'h1'), paragraph(lede)),
      links,
    },
    layout: [
      {
        blockType: 'content',
        columns: [proseColumn(...body.map((p) => paragraph(p)))],
      },
    ],
  }) as unknown as PageData

// ---------------------------------------------------------------------------
// Page slices

const homeSlice: PageSlice = async (_payload) => [
  {
    slug: 'home',
    title: 'Home',
    _status: 'published',
    hero: {
      type: 'lowImpact',
      eyebrow: SITE_NAME,
      richText: richText(
        heading('Supporting Muslim officers in American law enforcement', 'h1'),
        paragraph(
          'Placeholder homepage copy. Replace with the organization’s own introduction — who you serve, what membership offers, and why it matters.',
        ),
      ),
      links: [ctaLink('Become a member', '/join'), ctaLink('About us', '/about-us', 'outline')],
    },
    layout: [
      {
        blockType: 'content',
        columns: [
          proseColumn(
            heading('What we do', 'h2'),
            paragraph(
              'Placeholder section. Summarize the core programs here and link out to the pages that describe them in detail.',
            ),
          ),
        ],
      },
      {
        blockType: 'cta',
        richText: richText(
          node('paragraph', {}, [
            text('Learn more about our '),
            linkNode('programs', '/programs'),
            text(' or get in touch through our '),
            linkNode('contact page', '/contact'),
            text('.'),
          ]),
        ),
        links: [ctaLink('Contact', '/contact')],
      },
    ],
  } as unknown as PageData,
]

const aboutUsSlice: PageSlice = async (_payload) => [
  simplePage(
    'about-us',
    'About Us',
    SITE_NAME,
    'Placeholder introduction to the organization — its history, membership, and purpose.',
    [
      'Placeholder body copy. Describe how the organization started, who it represents, and the community it serves.',
      'Placeholder body copy. Describe governance, chapters, or partner relationships as they apply.',
    ],
    [ctaLink('Our mission', '/about-us/mission')],
  ),
  simplePage('about-us/mission', 'Mission', 'About Us', 'Placeholder mission statement.', [
    'Placeholder mission copy. State the organization’s mission in its own words.',
    'Placeholder values copy. List the values that guide the work.',
  ]),
]

const programsSlice: PageSlice = async (_payload) => [
  simplePage(
    'programs',
    'Programs',
    SITE_NAME,
    'Placeholder overview of the programs offered to members.',
    [
      'Placeholder program copy. Describe each program, who it is for, and how members take part.',
      'Placeholder program copy. Add a section per program, or split them into their own pages once the content exists.',
    ],
    [ctaLink('Become a member', '/join')],
  ),
]

const joinSlice: PageSlice = async (_payload) => [
  simplePage(
    'join',
    'Join',
    'Membership',
    'Placeholder membership overview — who is eligible and what membership includes.',
    [
      'Placeholder membership copy. Describe eligibility, dues (if any), and the benefits of joining.',
      'Membership signup is handled by Outseta. Wire the join flow to the plans configured in your Outseta tenant.',
    ],
  ),
]

// Seeded only because DONATE_CTA in src/utilities/brand.ts puts a /donate button
// in the header. If this org has no donation flow, delete this slice AND the
// button from DesktopNav/NavMenu (see the note on DONATE_CTA).
const donateSlice: PageSlice = async (_payload) => [
  simplePage('donate', 'Donate', SITE_NAME, 'Placeholder donation page.', [
    'Placeholder donation copy. Add the org’s giving options, or remove this page and the header Donate button if there is no donation flow.',
  ]),
]

const contactSlice: PageSlice = async (_payload) => [
  simplePage('contact', 'Contact', SITE_NAME, 'Placeholder contact introduction.', [
    'Placeholder contact copy. Add the organization’s email addresses, mailing address, or a form block built in the admin.',
  ]),
]

// The members area is gated by src/proxy.ts. /members/portal is deliberately
// PUBLIC (it is the post-login landing page), so it must exist or hosted login
// redirect-loops against the gate.
const membersSlice: PageSlice = async (_payload) => [
  simplePage(
    'members/portal',
    'Member Portal',
    'Members',
    'Placeholder member portal landing page.',
    [
      'Placeholder portal copy. This page is public by design — it is where Outseta lands members after login. Put member-only material on other /members/* routes, which the gate protects.',
    ],
  ),
  simplePage(
    'members/resources',
    'Member Resources',
    'Members',
    'Placeholder gated member resources page.',
    ['Placeholder gated copy. This route sits behind the Outseta gate.'],
  ),
]

// The Latest Updates archive index. /latest-updates/[slug] serves post details;
// the bare /latest-updates route is a Page (this one) with an archive block that
// lists the Posts collection. Without it the footer link and the posts e2e 404.
const latestUpdatesSlice: PageSlice = async (_payload) => [
  {
    slug: 'latest-updates',
    title: 'Latest Updates',
    _status: 'published',
    hero: {
      type: 'lowImpact',
      eyebrow: SITE_NAME,
      richText: richText(
        heading('Latest Updates', 'h1'),
        paragraph('News, events, and announcements.'),
      ),
      links: [],
    },
    layout: [
      {
        blockType: 'archive',
        populateBy: 'collection',
        relationTo: 'posts',
        categories: [],
        limit: 12,
      },
    ],
  } as unknown as PageData,
]

// Sample posts, so the archive lists something and a post detail route resolves
// on a fresh database. Idempotent by slug.
const postsSlice: PageSlice = async (payload) => {
  const postMedia = async (filename: string): Promise<number | null> => {
    const r = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    const id = r.docs[0]?.id
    return typeof id === 'number' ? id : null
  }

  // Posts require exactly one category and a fresh DB has none.
  const ensureCategory = async (catSlug: string, title: string): Promise<number> => {
    const found = await payload.find({
      collection: 'categories',
      where: { slug: { equals: catSlug } },
      limit: 1,
      depth: 0,
    })
    if (found.docs[0]) return found.docs[0].id as number
    const created = await payload.create({
      collection: 'categories',
      data: { title } as never,
      context: { disableRevalidate: true },
    })
    return created.id as number
  }
  const updatesCategory = await ensureCategory('latest-updates', 'Latest Updates')

  const upsertPost = async (
    slug: string,
    title: string,
    body: string,
    imageFile: string,
    heroImageFile: string,
    extraNodes: unknown[] = [],
  ): Promise<void> => {
    const existing = await payload.find({
      collection: 'posts',
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 0,
    })
    // An image keeps post cards off the "No image" placeholder, whose
    // muted-foreground-on-muted contrast fails AA and trips the a11y e2e on any
    // page listing these posts. PostHero's flyer slot requires a square source,
    // so heroImage is a separate already-square asset from the card photo.
    const img = await postMedia(imageFile)
    const heroImg = await postMedia(heroImageFile)
    const data = {
      slug,
      title,
      _status: 'published',
      publishedAt: '2025-01-01T00:00:00.000Z',
      content: richText(paragraph(body), ...extraNodes),
      heroImage: heroImg,
      categories: [updatesCategory],
      ...(img ? { meta: { image: img } } : {}),
    } as never
    if (existing.docs[0]) {
      await payload.update({
        collection: 'posts',
        id: existing.docs[0].id,
        data,
        context: { disableRevalidate: true },
      })
    } else {
      await payload.create({ collection: 'posts', data, context: { disableRevalidate: true } })
    }
  }

  await upsertPost(
    'welcome-to-our-new-site',
    'Welcome to our new site',
    'Placeholder post body. Replace this with the organization’s first real update.',
    '4_1.webp',
    '4_2.webp',
    // A member-gated inline link: anonymous readers get the placeholder, members
    // get the real link. Keeps the members e2e assertion meaningful.
    [
      node('paragraph', {}, [
        text('Members can find more in the '),
        linkNode('member portal', '/members/portal'),
        text('.'),
      ]),
    ],
  )
  await upsertPost(
    'getting-involved',
    'Getting involved',
    'Placeholder post body. Describe how someone joins, volunteers, or attends an event.',
    '5_1.webp',
    '8.webp',
  )

  return []
}

// ---------------------------------------------------------------------------
// Registry — add new slices here

const PAGE_SLICES: PageSlice[] = [
  homeSlice,
  aboutUsSlice,
  programsSlice,
  joinSlice,
  donateSlice,
  contactSlice,
  membersSlice,
  latestUpdatesSlice,
  postsSlice,
]

// ---------------------------------------------------------------------------

const ensureTrackedMedia = async (
  payload: Payload,
  context: Record<string, unknown>,
): Promise<void> => {
  const dir = path.join(process.cwd(), 'public/import/prose')
  if (!existsSync(dir)) return
  const files = (await readdir(dir)).filter((f) => /\.(webp|png|jpe?g|gif|svg)$/i.test(f))
  let created = 0
  for (const filename of files) {
    const existing = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    if (existing.docs[0]) continue
    const data = await readFile(path.join(dir, filename))
    const ext = filename.split('.').pop()?.toLowerCase()
    const mimetype =
      ext === 'png'
        ? 'image/png'
        : ext === 'svg'
          ? 'image/svg+xml'
          : ext === 'gif'
            ? 'image/gif'
            : ext === 'jpg' || ext === 'jpeg'
              ? 'image/jpeg'
              : 'image/webp'
    await payload.create({
      collection: 'media',
      data: { alt: filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') },
      file: { name: filename, data, mimetype, size: data.length },
      // Fresh object per create, never the shared `context`: the cloud-storage
      // plugin stashes the first upload's file into req.context
      // (_payloadCloudStorage) and skips the stash if already set, so a context
      // object reused across media creates uploads doc #1's original only and
      // silently drops every file after it (rows commit, bucket stays empty).
      context: { ...context },
    })
    created++
  }
  payload.logger.info(
    `Tracked media ensured (${created} created, ${files.length - created} existing).`,
  )
}

// SEO meta (title + description) per page slug, applied in the upsert loop below.
// generateMeta appends the site name to the title tag, so titles never restate
// it; descriptions stay <=165 chars to avoid SERP truncation.
const META_BY_SLUG: Record<string, { title: string; description: string }> = {
  home: {
    title: 'Home',
    description:
      'Placeholder meta description for the homepage. Replace with a one-sentence summary of the organization.',
  },
  'about-us': {
    title: 'About Us',
    description:
      'Placeholder meta description. Summarize who the organization is and who it serves.',
  },
  'about-us/mission': {
    title: 'Mission',
    description: 'Placeholder meta description. Summarize the mission statement.',
  },
  programs: {
    title: 'Programs',
    description: 'Placeholder meta description. Summarize the programs offered to members.',
  },
  join: {
    title: 'Join',
    description: 'Placeholder meta description. Summarize membership eligibility and benefits.',
  },
  contact: {
    title: 'Contact',
    description: 'Placeholder meta description. Summarize how to get in touch.',
  },
  'latest-updates': {
    title: 'Latest Updates',
    description: 'News, events, and announcements from ' + SITE_NAME + '.',
  },
}

const run = async () => {
  const payload = await getPayload({ config: configPromise })

  // Running outside Next so revalidatePath would throw — skip it.
  const context = { disableRevalidate: true }

  await ensureTrackedMedia(payload, context)

  for (const slice of PAGE_SLICES) {
    const pages = await slice(payload)

    for (const data of pages) {
      const existing = await payload.find({
        collection: 'pages',
        where: { slug: { equals: data.slug } },
        limit: 1,
        depth: 0,
      })

      // Backfill SEO meta from the central map, preserving any meta the slice
      // already set (e.g. meta.image), so a slice that sets its own is never
      // overwritten field-for-field.
      const seo = META_BY_SLUG[data.slug]
      if (seo) {
        const existingMeta = (data as { meta?: Record<string, unknown> }).meta
        ;(data as { meta?: Record<string, unknown> }).meta = { ...seo, ...existingMeta }
      }

      // Payload only auto-stamps publishedAt on an actual draft->published
      // transition; re-running this upsert against an already-published doc
      // never backfills one that's missing, so stamp it here instead.
      const needsPublishedAt =
        data._status === 'published' && !data.publishedAt && !existing.docs[0]?.publishedAt
      const pageData = needsPublishedAt
        ? { ...data, publishedAt: existing.docs[0]?.createdAt ?? new Date().toISOString() }
        : data

      if (existing.docs[0]) {
        await payload.update({
          collection: 'pages',
          id: existing.docs[0].id,
          data: pageData,
          context,
        })
        payload.logger.info(`Updated page /${data.slug}`)
      } else {
        await payload.create({ collection: 'pages', data: pageData, context })
        payload.logger.info(`Created page /${data.slug}`)
      }
    }
  }

  payload.logger.info('Page seed complete.')
  // Flush pending storage writes before exiting. Media uploads to S3 resolve on
  // Payload's connection handles; process.exit() otherwise kills them in flight
  // and only the first file reaches the bucket (the rest of the docs end up with
  // no object, so their size variants 404). destroy() drains them first.
  await payload.destroy()
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  const errs = err?.data?.errors
  if (errs) console.error('VALIDATION_DETAIL ' + JSON.stringify(errs, null, 2))
  process.exit(1)
})
