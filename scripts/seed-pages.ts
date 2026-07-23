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

import { SITE_NAME, EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME } from '../src/utilities/brand'
import { OUTSETA_REGISTER_HREF } from '../src/components/OutsetaRegisterLink'

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

// Bulleted list (Lexical): a `list` node of `listitem` children. `value` is the
// 1-based item index Lexical stores on each item.
const listItem = (value: string, i: number) => node('listitem', { value: i + 1 }, [text(value)])
const bulletList = (...items: string[]) =>
  node(
    'list',
    { listType: 'bullet', tag: 'ul', start: 1 },
    items.map((v, i) => listItem(v, i)),
  )

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

// Resolve a Media id by (partial) stored filename. Used for hero images whose
// source lives in the gitignored Photo Library (local-only): returns null when the
// object isn't in this DB (CI / prod-before-media-cutover) so the caller can fall back.
const findMediaByFilename = async (payload: Payload, base: string): Promise<number | null> => {
  const res = await payload.find({
    collection: 'media',
    where: { filename: { like: base } },
    limit: 1,
    depth: 0,
  })
  return (res.docs[0]?.id as number | undefined) ?? null
}

// Upsert a form-builder `forms` doc by title; returns its id. Upsert (not
// create-only) so re-running seed:pages after changing EMAIL_FROM_ADDRESS /
// CONTACT_INBOX_EMAIL re-bakes the new sender/recipient into the form's emails —
// same "code is authoritative" model as the page upserts below.
const ensureForm = async (
  payload: Payload,
  data: RequiredDataFromCollectionSlug<'forms'>,
): Promise<number> => {
  const existing = await payload.find({
    collection: 'forms',
    where: { title: { equals: data.title } },
    limit: 1,
    depth: 0,
  })
  const found = existing.docs[0]?.id as number | undefined
  if (found != null) {
    await payload.update({ collection: 'forms', id: found, data })
    return found
  }
  const created = await payload.create({ collection: 'forms', data })
  return created.id as number
}

// ---------------------------------------------------------------------------
// Page slices

const homeSlice: PageSlice = async (payload) => {
  // High Impact hero image — uploaded by ensureTrackedMedia (runs first) from
  // public/import/prose/cover.jpg; Payload converts uploads to WebP, so the
  // stored Media is cover.webp. Referenced here by its Media id.
  const cover = await payload.find({
    collection: 'media',
    where: { filename: { equals: 'cover.webp' } },
    limit: 1,
    depth: 0,
  })
  const coverId = cover.docs[0]?.id ?? null

  return [
    {
      slug: 'home',
      title: 'Home',
      _status: 'published',
      hero: {
        type: 'highImpact',
        media: coverId,
        richText: richText(
          heading('Building bridges between law enforcement and communities', 'h1'),
          paragraph(
            'Muslim American Police Society brings together active and retired officers dedicated to serving with integrity. We foster understanding, mentor the next generation, and strengthen the bonds that hold our communities together.',
          ),
        ),
        links: [ctaLink('Learn more', '/about-us'), ctaLink('Join us', '/join', 'outline')],
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
}

// About Us — rebuilt from the source page (About Us / What We Do / Join Us) with
// our own blocks: a LowImpact hero, a 3-card CardGrid, and a CTA. Copy mirrors the
// source. Body lives in the Pages collection (editable in admin), not in a component.
const aboutUsSlice: PageSlice = async (_payload) => [
  {
    slug: 'about-us',
    title: 'About Us',
    _status: 'published',
    hero: {
      type: 'lowImpact',
      eyebrow: 'Who we are',
      richText: richText(
        heading('About Us', 'h1'),
        paragraph(
          'We are a public service organization committed to serving the dynamic and diverse communities within the State of New Jersey. Our membership is comprised of law enforcement officers at the federal, state, county, and municipal levels.',
        ),
      ),
      links: [
        ctaLink('Our mission', '/about-us/mission'),
        ctaLink('Meet our leadership', '/about-us/leadership', 'outline'),
      ],
    },
    layout: [
      {
        blockType: 'cardGrid',
        header: {
          enableHeader: true,
          eyebrow: 'NJMOS',
          heading: 'What We Do',
          anchorId: 'what-we-do',
        },
        columns: '3',
        mediaType: 'none',
        items: [
          {
            heading: 'Community Outreach',
            lucideIcon: 'megaphone',
            body: richText(
              paragraph(
                'Fostering a positive and productive relationship that benefits both communities and strengthens the fabric of our society.',
              ),
            ),
          },
          {
            heading: 'Empowering Future Leaders',
            lucideIcon: 'star',
            body: richText(
              paragraph(
                'Establishing robust mentorship initiatives for young men and women interested in a career path in law enforcement.',
              ),
            ),
          },
          {
            heading: 'Creating Strong Connections',
            lucideIcon: 'network',
            body: richText(
              paragraph(
                'Building camaraderie, mutual support, and unity among our members — essential to the success of our organization.',
              ),
            ),
          },
        ],
      },
      {
        blockType: 'cta',
        richText: richText(
          heading('Join Us', 'h2'),
          paragraph(
            'Join our nonprofit organization today. Together we can create positive change and support those in need.',
          ),
        ),
        links: [ctaLink('Learn more', '/join')],
      },
    ],
  } as unknown as PageData,
  simplePage('about-us/mission', 'Mission', 'About Us', 'Placeholder mission statement.', [
    'Placeholder mission copy. State the organization’s mission in its own words.',
    'Placeholder values copy. List the values that guide the work.',
  ]),
]

// Committees — the same block shape as About Us (LowImpact hero + 3-card CardGrid
// + CTA). Each card is one committee: an intro line plus a bulleted list of its
// focus areas. National MAPS voice; icons are from the curated CardGrid set.
const committeesSlice: PageSlice = async (_payload) => [
  {
    slug: 'about-us/committees',
    title: 'Committees',
    _status: 'published',
    hero: {
      type: 'lowImpact',
      eyebrow: "How we're organized",
      richText: richText(
        heading('Committees', 'h1'),
        paragraph(
          'Muslim American Police Society is structured into committees, each owning a distinct area of focus so members can engage where they have the most impact.',
        ),
      ),
      links: [ctaLink('Become a member', '/join'), ctaLink('Contact us', '/contact', 'outline')],
    },
    layout: [
      {
        blockType: 'cardGrid',
        header: {
          enableHeader: true,
          eyebrow: 'MAPS',
          heading: 'Our Committees',
          anchorId: 'committees',
        },
        columns: '3',
        mediaType: 'none',
        items: [
          {
            heading: 'Community Outreach',
            lucideIcon: 'megaphone',
            body: richText(
              paragraph(
                'Builds trust between officers and the communities they serve through public engagement.',
              ),
              bulletList('Education and information', 'Event planning', 'Community partnerships'),
            ),
          },
          {
            heading: 'Membership Services',
            lucideIcon: 'users',
            body: richText(
              paragraph(
                'Supports members across their careers, from recruitment through leadership.',
              ),
              bulletList('Recruiting and onboarding', 'Mentoring', 'Scholarships', 'Member events'),
            ),
          },
          {
            heading: 'Business Development',
            lucideIcon: 'briefcase',
            body: richText(
              paragraph('Grows the resources that sustain the organization and its programs.'),
              bulletList('Corporate partnerships', 'Sponsorships', 'Fundraising'),
            ),
          },
        ],
      },
      {
        blockType: 'cta',
        richText: richText(
          heading('Get involved', 'h2'),
          paragraph(
            'Every committee is powered by members who give their time. Join us and help lead the work.',
          ),
        ),
        links: [ctaLink('Become a member', '/join')],
      },
    ],
  } as unknown as PageData,
]

// Leadership — renders the `team` collection through the Team block (grouped,
// airy) under About Us. The hero carries the page title; the grouped layout
// labels each category section (e.g. "Executive Board"), so the block's own
// header is left off to avoid a redundant heading. Sourced from the collection,
// so editing a member in admin updates this page with no reseed.
const leadershipSlice: PageSlice = async (_payload) => [
  {
    slug: 'about-us/leadership',
    title: 'Leadership',
    _status: 'published',
    hero: {
      type: 'lowImpact',
      eyebrow: 'About Us',
      richText: richText(
        heading('Leadership', 'h1'),
        paragraph(
          'The Executive Board members whose leadership, expertise, and dedication drive our mission forward.',
        ),
      ),
      links: [],
    },
    layout: [
      {
        blockType: 'team',
        header: { enableHeader: false, anchorId: 'team' },
        layout: 'grouped',
        density: 'airy',
        populateBy: 'collection',
        categories: [],
        limit: 0,
      },
    ],
  } as unknown as PageData,
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

// Placeholder Resources hub + children — seeded so the header Resources
// mega-menu (src/Header/seedNav.ts) doesn't ship dead links. Replace with the
// org's real resource pages, or delete this slice and the nav group together.
const resourcesSlice: PageSlice = async (_payload) => [
  simplePage(
    'resources',
    'Resources',
    SITE_NAME,
    'Placeholder overview of resources available to members and the public.',
    [
      'Placeholder resources copy. Describe the material the organization publishes and links out to below.',
    ],
  ),
  simplePage('resources/faq', 'FAQ', 'Resources', 'Placeholder frequently asked questions.', [
    'Placeholder FAQ copy. Add common questions and answers here.',
  ]),
  simplePage('resources/media', 'Media', 'Resources', 'Placeholder media resources.', [
    'Placeholder media copy. Add photos, videos, or press material here.',
  ]),
  simplePage(
    'resources/publications',
    'Publications',
    'Resources',
    'Placeholder publications listing.',
    ['Placeholder publications copy. List reports, newsletters, or other documents here.'],
  ),
]

// Join — membership page rebuilt from the source "Membership Opportunities" page
// with our own blocks: a hero, a two-tier PricingTiers, and a closing CTA. Copy is
// generalized to national MAPS (the source was NJ-specific). Tier + hero CTAs use
// the Outseta-register sentinel href (see OutsetaRegisterLink / CMSLink). The hero
// photo lives in the local-only Photo Library, so it is resolved by filename with a
// LowImpact fallback for CI / prod-before-media-cutover.
const JOIN_HERO_PHOTO = '1080925567501035' // Photo Library: diverse officer group shot
const joinCta = (label: string) => ctaLink(label, OUTSETA_REGISTER_HREF)

const joinSlice: PageSlice = async (payload) => {
  const heroId = await findMediaByFilename(payload, JOIN_HERO_PHOTO)
  const heroLead =
    'Join a national community of Muslim law enforcement officers and civilian support staff serving with integrity. Your membership strengthens our mentorship, outreach, and the bonds that hold our communities together.'
  const hero = heroId
    ? {
        type: 'highImpact',
        media: heroId,
        richText: richText(heading('Become a Member', 'h1'), paragraph(heroLead)),
        links: [joinCta('Join now')],
      }
    : {
        type: 'lowImpact',
        eyebrow: 'Join MAPS',
        richText: richText(heading('Become a Member', 'h1'), paragraph(heroLead)),
        links: [joinCta('Join now')],
      }

  return [
    {
      slug: 'join',
      title: 'Join',
      _status: 'published',
      hero,
      layout: [
        {
          blockType: 'pricingTiers',
          header: {
            enableHeader: true,
            heading: 'Membership',
            body: richText(
              paragraph(
                'Two ways to belong, each contributing uniquely to our mission and amplifying our collective impact in the community.',
              ),
            ),
            anchorId: 'membership',
          },
          columns: '2',
          plans: [
            {
              name: 'Regular Membership',
              description:
                'Open to all sworn full-time, part-time, or retired Muslim law enforcement officers in good standing with their respective agencies.',
              features: [
                { feature: 'Full voting rights in the organization' },
                { feature: 'Mentorship and professional networking' },
                { feature: 'Community outreach and member events' },
              ],
              featured: true,
              links: [joinCta('Join now')],
            },
            {
              name: 'Supporting Membership',
              description:
                'Open to all full-time, part-time, or retired Muslim civilian support staff of a law enforcement agency in good standing.',
              features: [
                { feature: 'Networking with members nationwide' },
                { feature: 'Invitations to events and programs' },
                { feature: 'Support the mission and community' },
              ],
              links: [joinCta('Join now')],
            },
          ],
        },
        {
          blockType: 'cta',
          richText: richText(
            heading('Ready to serve with us?', 'h2'),
            paragraph(
              'Become part of a growing national network of officers and support staff. Questions about membership? Get in touch.',
            ),
          ),
          links: [joinCta('Join now'), ctaLink('Contact us', '/contact', 'outline')],
        },
      ],
    } as unknown as PageData,
  ]
}

// Seeded only because DONATE_CTA in src/utilities/brand.ts puts a /donate button
// in the header. If this org has no donation flow, delete this slice AND the
// button from DesktopNav/NavMenu (see the note on DONATE_CTA).
const donateSlice: PageSlice = async (_payload) => [
  simplePage('donate', 'Donate', SITE_NAME, 'Placeholder donation page.', [
    'Placeholder donation copy. Add the org’s giving options, or remove this page and the header Donate button if there is no donation flow.',
  ]),
]

// Contact form (form-builder). Fields mirror the source contact page; the
// notification email is delivered by the Resend adapter (payload.config, gated on
// RESEND_API_KEY — console fallback until the key is set). Sender is EMAIL_FROM_*;
// recipient is CONTACT_INBOX_EMAIL, falling back to ADMIN_EMAIL. Baked into the
// doc at seed time, so re-run seed:pages after changing those env vars.
const CONTACT_FORM = {
  title: 'Contact Form',
  submitButtonLabel: 'Submit',
  confirmationType: 'message',
  confirmationMessage: richText(
    heading("Thanks — your message has been received. We'll be in touch soon.", 'h3'),
  ),
  fields: [
    {
      name: 'name',
      blockName: 'name',
      blockType: 'text',
      label: 'Full Name',
      required: true,
      width: 100,
    },
    {
      name: 'email',
      blockName: 'email',
      blockType: 'email',
      label: 'Email',
      required: true,
      width: 100,
    },
    {
      name: 'phone',
      blockName: 'phone',
      blockType: 'text',
      label: 'Phone',
      required: false,
      width: 100,
    },
    {
      name: 'message',
      blockName: 'message',
      blockType: 'textarea',
      label: 'Message',
      required: true,
      width: 100,
    },
  ],
  emails: [
    {
      emailTo: process.env.CONTACT_INBOX_EMAIL || process.env.ADMIN_EMAIL || EMAIL_FROM_ADDRESS,
      emailFrom: `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>`,
      replyTo: '{{email}}',
      subject: 'New contact form submission from {{name}}',
      message: richText(
        paragraph('Name: {{name}}'),
        paragraph('Email: {{email}}'),
        paragraph('Phone: {{phone}}'),
        paragraph('Message: {{message}}'),
      ),
    },
  ],
} as unknown as RequiredDataFromCollectionSlug<'forms'>

const contactSlice: PageSlice = async (payload) => {
  const formId = await ensureForm(payload, CONTACT_FORM)
  return [
    {
      slug: 'contact',
      title: 'Contact',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Get in touch',
        richText: richText(
          heading('Contact Us', 'h1'),
          paragraph("We'd love to hear from you. Send us a message and we'll be in touch."),
        ),
      },
      layout: [
        {
          blockType: 'formBlock',
          enableIntro: false,
          form: formId,
        },
      ],
    } as unknown as PageData,
  ]
}

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
  committeesSlice,
  leadershipSlice,
  programsSlice,
  resourcesSlice,
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
      'A public service organization of Muslim American law enforcement officers serving communities across New Jersey.',
  },
  'about-us/mission': {
    title: 'Mission',
    description: 'Placeholder meta description. Summarize the mission statement.',
  },
  'about-us/leadership': {
    title: 'Leadership',
    description: 'Meet the Executive Board of ' + SITE_NAME + '.',
  },
  'about-us/committees': {
    title: 'Committees',
    description: 'The committees of ' + SITE_NAME + ' and the focus areas each one leads.',
  },
  programs: {
    title: 'Programs',
    description: 'Placeholder meta description. Summarize the programs offered to members.',
  },
  join: {
    title: 'Join',
    description:
      'Membership in ' +
      SITE_NAME +
      ' is open to Muslim law enforcement officers and civilian support staff nationwide.',
  },
  contact: {
    title: 'Contact',
    description: 'Get in touch with ' + SITE_NAME + ' — send us a message and we will be in touch.',
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
