/**
 * Canonical page-seed runner (issue #80).
 *
 * After the destructive admin "seed database" button only home + contact exist.
 * This script idempotently upserts the full assembled-page set — run it after
 * every admin re-seed:
 *
 *   npm run seed:pages
 *
 * Adding a new page: push one PageSlice into PAGE_SLICES below. A slice is an
 * async factory that receives the Payload instance (so it can resolve IDs) and
 * returns an array of page definitions. The runner upserts each by slug.
 */

import 'dotenv/config'

import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'

import configPromise from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import type { Payload } from 'payload'

type PageData = RequiredDataFromCollectionSlug<'pages'>

type PageSlice = (payload: Payload) => Promise<PageData[]>

// ---------------------------------------------------------------------------
// Helpers shared by all slices

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
// Blockquote (Lexical 'quote' node) — scriptural/attributed citations.
const italic = (value: string) => ({ ...text(value), format: 2 })
const blockquote = (...children: unknown[]) => node('quote', {}, children)

// ---------------------------------------------------------------------------
// Slice: about-us roster pages (migrated from scripts/seed-about-pages.ts)

const aboutUsSlice: PageSlice = async (payload) => {
  const cats = await payload.find({ collection: 'team-categories', limit: 0, depth: 0 })
  const idBySlug = new Map(cats.docs.map((c) => [c.slug, c.id]))
  const ids = (...slugs: string[]) =>
    slugs.map((s) => idBySlug.get(s)).filter((v): v is number => typeof v === 'number')

  const boardCats = ids(
    'board-of-directors',
    'board-deputy-directors',
    'specialists-committee-chairs',
    'board-committees-task-forces',
  )
  const advisoryCats = ids('advisory-council')
  const stateCats = cats.docs
    .filter((c) => c.slug.includes('state-committee') || c.slug === 'specialists-committee-chairs')
    .map((c) => c.id)

  const team = (
    layout: 'grouped' | 'tabs',
    density: 'airy' | 'medium' | 'compact',
    categories: number[],
  ) =>
    ({
      blockType: 'team',
      layout,
      density,
      populateBy: 'collection',
      categories,
      limit: 0,
      header: { enableHeader: false },
    }) as unknown as PageData['layout'][number]

  return [
    {
      slug: 'about-us/board-leadership',
      title: 'Board & Leadership',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'About Us',
        richText: richText(
          heading('Board & Leadership'),
          paragraph(
            'Muslim Americans in Public Service is managed by a Board of Directors, supported by Deputy Directors, organizational specialists, Board Committees, and State Committees for sub-national member and policy coordination.',
          ),
          paragraph(
            'Officers act in the long-term best interest of MAPS National; support and expand the MAPS membership; and help develop or execute activities, programs, and services on their behalf that are in line with the three MAPS mission objectives and values.',
          ),
          paragraph(
            'Meet our leaders, read more about their distinguished public service careers, and reach out directly or follow them on social media below.',
          ),
        ),
      },
      layout: [team('grouped', 'medium', boardCats)],
    },
    {
      slug: 'about-us/advisory-council',
      title: 'Advisory Council',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'About Us',
        richText: richText(
          heading('Advisory Council'),
          paragraph(
            'The MAPS Advisory Council is a standing, non-decision-making body composed of accomplished professionals and trailblazers who support the mission, goals and values of the organization.',
          ),
          paragraph(
            'Advisory Council members make recommendations, provide general guidance, and serve as organizational resources to the Board and professional resources to MAPS members. Advisory Council members participate in MAPS in their personal capacities.',
          ),
        ),
      },
      layout: [team('grouped', 'airy', advisoryCats)],
    },
    {
      slug: 'about-us/state-committees',
      title: 'State Committees',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'About Us',
        richText: richText(
          heading('State Committees'),
          paragraph(
            'State Committees help organize MAPS National members and local public servants, and represent MAPS among government officials within their respective States.',
          ),
          paragraph(
            'These local leaders are key to strengthening the MAPS National community while ensuring community and professional development are brought directly to local public servants where they live and work.',
          ),
        ),
      },
      layout: [team('tabs', 'compact', stateCats)],
    },
  ] as unknown as PageData[]
}

// ---------------------------------------------------------------------------
// Slice: Phase 4 block showcase (epic #64 — #71 / #72 / #73 page placement)
//
// The Testimonials and AcademyVideos collections are empty until the Phase 5
// import, so this slice first seeds a little sample data (idempotent by slug —
// #71 ships on hand-entered/seed data) and then places all three Phase 4 blocks
// on one published page. Full per-page placement is Phase 6 (epic #66); this
// just satisfies the "placed on at least one Page" acceptance for the blocks.

const quote = (value: string) => richText(paragraph(value))

const upsertBySlug = async (
  payload: Payload,
  collection: 'testimonials' | 'academy-videos' | 'video-categories',
  slug: string,
  data: Record<string, unknown>,
): Promise<number> => {
  const context = { disableRevalidate: true }
  const existing = await payload.find({
    collection,
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
  })
  const payload_ = { ...data, slug } as never
  if (existing.docs[0]) {
    await payload.update({ collection, id: existing.docs[0].id, data: payload_, context })
    return existing.docs[0].id as number
  }
  const created = await payload.create({ collection, data: payload_, context })
  return created.id as number
}

const phase4ShowcaseSlice: PageSlice = async (payload) => {
  // Testimonials — a mix of both types so the block's type filter has something
  // to scope.
  await upsertBySlug(payload, 'testimonials', 'amina-r', {
    author: 'Amina R.',
    role: 'Program graduate',
    type: 'programs',
    quote: quote(
      'The MAPS Academy gave me a roadmap into public service I didn’t know existed, and the network to act on it.',
    ),
  })
  await upsertBySlug(payload, 'testimonials', 'yusuf-k', {
    author: 'Yusuf K.',
    role: 'Federal fellow',
    type: 'career',
    quote: quote(
      'Help reconstructing my resume was the difference between an interview and a rejection. I start at the agency next month.',
    ),
  })
  await upsertBySlug(payload, 'testimonials', 'layla-h', {
    author: 'Layla H.',
    role: 'Policy analyst',
    type: 'career',
    quote: quote(
      'I came in unsure how to translate my background into a government role. I left with a plan and three referrals.',
    ),
  })

  // Academy videos under two categories.
  const fundamentals = await upsertBySlug(payload, 'video-categories', 'fundamentals', {
    title: 'Fundamentals & Career Entry',
    order: 0,
  })
  const pathways = await upsertBySlug(payload, 'video-categories', 'pathways', {
    title: 'Executive & Senior Pathways',
    order: 1,
  })
  await upsertBySlug(payload, 'academy-videos', 'cfr-fellowship-info-session', {
    title: 'Pipelines into Foreign Policy: CFR Fellowship & Term Member Programs',
    videoUrl: 'https://www.youtube.com/watch?v=9brMSH0HuBc',
    description:
      'An info session on the Council on Foreign Relations fellowship and term-member tracks.',
    categories: [pathways],
    order: 0,
  })
  await upsertBySlug(payload, 'academy-videos', 'breaking-into-public-service', {
    title: 'Breaking into Public Service: Where to Start',
    videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
    description: 'The entry points, timelines, and first moves for a public-service career.',
    categories: [fundamentals],
    order: 1,
  })

  // Sample posts ("Latest Updates"). The collection is empty until the Phase 5
  // CSV import, which reads the gitignored migration export, so a clean checkout
  // or CI has zero posts and the latest-updates archive renders empty. Seed a
  // couple of published fixtures (idempotent by slug) so the archive lists posts
  // and a post detail resolves. The first slug/title is the one the e2e posts
  // specs assert against.
  // Resolve a pre-imported Media id by filename (ensureTrackedMedia ran first).
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
  // Posts now require exactly one category, and a fresh/CI DB has none (Post
  // categories come from the gitignored `updates` import). Ensure a general one
  // exists so the seeded fixtures satisfy the requirement. Idempotent by slug.
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
    // muted-foreground-on-muted (#83807f on #f2f2f2 = 3.5:1) fails AA contrast
    // and trips the a11y e2e on any page that lists these posts (home strip).
    // The Card reads meta.image; PostHero's flyer slot reads heroImage and
    // requires a square (1:1) source, so it's a separate — already-square —
    // tracked asset rather than reusing the (non-square) card photo.
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
    'maps-academy-climbing-the-federal-ladder',
    'MAPS Academy: Climbing the Federal Ladder',
    'A MAPS Academy session on advancing within federal service, covering promotion timelines, the senior pathways, and how members have moved from entry roles into leadership.',
    '4_1.webp',
    '4_2.webp',
    // Inline member-gated links so the #250 e2e has body content to assert against:
    // anonymous readers get the placeholder, members get the real link. One /members
    // portal link and one Luma event link (both gated).
    [
      node('paragraph', {}, [
        text('RSVP via the '),
        linkNode('event link', '/members/portal'),
        text(' in the MAPS Member Portal, or on '),
        linkNode('Luma', 'https://luma.com/maps-networking'),
        text('.'),
      ]),
    ],
  )
  await upsertPost(
    'breaking-into-public-service',
    'Breaking into Public Service: Where to Start',
    'The entry points, timelines, and first moves for a public-service career, drawn from the MAPS Academy onboarding session.',
    '5_1.webp',
    '8.webp',
  )

  // The /phase-4-blocks showcase page was migration scaffolding to satisfy the
  // "block placed on at least one Page" acceptance; the blocks now live on real
  // pages, so the page is gone. This slice still seeds the sample collection data
  // above (testimonials, academy videos) that other pages query.
  return [] as unknown as PageData[]
}

// ---------------------------------------------------------------------------
// Registry — add new slices here

// ---------------------------------------------------------------------------
// Phase 6 page slices (epic #66) — generated, then adversarially verified.
// ---------------------------------------------------------------------------

const aboutUsFaqSlice: PageSlice = async (_payload) => {
  const qa = (group: string, question: string, ...answer: string[]) => ({
    group,
    question,
    answer: richText(...answer.map((p) => paragraph(p))),
    defaultOpen: false,
  })

  const items = [
    qa(
      'Membership',
      'Where do you get members from?',
      'MAPS’ membership can only be accessed through the form on our website. Our membership policy is 100% opt-in to ensure consent is affirmatively established and that member information and preferences are self-selected and identified.',
    ),
    qa(
      'Membership',
      "Membership is free? What's the catch?",
      'There is no catch. MAPS is a grassroots effort to build and support the national community of Muslim Americans in public service/ government. We do this because we are Muslim American public servants, ourselves. We represent a range of backgrounds, career tracks, levels and branches of government, and we have found the individual and institutional support along our careers minimal or inaccessible. We feel not only that we can do better, but that supporting pipelines into service for underserved and underrepresented groups is key to improving outcomes for all, and ensuring that American government looks like America.',
    ),
    qa(
      'Membership',
      'How does MAPS define “Muslim”?',
      'MAPS does not define or characterize Muslim American communities or individuals along theological or sectarian lines. Anyone who self-identifies as Muslim is accepted as such. While MAPS aims to support professional needs of our broader community, we defer to our member’s own respective clergy or faith traditions to serve their spiritual needs.',
    ),
    qa(
      'Membership',
      "Am I welcome if I'm not Muslim?",
      'MAPS and its members regularly engage with non-Muslim colleagues, counterparts, allies, partner networks, and coalitions. They also constitute a highly supportive cadre that MAPS engages as Affiliates.',
    ),
    qa(
      'Membership',
      'Does MAPS accept members from foreign countries?',
      'No. MAPS does not accept foreign nationals as members, associate members, or affiliates, which are limited to U.S. citizens, legal permanent residents or individuals who are within six months of obtaining either. However, all are welcome to follow MAPS via our general mailing list of non-members.',
    ),
    qa(
      'Membership',
      'Without member dues, how does MAPS track who is still affiliated?',
      'As MAPS does not collect member dues, unsubscribing from the MAPS email list entails the termination of your membership or affiliation.',
    ),
    qa(
      'Membership',
      'How can I invite individuals from my network to MAPS?',
      'We ask all to register via our website so they can be properly categorized while still being supported. From there, all distribution channels, event registration and chat group links are shared directly or upon request. We ask members not to share the messaging chat or member event registration links with friends or colleagues who are not yet registered via our website. This is both for the comfort and protection of our membership, as well as organizational management.',
    ),
    qa(
      'Privacy',
      'What does MAPS do with my information?',
      'MAPS will never share your information with any external entities without your permission or self-selection. Information shared with potential employers is only done with the express permission of our members. While MAPS also has a very active service connecting individuals internal and external to MAPS with our members, this is always done with the requested segment or identified group of members messaged in blind carbon copy to protect their privacy and preferred degree of engagement. For additional security, our full member list is only accessible by the MAPS Chair and Membership Director.',
    ),
    qa(
      'Privacy',
      'Who may contact me?',
      'The MAPS Chair and Membership Director would most often serve as active points of contact for the organization, but other Board Directors may reach out to members or segments of members that have self-identified as qualified or interested in specific services, volunteer or leadership opportunities within the organization.',
    ),
    qa(
      'Privacy',
      'Do MAPS Chapter Federal ERGs share membership information with MAPS National?',
      'As MAPS State Committees are part of MAPS National, our Federal chapter ERGs are Departmental staff associations led by employees who are also MAPS National members. While MAPS National connects members within their Federal, State or local government agencies to one another in service of our mission of community building and formalization, our chapter ERGs’ membership lists are not shared with MAPS National.',
      'MAPS’ membership policy is 100% opt-in to ensure consent is affirmatively established and that member information and preferences are self-selected and identified.',
    ),
    qa(
      'Chapters (Federal ERGs, State Committees)',
      'How can I start or join a MAPS Chapter ERGs at Federal, State or Local Government?',
      'Several chapter employee resource groups are now well established, many with several years of community building and member support within their respective Federal Departments. Many more are currently being formed or awaiting recognition, with additional chapters in development at the State or local government levels.',
      'The process for forming one can be straightforward or cumbersome, depending on the Department and the Agency overseeing the process. There have been many improvements in the process and resources devoted to Federal accommodation, but they are far from standard and may vary between Agencies. MAPS devotes plenty of resources and focus on nurturing and supporting its chapter ERGs, and would be happy to work with you or connect you to others at your agency working diligently to build these key staff associations. The first step is to connect with our Outreach team that oversees organizational support and partnerships via outreach@mapsnational.org.',
    ),
    qa(
      'Chapters (Federal ERGs, State Committees)',
      'Are MAPS Federal ERG Chapters open to contractors? Non-MAPS members?',
      'While MAPS State Committees are officially incorporated within MAPS National, our Federal chapter ERGs are led by MAPS members but are open to all employees and contractors within their respective Federal, State or local government institutions.',
    ),
    qa(
      'Programming',
      'How often does MAPS hold virtual or in person events?',
      'For some years now, based on experimentation and its current capabilities, MAPS National holds 3 major in-person events each year; an annual DC Iftar and summer and winter networking events. The summer networking event works to incorporate and accommodate Muslim American interns and young professionals in DC, while the winter networking event leans more toward engaging and connecting Federal staff associations and MAPS chapter employee resource groups across the executive branch.',
      'Apart from our 3 main events, MAPS National also organizes public service panels at many major Muslim community and partner events, conferences and conventions, including the annual MAS-ICNA Convention, the National Association of Muslim Lawyers (NAML) Conference, Arab American Anti-Discrimination Conference, and many others. Our State committees usually organize at least one in-person event per year, based on their capabilities and member needs.',
    ),
    qa(
      'Scope & Focus',
      'Does MAPS take positions on or work with partisan or foreign policy organizations?',
      'As a nonpartisan nonprofit organization registered as a 501c(3), MAPS does not engage in political activity. MAPS also limits its active policy and advocacy activities to issues that affect Muslim American public servants and public sector employees across all levels and branches of government.',
      'As our core focus, MAPS serves as a leading voice for the advancement and promotion of diversity, equity, inclusion, accessibility, and religious accommodation in government.',
      'Other areas of domestic and foreign policy, while important or even central to the broader Muslim American community, remain largely out of our organizational scope and policy focus. MAPS urges its members and allies to engage dedicated organizations for such activities, including many of our Partner organizations.',
    ),
    qa(
      'Funding',
      'How is MAPS funded?',
      'Since MAPS does not charge member dues, its National and State functions are primarily funded by Muslim American foundations, national public service focused foundations and non-profit organizations, and State Commissions. We also collect tax-deductible donations from our own members and supporters, and sizable in-kind contributions from members, organizations and partners.',
    ),
    qa(
      'Funding',
      'Does MAPS receive funding from foreign sources?',
      'MAPS does not accept funding from foreign governments, foreign nationals, or foreign-based organizations.',
    ),
    qa(
      'Funding',
      'Does MAPS offer grant funding or other financial support?',
      'MAPS does not typically fund external activities or events and programs where it is not a primary organizer. Nor does it fund or sponsor individuals at this time. Our value add for organizational co-sponsorship is more often access to our specialized national community of Muslim American public servants or a regional or technical subset thereof. Similarly, our value add for professionals and students are non-financial resources, including knowledge transfer, networking, skill development, and access to key public service networks.',
    ),
  ]

  return [
    {
      slug: 'about-us/faq',
      title: 'FAQ',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'About Us',
        richText: richText(
          heading('Frequently Asked Questions'),
          paragraph(
            'MAPS compiles answers to some of our most frequently asked questions on our organization, membership, funding, advocacy, programming, and other areas, below.',
          ),
        ),
      },
      layout: [
        {
          blockType: 'faq',
          layout: 'stacked',
          header: {
            enableHeader: true,
            eyebrow: 'Support',
            heading: 'Frequently Asked Questions',
            body: richText(
              paragraph(
                'MAPS compiles answers to some of our most frequently asked questions on our organization, membership, funding, advocacy, programming, and other areas, below.',
              ),
            ),
            links: [
              {
                link: {
                  type: 'custom',
                  url: '/contact',
                  label: 'Contact',
                  appearance: 'outline',
                  newTab: false,
                },
              },
            ],
            anchorId: 'faq',
          },
          items,
        },
        {
          blockType: 'cta',
          richText: richText(
            heading('Still have questions?', 'h4'),
            node('paragraph', {}, [
              text('Learn more about our '),
              linkNode('Programs', '/programs'),
              text(', benefit from our shared Resources, meet our '),
              linkNode('Leadership Team', '/about-us/board-leadership'),
              text(', support our work with a tax-deductible '),
              linkNode('Donation', '/donate'),
              text(', explore organizational '),
              linkNode('Partnerships', '/about-us/partners'),
              text(', and Sign Up as a Member/Associate Member, or join our Mailing List today.'),
            ]),
          ),
          links: [
            {
              link: {
                type: 'custom',
                url: '/contact',
                label: 'Contact',
                appearance: 'outline',
                newTab: false,
              },
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const missionSlice: PageSlice = async (payload) => {
  // Resolve a re-hosted prose image to its Media doc id by filename. If it isn't
  // in Media yet, create it from the tracked source under public/import/prose so
  // a fresh DB (where `import:prose` hasn't run, or for photos added outside the
  // Webflow export) still gets the image. Returns null (and warns) only when no
  // source file exists, so callers can gracefully drop the gallery.
  const mediaId = async (filename: string, alt: string): Promise<number | null> => {
    const res = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    const id = res.docs[0]?.id
    if (typeof id === 'number') return id

    const source = path.join(process.cwd(), 'public/import/prose', filename)
    if (existsSync(source)) {
      const data = await readFile(source)
      const created = await payload.create({
        collection: 'media',
        data: { alt: alt || filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') },
        file: { name: filename, data, mimetype: 'image/webp', size: data.length },
      })
      payload.logger.info(`mission: created media "${filename}" from tracked source`)
      return created.id
    }
    payload.logger.warn(`mission: media "${filename}" not found — omitting from gallery`)
    return null
  }

  // Content block helper: one full-width prose column.
  const proseColumn = (...children: unknown[]) => ({
    size: 'full',
    richText: richText(...children),
    enableLink: false,
  })

  // Gallery images (re-hosted by the prose import under public/import/prose).
  const galleryFiles = [
    { file: '32.webp', caption: 'MAPS National community gathering' },
    { file: '17.webp', caption: 'Members at a MAPS networking event' },
    { file: '103.webp', caption: 'MAPS public-service professionals' },
    { file: '69.webp', caption: 'MAPS chapter event' },
    { file: '95.webp', caption: 'MAPS community in Washington, DC' },
    { file: '4_2.webp', caption: 'MAPS members connecting' },
    { file: '14.webp', caption: 'MAPS National event' },
    { file: 'community-georgetown-panel.webp', caption: 'MAPS panel discussion at Georgetown Law' },
    { file: 'community-doj.webp', caption: 'MAPS members at the U.S. Department of Justice' },
  ]
  const galleryImages = (
    await Promise.all(
      galleryFiles.map(async ({ file, caption }) => {
        const id = await mediaId(file, caption)
        return id ? { image: id, caption } : null
      }),
    )
  ).filter((row): row is { image: number; caption: string } => row !== null)

  const layout: PageData['layout'] = []

  // Gallery (catalog: Gallery → mediaGrid). Omit entirely if no images resolved.
  if (galleryImages.length > 0) {
    layout.push({
      blockType: 'mediaGrid',
      heading: 'MAPS in the community',
      columns: '3',
      density: 'compact',
      enableLightbox: true,
      images: galleryImages,
    } as unknown as PageData['layout'][number])
  }

  // Mission prose (catalog: prose sections → Content).
  layout.push({
    blockType: 'content',
    columns: [
      proseColumn(
        heading('Mission', 'h2'),
        paragraph(
          'Career Support: We expand professional capacity and cultivate the next generation of American Muslim public service leaders. MAPS creates and promotes skill development, professional networking, mentorship, career education and advancement resources among members and within MAPS chapters and partners. Broadening pipelines into public service is critical to not only MAPS, but our broader mission as American public servants. MAPS also shares resources and engages and partners with government agencies and local and national service organizations to ensure Muslim American young professionals are part of the national efforts to build a public service workforce that looks like America.',
        ),
        paragraph(
          'Community Building: We build community across government and civil society. MAPS fosters thriving and open communities and serves as a connector among Muslim American public servants within all branches and levels of government. MAPS is committed to sharing resources to public servants interested in forming new employee-led organizations, or regional MAPS chapters at their public institutions or local communities, and support and coordinate existing Muslim employee and professional associations and their programs and activities.',
        ),
        paragraph(
          'Workplace Development: We support conducive workplaces to unlock potential by advancing understanding and accommodation in the public sector. MAPS facilitates inclusive spaces for Muslim American public service professionals and promotes their further contributions and achievements. MAPS serves as a strategic partner in fostering a culture of respect, understanding, and accommodation within public institutions and will support existing institutional efforts to maintain safe workplaces free of discrimination.',
        ),
      ),
      proseColumn(
        heading('Values', 'h2'),
        paragraph(
          'MAPS believes that the United States is enriched by the contributions of Muslim Americans and other people of faith. A more inclusive Federal, State and local workforce strengthens the institutions they serve and ultimately, the American public, by providing a broad range of skills and a diversity of experiences and perspectives.',
        ),
        paragraph(
          'MAPS draws from Islamic faith traditions to promote the values of public service, freedom of religion, community building, and partnership and solidarity, while adhering to the additional values of inclusion, confidentiality, and neutrality.',
        ),
        heading('1. Public Service', 'h4'),
        paragraph(
          'MAPS Members have made service to others a core part of their careers, their lives, and in many cases, their identity. They volunteer for their communities, offer support to those in need of it, and devote years to crafting, building, or improving national, state, or local programs, policies, and services. Supporting their work, and ushering others toward it, is a prime function of MAPS, and is rooted in faith traditions and examples.',
        ),
        blockquote(
          text('“The best of people are those who are most beneficial to people” ('),
          italic('Hadith'),
          text(' of the Prophet Muhammad, Al-Tabarani, Al-Mu’jam Al-Awsaṭ, 5937)'),
        ),
        heading('2. Religious Freedom', 'h4'),
        paragraph(
          'As faith is a large part of the lives of countless Americans, the freedom to believe and practice authentically and without hindrance, discrimination, or persecution is a cornerstone of American democracy. Religious freedom, accommodation, tolerance and understanding are also key values of MAPS, its Members, and partner organizations. Members of MAPS are committed to public institutions that allow employees to observe their religious beliefs. Together, we can build stronger, more conducive, and just workplaces where the important functions of public service can be more effectively and productively undertaken for a broader segment of Americans.',
        ),
        blockquote(text('“There shall be no coercion in matters of faith.” (Quran 2:256);')),
        blockquote(text('“For you is your faith, and for me, my faith.” (Quran 109:6)')),
        heading('3. Community Building', 'h4'),
        paragraph(
          'Community building — the open and inclusive agglomeration of qualified professionals, channeling of resources toward their individual careers and interpersonal bonds, and facilitating and supporting formalized and communal action — is a daily function and priority of MAPS. It is how all of its goals and outcomes are made possible.',
        ),
        blockquote(
          text(
            '“Never will God change the condition of a people until they change it themselves,” (Quran 13:11);',
          ),
        ),
        blockquote(
          text(
            '“Help ye one another unto righteousness and piety. But help not one another unto sin and transgression,” (Quran 5:2);',
          ),
        ),
        blockquote(
          text(
            '“Whoever fulfills the needs of his brother, God will fulfill his needs; whoever removes the troubles of his brother, God will remove one of his troubles” (',
          ),
          italic('Hadith'),
          text(' of the Prophet Muhammad, Al-Bukhari, Chapter 47, Al-Mazalim, 2442).'),
        ),
        heading('4. Partnership & Solidarity', 'h4'),
        paragraph(
          'MAPS builds its community while actively supporting, engaging, and collaborating with its partners to advance shared goals while reducing redundant efforts or potential conflict. These include formal organizations, informal communities, national and local non-profits, Federal, State and local governments, and feeder networks with overlapping constituencies or objectives to mint the newest public service leaders of tomorrow.',
        ),
        blockquote(
          text(
            '“We have made you into nations and tribes, so that you may come to know one another.” (Quran 49:13)',
          ),
        ),
        heading('5. Broad-Based Inclusion', 'h4'),
        paragraph(
          'MAPS believes that the mission and community it serves are best represented by a diverse and inclusive membership and leadership, and that the success of the organization depends on broadening pipelines, casting wider nets, and considering and accommodating the full range of individuals within the Muslim American community. MAPS upholds and preserves a common identity as Muslim Americans over any particular national origin, ethnicity, race, sect, faith tradition or jurisprudence, so all have an opportunity to find community, career support, and the ultimate fulfillment of their potential as professionals and public servants.',
        ),
        paragraph(
          'Beyond inclusion based on identity, MAPS emphasizes merit over inclusion of the powerful, popular, or visible within our community; ensures professional and social access and opportunities are shared broadly and indiscriminately among the membership; and celebrates senior public servants, trailblazers, and leaders within our community who serve as resources to MAPS and its members.',
        ),
        heading('6. Security & Confidentiality', 'h4'),
        paragraph(
          'MAPS safeguards the confidentiality and data security of its membership and limits exposure of sensitive data and membership information to the general public where members have not opted in or elected to disclose publicly (such as attendance of public events, registration for a partner program, or affiliation on social media). MAPS never sells or shares membership data with external parties, and restricts internal access to full membership data.',
        ),
        heading('7. Neutrality & Focus', 'h4'),
        paragraph(
          'Apart from non-partisan restrictions under law, MAPS avoids unnecessary bias or perceptions of its membership or organization taking political stances, advocacy positions, leanings or affiliations beyond supporting, representing, or advocating for Muslim American public servants; other public servants, public service-oriented communities or affinity organizations; their professional circumstances or conditions; or public service in general.',
        ),
      ),
      proseColumn(
        heading('History', 'h2'),
        paragraph(
          'To best understand our work and where we hope to go together, it helps to know where we came from as an organization and national network, and the context and landscape that brought both about. MAPS has focused on targeting this combination of low transparency and minimalistic institutional support.',
        ),
        heading('Federal Representation', 'h4'),
        paragraph(
          'The need for greater transparency and institutional support led to the formation of MAPS. In 2020, recognizing the lack of representation for Muslim American public servants, the organization was established to bridge this gap. Looking ahead, MAPS aims to empower these professionals to contribute to a more equitable society.',
        ),
        heading('An Interagency Push & Formalization', 'h4'),
        paragraph(
          'The founders of MAPS recognized the need for a broader support network for Muslim employees across the Federal government. In 2020, they initiated efforts to establish Employee Resource Groups (ERGs) at the Department of Transportation and the Small Business Administration. By collaborating with leaders from existing Muslim staff associations, they laid the groundwork for MAPS, aiming to create a unified organization that would support Muslim public servants nationwide.',
        ),
        heading('Community Across all Branches and Levels of Government', 'h4'),
        paragraph(
          "The expansion to individual membership catalyzed MAPS' growth, addressing the need for a formal network supporting Muslim American public servants. Previously, informal gatherings within public institutions were limited and lacked accessibility. Recognizing this gap, MAPS founders worked to establish a national organization, culminating in its incorporation in January 2021. With its official launch in April 2021, MAPS envisions empowering Muslim public servants to contribute to a more equitable society.",
        ),
      ),
    ],
  } as unknown as PageData['layout'][number])

  // Timeline (catalog: Timeline → mission).
  layout.push({
    blockType: 'timeline',
    header: {
      enableHeader: true,
      heading: 'Timeline',
      body: richText(paragraph('Key milestones in the founding and growth of MAPS National.')),
      anchorId: 'timeline',
    },
    items: [
      {
        date: '2019',
        title: "DOT's first Muslim ERG",
        body: richText(
          paragraph(
            "Muslim Federal employees at the US Department of Transportation (DOT) apply to create Muslim Americans in Public Service, DOT's first Employee Resource Group (ERG) to support Muslim staff.",
          ),
        ),
      },
      {
        date: '2020',
        title: 'Planning a national network',
        body: richText(
          paragraph(
            'Leaders of the first and only four Muslim Federal staff associations meet to plan the creation of a national non-profit to support and connect Muslim Federal ERGs, expanding scope to cover individuals at all levels and branches of public service over the following nine months.',
          ),
        ),
      },
      {
        date: '2021',
        title: 'MAPS officially launches',
        body: richText(
          paragraph(
            'Muslim Americans in Public Service (MAPS) officially launches as the first national organization to support and represent all Muslims in American government.',
          ),
        ),
      },
      {
        date: '2022',
        title: 'First National Iftar & first State Committee',
        body: richText(
          paragraph(
            'MAPS National holds its first National Iftar in DC and its first semi-annual in-person DC Networking Event, and launches its first State Committee, MAPS-New York.',
          ),
        ),
      },
      {
        date: '2023',
        title: 'First State Iftar',
        body: richText(
          paragraph(
            'MAPS-Massachusetts organizes their inaugural City Hall Iftar — the first State Iftar.',
          ),
        ),
      },
    ],
  } as unknown as PageData['layout'][number])

  return [
    {
      slug: 'about-us/mission',
      title: 'Mission',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'About Us',
        richText: richText(
          heading('Mission, Values & History', 'h1'),
          paragraph(
            'Our mission is to support the career, community, and workplace development of Muslim American public servants and serve as a catalyst, resource, and force multiplier for the associations that represent and support them.',
          ),
          paragraph(
            'MAPS aims to expand and harness the rich, collective contributions of Muslim Americans across public service sectors to build a more just and equitable United States.',
          ),
        ),
        links: [
          { link: { type: 'custom', url: '/join', label: 'Join MAPS', appearance: 'default' } },
          { link: { type: 'custom', url: '/contact', label: 'Contact us', appearance: 'outline' } },
        ],
      },
      layout,
    },
  ] as unknown as PageData[]
}

const partnersSlice: PageSlice = async (payload) => {
  // --- Resolve partner-logo Media docs by filename at runtime --------------
  // Each entry: [Media filename, alt/name]. The files are copied into
  // public/import/partners (see assetsToCopy) and MUST be ingested as Media
  // docs (gap) so these filenames resolve. We only emit a LogoStrip item for
  // docs that actually exist, so the page degrades gracefully pre-ingest.
  // The Media pipeline converts every upload to WebP, so all logos are stored
  // as `<name>.webp` regardless of source extension (see scripts/rehost-images).
  // guidance.svg is omitted — SVG can't go through the WebP pipeline.
  const LOGO_FILENAMES: string[] = [
    'aafen.webp',
    'hops.webp',
    'mpac.webp',
    'isf.webp',
    'ai.webp',
    'ispu.webp',
    'uscmo.webp',
    'naml.webp',
    'cmsa.webp',
    'amt.webp',
    'mlsa.webp',
    'ia.webp',
    'mcn.webp',
    'coalition.webp',
    'elgl.webp',
    'equally-able.webp',
    'mwpn.webp',
    'logo-600px.webp',
    'amana.webp',
    'amba.webp',
    'maemsa.webp',
    'saldef.webp',
    'hhrd.webp',
    'gr.webp',
    'umma.webp',
    'minaret.webp',
    'cair.webp',
    'wcaps.webp',
    'amhp.webp',
    'muppies.webp',
    'poligon.webp',
    'sahara.webp',
    'de-lune.webp',
    'myna.webp',
  ]

  const mediaDocs = await payload.find({
    collection: 'media',
    where: { filename: { in: LOGO_FILENAMES } },
    limit: 0,
    depth: 0,
  })
  const idByFilename = new Map(
    mediaDocs.docs
      .filter((d): d is typeof d & { filename: string } => typeof d.filename === 'string')
      .map((d) => [d.filename, d.id]),
  )

  const logoItems = LOGO_FILENAMES.map((filename) => idByFilename.get(filename))
    .filter((id): id is number => typeof id === 'number')
    .map((id) => ({ logo: id, enableLink: false }))

  // --- Layout --------------------------------------------------------------
  const layout: PageData['layout'] = []

  // section_logo -> LogoStrip (grid). Only include when at least one logo
  // Media doc resolved; otherwise skip (the logos are a blocking gap).
  if (logoItems.length > 0) {
    layout.push({
      blockType: 'logoStrip',
      heading: 'Trusted by prominent organizations across the nation',
      layout: 'grid',
      items: logoItems,
    } as unknown as PageData['layout'][number])
  }

  // section_layout -> CardGrid: "Why Partner with MAPS?" intro + 4 benefit
  // cards. mediaType 'none' (source icons are a repeated decorative brand
  // favicon — see gaps). Two columns matches the source 2x2 right column.
  layout.push({
    blockType: 'cardGrid',
    header: {
      enableHeader: true,
      heading: 'Why Partner with MAPS?',
      body: richText(
        paragraph(
          'If your organization works on pipelines to or promotion of public service; professional or leadership development for historically underserved communities or vulnerable groups; civil liberties and civil rights; or support or represent Muslim American professionals or public servants, we would love to work with you.',
        ),
        paragraph(
          'To engage or partner with MAPS or its national membership, use the contact form below or contact MAPS’ Outreach Director at outreach@mapsnational.org.',
        ),
      ),
      anchorId: 'why-partner',
    },
    columns: '2',
    mediaType: 'none',
    items: [
      {
        heading: 'Shared Resources',
        body: richText(
          paragraph(
            'Share resources, contacts and volunteers among our respective organizations and membership towards speaker series, podcasts, panels, career information sessions, and professional mentorship.',
          ),
        ),
        enableCardLink: false,
      },
      {
        heading: 'Talent Pipelines',
        body: richText(
          paragraph(
            'Collaborate on developing recurring or one-time joint co-sponsored programs or new services for your membership and networks, collaborating on efforts and initiatives to collect and promote qualified candidates for public service appointments and professional opportunities, and professional development programs and activities.',
          ),
        ),
        enableCardLink: false,
      },
      {
        heading: 'Early Career Outreach',
        body: richText(
          paragraph(
            'Partner on youth outreach activities; identifying and promoting government internship or fellowship programs; public or member-only professional networking programs and events.',
          ),
        ),
        enableCardLink: false,
      },
      {
        heading: 'Policy Advocacy',
        body: richText(
          paragraph(
            'Organize on policy reforms and advocacy efforts to increase, improve, or promote racial, ethnic, and religious minority representation, accommodation, and inclusion in public service and public policy, and combat discrimination in the workplace.',
          ),
        ),
        enableCardLink: false,
      },
    ],
  } as unknown as PageData['layout'][number])

  return [
    {
      slug: 'about-us/partners',
      title: 'Partners',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'About Us',
        richText: richText(
          heading('Our Partner Organizations'),
          paragraph(
            'Collaborating for a stronger community and empowering Muslim Americans in public service together.',
          ),
          paragraph(
            'MAPS engages independent organizations and networks with whom it shares constituencies or overlapping goals or activities towards ongoing collaboration and joint programming. MAPS also engages Federal, state, and local government executives and agencies, professional associations, non-governmental and advocacy organizations on an ad hoc basis.',
          ),
          paragraph(
            'While MAPS collaborates with these organizations on many initiatives and programs, partnership does not necessarily constitute an endorsement of any or all positions they may take, nor does it imply their endorsement of all MAPS positions.',
          ),
        ),
        links: [
          {
            link: {
              type: 'custom',
              url: '/contact',
              label: 'Contact Us',
              appearance: 'default',
            },
          },
        ],
      },
      layout,
    },
  ] as unknown as PageData[]
}

const donateSlice: PageSlice = async (payload) => {
  // Payment-method logos + QR codes (#DN1). The Media pipeline stores everything
  // as WebP, so resolve the `.webp` filenames re-hosted by scripts/rehost-images.
  const mediaId = async (filename: string): Promise<number | null> => {
    const res = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    return (res.docs[0]?.id as number | undefined) ?? null
  }
  const [paypalLogo, zelleLogo, paypalQr, zelleQr] = await Promise.all([
    mediaId('paypal.webp'),
    mediaId('zelle.webp'),
    mediaId('paypal-qr.webp'),
    mediaId('zelle-qr.webp'),
  ])

  return [
    {
      slug: 'donate',
      title: 'Donate',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Support MAPS',
        richText: richText(
          heading('Donate'),
          paragraph(
            'Fuel our mission of supporting the career, workplace, and community development of Muslim American public servants, and help us expand and harness the rich, collective contributions of Muslim Americans across public service sectors. Your support helps us keep MAPS membership and programming accessible.',
          ),
          paragraph(
            'MAPS is a 501(c)(3) non-profit. All donations are fully tax-deductible. Our tax ID is 86-2920622.',
          ),
        ),
        links: [
          {
            link: {
              type: 'custom',
              url: 'https://www.paypal.com/us/fundraiser/charity/4490258',
              label: 'Donate with PayPal',
              newTab: true,
              appearance: 'default',
            },
          },
          {
            link: {
              type: 'custom',
              url: '#payments',
              label: 'Donate with Zelle',
              appearance: 'outline',
            },
          },
        ],
      },
      layout: [
        {
          blockType: 'content',
          columns: [
            {
              size: 'full',
              richText: richText(
                paragraph(
                  '100% of your donation will be used to directly keep MAPS operational and facilitate better events, specialized services, broader reach, and a stronger and more visible community.',
                ),
                paragraph(
                  'We keep our membership dues to a bare minimum, reducing barriers to an active and thriving community.',
                ),
                paragraph(
                  'MAPS is 100% volunteer run. We enlist members of our leadership team and network to support the organization with required services.',
                ),
                paragraph(
                  'We also accept Zelle for donations. You can send us donations via PayPal or Zelle using the email finance@mapsnational.org.',
                ),
              ),
              enableLink: false,
            },
          ],
        },
        {
          blockType: 'comparisonTable',
          header: {
            enableHeader: true,
            heading: 'Your support is our life blood.',
            body: richText(paragraph('Choose one of the following convenient payment methods.')),
            anchorId: 'payments',
          },
          columns: [
            { label: 'PayPal', ...(paypalLogo ? { icon: paypalLogo } : {}) },
            { label: 'Zelle', ...(zelleLogo ? { icon: zelleLogo } : {}) },
          ],
          rows: [
            {
              label: 'Transaction fees',
              cells: [
                { type: 'text', text: '$0 in fees' },
                { type: 'text', text: '$0 in fees' },
              ],
            },
            {
              label: 'Pay with Credit or Debit Card',
              cells: [{ type: 'check' }, { type: 'cross' }],
            },
            {
              label: 'Pay with Bank Account',
              cells: [{ type: 'check' }, { type: 'check' }],
            },
            {
              label: 'Pay with PayPal Credit',
              cells: [{ type: 'check' }, { type: 'check' }],
            },
            {
              label: 'QR Code',
              cells: [
                paypalQr ? { type: 'image', image: paypalQr } : { type: 'text', text: 'Available' },
                zelleQr ? { type: 'image', image: zelleQr } : { type: 'text', text: 'Available' },
              ],
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const eventsSlice: PageSlice = async (payload) => {
  // Resolve the four EVENT-type Post categories by their imported slugs
  // (from "Latest Update Categories"): Cosponsored Event, MAPS Event,
  // Partner Event, Upcoming Events. Never hardcode db ids — map at runtime.
  const cats = await payload.find({ collection: 'categories', limit: 0, depth: 0 })
  const idBySlug = new Map(cats.docs.map((c) => [c.slug, c.id]))
  const eventCategoryIds = ['cosponsored-event', 'events', 'partner-event', 'upcoming-events']
    .map((s) => idBySlug.get(s))
    .filter((v): v is number => typeof v === 'number')

  // One category-filtered Events child page (e.g. /events/upcoming). Same Archive
  // shape as the parent but scoped to a single category; LowImpact header so the
  // catch-all route derives the Home > Events > <title> breadcrumb.
  const eventChild = (slug: string, title: string, catSlug: string, intro: string): PageData => {
    const id = idBySlug.get(catSlug)
    return {
      slug: `events/${slug}`,
      title,
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Events',
        richText: richText(heading(title), paragraph(intro)),
        links: [
          { link: { type: 'custom', appearance: 'outline', label: 'All events', url: '/events' } },
        ],
      },
      layout: [
        {
          blockType: 'archive',
          populateBy: 'collection',
          relationTo: 'posts',
          categories: id ? [id] : [],
          limit: 12,
        },
      ],
    } as unknown as PageData
  }

  return [
    {
      slug: 'events',
      title: 'Events',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Events',
        richText: richText(
          heading('Events'),
          paragraph(
            'Latest updates from MAPS, including upcoming and recent exclusive member events, webinars, virtual training and professional development opportunities. By registering you agree to MAPS events policy: https://bit.ly/MAPSEventPolicies26',
          ),
        ),
        links: [
          {
            link: {
              type: 'custom',
              appearance: 'outline',
              label: 'View all updates',
              url: '/latest-updates',
            },
          },
        ],
      },
      layout: [
        {
          blockType: 'archive',
          populateBy: 'collection',
          relationTo: 'posts',
          categories: eventCategoryIds,
          limit: 12,
        },
      ],
    },
    eventChild(
      'upcoming',
      'Upcoming Events',
      'upcoming-events',
      'Register for upcoming MAPS webinars, training sessions, and member events.',
    ),
    eventChild(
      'maps',
      'MAPS Events',
      'events',
      'Events hosted by MAPS National, including member gatherings and professional development.',
    ),
    eventChild(
      'partner',
      'Partner Events',
      'partner-event',
      'Events co-hosted with our partner organizations across the public service community.',
    ),
  ] as unknown as PageData[]
}

const homeSlice: PageSlice = async (payload) => {
  // HighImpact REQUIRES a Media doc. Resolve the source hero bg image by
  // filename at runtime; if it isn't imported yet, fall back to a LowImpact
  // header so the seed always succeeds (flagged as a gap).
  const heroMedia = await payload.find({
    collection: 'media',
    where: { filename: { like: '10-23-0814' } },
    limit: 1,
    depth: 0,
  })
  const heroMediaId = heroMedia.docs[0]?.id

  // Home hero carousel (#91): fold the 40-image Sliders CMS set into a
  // MediaGallery slider, resolved by the `slider-` filename prefix at runtime.
  const sliderMedia = await payload.find({
    collection: 'media',
    where: { filename: { like: 'slider-' } },
    sort: 'filename',
    limit: 0,
    depth: 0,
  })
  const sliderImages = sliderMedia.docs.map((d) => ({ image: d.id }))

  // MAPS Programs cards — full-bleed linked image cards (#H2). Resolve by filename.
  const programImg = async (filename: string): Promise<number | null> => {
    const res = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    return (res.docs[0]?.id as number | undefined) ?? null
  }
  const [careerImg, communityImg, policyImg] = await Promise.all([
    programImg('4_1.webp'),
    programImg('5_1.webp'),
    programImg('policy.webp'),
  ])
  const haveProgramImages = [careerImg, communityImg, policyImg].every(
    (id): id is number => typeof id === 'number',
  )

  // Community photo slider — moved to the bottom of the page, before the footer (#H5).
  const communitySlider = sliderImages.length
    ? [
        {
          blockType: 'mediaSlider',
          heading: 'MAPS National in the community',
          enableLightbox: true,
          images: sliderImages,
        },
      ]
    : []

  const hero = heroMediaId
    ? {
        type: 'highImpact',
        media: heroMediaId,
        richText: richText(
          heading('Empowering Muslim American Public Servants', 'h1'),
          paragraph(
            'At MAPS, we foster a supportive community for Muslim American public servants, helping them excel in their careers and personal growth. Join us in building a brighter future through collaboration, mentorship, and advocacy.',
          ),
        ),
        links: [
          {
            link: {
              type: 'custom',
              appearance: 'default',
              label: 'Become a Member',
              url: '/join',
            },
          },
          {
            link: {
              type: 'custom',
              appearance: 'outline',
              label: 'Learn More',
              url: '/about-us/mission',
            },
          },
        ],
      }
    : {
        type: 'lowImpact',
        eyebrow: 'MAPS National',
        richText: richText(
          heading('Empowering Muslim American Public Servants', 'h1'),
          paragraph(
            'At MAPS, we foster a supportive community for Muslim American public servants, helping them excel in their careers and personal growth. Join us in building a brighter future through collaboration, mentorship, and advocacy.',
          ),
        ),
        links: [
          {
            link: {
              type: 'custom',
              appearance: 'default',
              label: 'Become a Member',
              url: '/join',
            },
          },
          {
            link: {
              type: 'custom',
              appearance: 'outline',
              label: 'Learn More',
              url: '/about-us/mission',
            },
          },
        ],
      }

  return [
    {
      slug: 'home',
      title: 'Home',
      _status: 'published',
      hero,
      layout: [
        // Latest Updates — the news feed (full feed, latest first), as a slider.
        {
          blockType: 'archive',
          display: 'slider',
          populateBy: 'collection',
          relationTo: 'posts',
          limit: 12,
          introContent: richText(
            heading('Latest Updates', 'h2'),
            paragraph(
              'Latest updates from MAPS, including statements, press releases, events, photos, training and professional development opportunities.',
            ),
          ),
        },
        // "View all updates" CTA -> the full Latest Updates feed (G6).
        {
          blockType: 'cta',
          richText: richText(paragraph('See the full archive of MAPS news, events, and updates.')),
          links: [
            {
              link: {
                type: 'custom',
                appearance: 'outline',
                label: 'View all updates',
                url: '/latest-updates',
              },
            },
          ],
        },
        // Featured Galleries — auto-surfaced photo galleries from recent posts
        // (#266), newest gallery activity first, each deep-linking into the post's
        // gallery. Renders nothing until gallery posts exist (empty-safe on a
        // fresh DB), so it stays out of the way on CI/first-seed.
        {
          blockType: 'galleryHighlights',
          eyebrow: 'From our events',
          heading: 'Recent photo galleries',
          limit: 6,
        },
        // MAPS Programs — three program cards. Images flagged (need Media docs);
        // seeded mediaType 'none' so cards render text + button.
        {
          blockType: 'cardGrid',
          columns: '3',
          mediaType: haveProgramImages ? 'image' : 'none',
          header: {
            enableHeader: true,
            heading: 'MAPS Programs',
          },
          items: [
            {
              heading: 'Career Support',
              body: richText(
                paragraph(
                  'Broadening pipelines into public service is critical to not only MAPS, but our mission as public servants. MAPS creates and promotes skill development, professional networking, mentorship, career education and advancement resources among members and within MAPS chapters to support our public servants and community representation.',
                ),
              ),
              ...(careerImg ? { image: careerImg } : {}),
              enableCardLink: true,
              cardLink: { type: 'custom', url: '/programs/career-support', newTab: false },
            },
            {
              heading: 'Community Building',
              body: richText(
                paragraph(
                  'In addition to connecting members nationally, MAPS aims to support internal communities of Muslim public servants where they reside at the state level, dedicated communities of practice within their professional field, as well as formal staff associations serving Muslim Americans in the government institutions where they work.',
                ),
              ),
              ...(communityImg ? { image: communityImg } : {}),
              enableCardLink: true,
              cardLink: { type: 'custom', url: '/programs/community-building', newTab: false },
            },
            {
              heading: 'Policy & Advocacy',
              body: richText(
                paragraph(
                  'Government works best when all public servants feel welcome in the workplace. MAPS welcomes the review, dissemination and amplification of substantive initiatives and resources produced by members, allies, government officials, and all Americans who value an effective and inclusive government of and by the people.',
                ),
              ),
              ...(policyImg ? { image: policyImg } : {}),
              enableCardLink: true,
              cardLink: { type: 'custom', url: '/programs/policy-initiatives', newTab: false },
            },
          ],
        },
        // MAPS Membership — three membership cards. Images flagged.
        {
          blockType: 'cardGrid',
          columns: '3',
          mediaType: 'none',
          header: {
            enableHeader: true,
            heading: 'MAPS Membership',
          },
          items: [
            {
              heading: 'Become A Member',
              body: richText(
                paragraph(
                  'MAPS Members are Muslim Americans who are current or former public servants while Associate Members are students or professionals from the broader Muslim American community interested in or adjacent to public service. Allies or organizational partners who are US citizens of all identities, backgrounds, and faiths (or no faith) who believe in a diverse, conducive, and inclusive public workforce that represents America itself, are encouraged to join our network as Affiliates.',
                ),
              ),
              enableCardLink: true,
              cardLink: { type: 'custom', url: '/join', newTab: false },
            },
            {
              heading: 'Membership Benefits',
              body: richText(
                paragraph(
                  'Members are given access to MAPS Directors, specialists, mentors, advisors, exclusive programs and direct training and career services, partner organizations, specialized communities of practice, distribution lists, and Federal, State, and local government engagements, Muslim outreach functions, and building tours. Members also join exclusive chat groups allowing direct interaction with the MAPS network of public service professionals across the country.',
                ),
              ),
              enableCardLink: true,
              cardLink: { type: 'custom', url: '/join', newTab: false },
            },
            {
              heading: '100% Free To Join',
              body: richText(
                paragraph(
                  'Any person who supports our mission, and agrees to adhere to the values, policies, and objectives of MAPS, may engage the MAPS National network. Its free to join for all public servants and government-supporting and policy professionals, with marginal dues for Associates looking to enter public service. MAPS forgoes member dues to reduce barriers to an active and thriving community; and is unique among professional associations and national affinity organizations in doing so.',
                ),
              ),
              enableCardLink: true,
              cardLink: { type: 'custom', url: '/join', newTab: false },
            },
          ],
        },
        // Member Testimonials on MAPS Membership. Block has no 'membership'
        // type, so scoped to 'all' (flagged).
        {
          blockType: 'testimonials',
          type: 'all',
          populateBy: 'collection',
          limit: 0,
          heading: 'Member Testimonials on MAPS Membership',
        },
        ...communitySlider,
      ],
    },
  ] as unknown as PageData[]
}

const joinSlice: PageSlice = async (_payload) => {
  // Outseta registration links per plan (preserved from the source CTAs). The
  // URL is an Outseta auth link ending in `#o-anonymous`; with the nocode module
  // loaded (monitorDom), a same-tab click opens the plan-signup modal in place.
  // Must NOT be newTab — `target="_blank"` makes the browser navigate to the
  // hosted auth page instead of letting nocode intercept and pop the modal (JN1).
  const apply = (url: string) => [
    {
      link: {
        type: 'custom' as const,
        appearance: 'outline' as const,
        label: 'Apply',
        url,
      },
    },
  ]

  return [
    {
      slug: 'join',
      title: 'Join',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Belong',
        richText: richText(
          heading('Join the MAPS network', 'h1'),
          paragraph('Build your career, community, and workplace while serving your country.'),
          paragraph(
            'MAPS is a grassroots effort to build and support the national community of Muslim Americans in government. We do this because we are Muslim American public servants, ourselves. We represent a range of backgrounds, career tracks, levels and branches of government, and we have found the individual and institutional support along our careers to be minimal or inaccessible.',
          ),
          paragraph(
            'We feel not only that we can do better, but that supporting pipelines into service for underserved and underrepresented groups is key to improving outcomes for all, and ensuring that American government looks like America.',
          ),
          paragraph(
            'MAPS supports individuals who are in accord with its mission, objectives, and values, and agree to advance the same. All Members, Associates, Affiliates, and Allies must also abide by general expectations of support towards MAPS and decorum toward its members, and observe non-solicitation policies during MAPS programs or while using MAPS communication channels.',
          ),
          paragraph(
            'Benefits and rights of membership include direct access to MAPS programs, events, training, skill development, and direct services; policy and religious accommodation initiatives, legal resources and referrals; national and local organizational partners and elected and appointed officials; a network of public service professionals and distribution lists; communities of practice; communication channels and state and national chat groups; government building tours and Muslim outreach engagements; and opportunities to help lead the organization.',
          ),
        ),
        links: [
          {
            link: {
              type: 'custom',
              appearance: 'default',
              label: 'Apply to join MAPS',
              url: '#membership-types',
            },
          },
          {
            link: {
              type: 'custom',
              appearance: 'outline',
              label: 'Choose a membership tier',
              url: '#membership-faqs',
            },
          },
        ],
      },
      layout: [
        {
          blockType: 'pricingTiers',
          columns: '4',
          header: {
            enableHeader: true,
            heading: 'Memberships',
            anchorId: 'membership-types',
            body: richText(
              paragraph(
                'Our membership framework is designed around four distinct categories, each reflecting a different level of engagement and contribution — honoring where you are today while supporting where you’re headed. Together, they create a cohesive ecosystem that supports growth, collaboration, and sustained impact. Learn more about our criteria in our FAQ below.',
              ),
              paragraph(
                'Sign up to join as a Full Member, Associate Member, Affiliate, or Ally today.',
              ),
            ),
          },
          plans: [
            {
              name: 'Full Members',
              price: 'Free',
              description:
                'Muslim Americans who are current or former public sector employees of Federal, State, or local government.',
              featured: false,
              features: [
                { feature: 'All MAPS career services' },
                { feature: 'All MAPS policy products & legal advocacy services' },
                { feature: 'Access to all Members, leaders, groups & chapters' },
                { feature: 'All MAPS & partner events' },
                { feature: 'All Member chats' },
              ],
              links: apply(
                'https://mapsnational.outseta.com/auth?widgetMode=register&planUid=aWxrkrQV&planPaymentTerm=month&skipPlanOptions=true#o-anonymous',
              ),
            },
            {
              name: 'Associates',
              price: 'Free',
              description:
                'Muslim Americans currently working in broader public service or government-adjacent roles in contracting or public policy.',
              featured: false,
              features: [
                { feature: 'All MAPS career services' },
                { feature: 'Access to all Members, leaders, groups & chapters' },
                { feature: 'Select MAPS events & Member chats' },
              ],
              links: apply(
                'https://mapsnational.outseta.com/auth?widgetMode=register&planUid=rm0Rgj9X&planPaymentTerm=month&skipPlanOptions=true#o-anonymous',
              ),
            },
            {
              name: 'Affiliates',
              price: '$25',
              description:
                'Muslim American professionals lacking any experience in government but who aspire to enter public service in temporary, full-time career, or term-limited appointments. Students and unemployed professionals can request a promo code at info@mapsnational.org.',
              featured: false,
              features: [
                { feature: 'All MAPS career services' },
                { feature: 'Access to select leaders, groups & chapters' },
                { feature: 'Select MAPS events & Member chats' },
              ],
              links: apply(
                'https://mapsnational.outseta.com/auth?widgetMode=register&planUid=1QpbXgWE&planPaymentTerm=annual&skipPlanOptions=true#o-anonymous',
              ),
            },
            {
              name: 'Ally',
              price: 'Free',
              description:
                'American supporters of MAPS (of any faith or no faith) that align with our mission and wish to stay in the loop, including civil society, academia, and the general public, MAPS’ nonprofit, media and organizational partners, and private sector firms exploring government contracting.',
              featured: false,
              features: [
                {
                  feature:
                    'Access to MAPS updates, ability to support or amplify MAPS programs, or collaborate on overlapping initiatives',
                },
                { feature: 'Select MAPS events' },
              ],
              links: apply(
                'https://mapsnational.outseta.com/auth?widgetMode=register&planUid=79O7Xo9E&planPaymentTerm=month&skipPlanOptions=true#o-anonymous',
              ),
            },
          ],
        },
        {
          blockType: 'faq',
          layout: 'stacked',
          header: {
            enableHeader: true,
            heading: 'MAPS Membership FAQs',
            anchorId: 'membership-faqs',
            body: richText(
              paragraph(
                'Find answers about membership levels, criteria and benefits below. To learn more about MAPS membership, data privacy, funding, and programming policies check out our general FAQs at /about-us/faq.',
              ),
            ),
          },
          items: [
            {
              question: 'What are the benefits of membership?',
              answer: richText(
                paragraph(
                  'Members and Associates generally have access to our full suite of support and network features for free, including MAPS programs, events, training, skill development, and direct services; policy and religious accommodation initiatives, legal resources and referrals; national and local organizational partners and officials; a network of public service professionals and distribution lists; communities of practice; communication channels and chat groups within your state and across the country; government building tours and Muslim outreach engagements; and opportunities to help lead the organization.',
                ),
                paragraph(
                  'Affiliates generally receive career support to facilitate their pathway to service and full MAPS membership for token annual dues, while Allies primarily receive policy and program coordination with limited or moderated member engagement.',
                ),
              ),
              defaultOpen: false,
            },
            {
              question: 'Full Membership',
              answer: richText(
                paragraph(
                  'Representing the core of MAPS’ national community, full Members are Muslim Americans currently or formerly employed within Federal, Tribal, State or local government departments and agencies, their legislative and judicial branch counterparts, or multilateral institutions, who support the goals and mission of MAPS.',
                ),
                paragraph(
                  'This includes full-time, part-time, seasonal, temporary, and contracted workers employed directly by a government agency, as well as government retirees, and individuals employed by a private entity as a contractor for a government agency if they report to a government-owned property.',
                ),
                paragraph(
                  'Individuals seeking full membership must be US citizens or permanent residents who self-identify as Muslim American.',
                ),
              ),
              defaultOpen: false,
            },
            {
              question: 'Associate Membership',
              answer: richText(
                paragraph(
                  'Representing the broader MAPS community of Muslim American civil society, individuals seeking Associate membership are Muslim American private or non-profit sector professionals not in government but who interface with government or public policy.',
                ),
                paragraph(
                  'This classification includes individuals employed by a private entity as a contractor for a government agency, if they do not report to a government-owned property, along with public-service-oriented private or non-profit policy organizations.',
                ),
                paragraph(
                  'Individuals seeking associate membership must be US citizens or permanent residents who self-identify as Muslim American.',
                ),
              ),
              defaultOpen: false,
            },
            {
              question: 'Affiliates',
              answer: richText(
                paragraph(
                  'As expanding pipelines into public service is critical to MAPS and our broader mission as American public servants, MAPS shares resources with individuals within the Muslim American community to ensure their best and brightest professionals are supported on their journey to public service. MAPS offers qualified professionals with a demonstrated or expressly professed commitment to service our full suite of professional development support, while keeping their category distinct from spaces provided to active Members and Associates.',
                ),
                paragraph(
                  'Affiliates are private sector professionals and students who are not currently employed or engaged with the public sector or national policy but are either considering public service career pivots, applying their skills and experience to government and policy in some capacity, or are interested in entering public service upon graduation.',
                ),
                paragraph(
                  'To accommodate demand, annual dues may be charged for Muslim Americans employed in the private sector for engagement and support by MAPS as Affiliates. Students and those facing financial hardship may be eligible for discounting or waiving of annual dues until full employment in the private sector or full conversion into full Member or Associate categories once they qualify.',
                ),
                paragraph(
                  'Individuals seeking Affiliate status must be US citizens or permanent residents who self-identify as Muslim American.',
                ),
              ),
              defaultOpen: false,
            },
            {
              question: 'Allies & Non-Members',
              answer: richText(
                paragraph(
                  'Representing the broader MAPS network of supporters and organizational partners, individuals seeking Ally status may include any American who supports the goals and mission of MAPS and who believes in a truly diverse, equitable, and inclusive government workforce that represents America itself.',
                ),
                paragraph(
                  'Allies may also include representatives of private sector partners, as well as civil society, academia, non-governmental organizations, and charities, or those re-categorized as Allies by the Membership Director upon verification of their application or if they are no longer actively pursuing public service as Affiliates.',
                ),
                paragraph(
                  'Non-Member electronic communication channels and distribution lists include individuals who have opted for Non-Member status or signed up for MAPS’ mailing list to stay informed of policy initiatives, future programs, and past event recordings. Organizational and media partners or members of the public who participated in MAPS’ public events may also be added as Non-Members.',
                ),
                paragraph(
                  'Individuals seeking Ally or Non-Member status need not be Muslim, and may be US citizens or permanent residents of any faith or no faith, and of all identities, backgrounds, and national origins.',
                ),
              ),
              defaultOpen: false,
            },
            {
              question: 'What does MAPS do with my information?',
              answer: richText(
                paragraph(
                  'MAPS will never share your information with any external entities without your permission or self-selection. Information shared with potential employers or organizational and program partners is only done with the express permission of our members.',
                ),
                paragraph(
                  'While MAPS also has a very active service connecting individuals internal and external to MAPS with our members, this is always done with the requested segment or identified group of members messaged in blind carbon copy to protect their privacy and preferred degree of engagement.',
                ),
                paragraph(
                  'For additional security, our full member list is only accessible by the MAPS Chair, Membership Director, and their support teams on a need-to-know basis.',
                ),
              ),
              defaultOpen: false,
            },
          ],
        },
        {
          // PLACEHOLDER for the membership application form (Payload form-builder follow-on).
          // Replace with a Form block once the membership form is authored.
          blockType: 'cta',
          richText: richText(
            heading('Ready to apply?', 'h2'),
            paragraph(
              'Choose your membership tier above and complete the application to join the MAPS network.',
            ),
          ),
          links: [
            {
              link: {
                type: 'custom',
                appearance: 'default',
                label: 'Choose a membership tier',
                url: '#membership-types',
              },
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const membersCommunityBuildingSlice: PageSlice = async (_payload) => {
  // Button helper: every CTA on this page is an external custom URL.
  const joinBtn = (url: string, label = 'Join on Signal') => ({
    link: { type: 'custom', url, newTab: true, label, appearance: 'outline' },
  })

  return [
    {
      slug: 'members/community-building',
      title: 'Community Building',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        richText: richText(
          heading('Community Building'),
          paragraph('Review our engagement standards before joining.'),
        ),
        links: [
          {
            link: {
              type: 'custom',
              url: '/documents/MAPS-Messaging-Policy-for-Member-Chats-on-Signal-Platform-Revised.pdf',
              newTab: true,
              label: 'MAPS Chat Policy',
              appearance: 'outline',
            },
          },
          {
            link: {
              type: 'custom',
              url: '#chat',
              newTab: false,
              label: 'Join Chat Groups',
              appearance: 'default',
            },
          },
        ],
      },
      layout: [
        // Signal chat groups. mediaType:'none' — icons are an upload relation
        // (need Media doc ids); see gaps[]. anchorId 'chat' = hero #chat target.
        {
          blockType: 'cardGrid',
          header: {
            enableHeader: true,
            eyebrow: 'National',
            heading: 'Connect nationally',
            body: richText(
              paragraph(
                'Find your community and join nationwide conversations about public service and community building.',
              ),
              node('paragraph', {}, [
                text('Looking for career specific groups? Explore our '),
                linkNode('Communities of Practice', '/members/communities-of-practice'),
                text('.'),
              ]),
            ),
            anchorId: 'chat',
          },
          columns: '3',
          mediaType: 'none',
          items: [
            {
              heading: 'MAPS Member & Associate Chat',
              body: richText(
                paragraph(
                  'Our main national chat for MAPS Members and Associates: a supportive, professional space for success stories, career postings, networking, and public policy relevant to our mission.',
                ),
              ),
              links: [
                joinBtn(
                  'https://signal.group/#CjQKIJt0L3TEvNSeAM8cOxDYeQ4Rr-LkC3uMkSX1tWpTEwh7EhAhpJH42AqPlDsoaEt3xD4I',
                ),
              ],
            },
            {
              heading: 'MAPS Social Chat',
              body: richText(
                paragraph(
                  'An informal space for MAPS Members and Associates to discuss current affairs, politics, and issues affecting the Muslim American community. Personal attacks and inflammatory language are not allowed.',
                ),
              ),
              links: [
                joinBtn(
                  'https://signal.group/#CjQKILO1Hppy2YF-fTgSZmAn26yVv0Ts_PyfVvGz53xK7UZQEhDs8WSDdFlluODjtVLv9ccE',
                ),
              ],
            },
            {
              heading: 'MAPS Affiliate Chat',
              body: richText(
                paragraph(
                  'Our national chat for MAPS Affiliates: a professional space for development, networking, and career postings that guide Muslim Americans into public service pathways.',
                ),
              ),
              links: [
                joinBtn(
                  'https://signal.group/#CjQKINQPIyQoCZ-9PSel4CSYWjZ0fgAnhBuAGvd3Q4-BJBtoEhD3AGqTfUn1fMFIgP_vSQAY',
                ),
              ],
            },
          ],
        },
        // State groups. mediaType:'none' — state SVG logos are an upload
        // relation (need Media doc ids); see gaps[].
        {
          blockType: 'cardGrid',
          header: {
            enableHeader: true,
            eyebrow: 'States',
            heading: 'Connect in your state',
            body: richText(
              paragraph(
                'Find your state group and join local conversations about public service and community building.',
              ),
            ),
          },
          columns: '3',
          mediaType: 'none',
          items: [
            {
              heading: 'Massachusetts',
              body: richText(paragraph('President: Sofia Abdi · Vice President: Hodan Hashi')),
              links: [joinBtn('https://bit.ly/4aFHvbq')],
            },
            {
              heading: 'California',
              body: richText(
                paragraph('President: Mahnaz Ebadi · Vice President: Zeeshan Chaudhry'),
              ),
              links: [joinBtn('https://bit.ly/4dZZhZM')],
            },
            {
              heading: 'New York',
              body: richText(
                paragraph('President: Basem Hassan · Vice President: Hesham El Meligy'),
              ),
              links: [joinBtn('https://bit.ly/3R81xV7')],
            },
            {
              heading: 'Michigan',
              body: richText(paragraph('President: Micho Assi · Vice President: Omar Shajrah')),
              links: [joinBtn('https://bit.ly/4bD2exY')],
            },
            {
              heading: 'New Jersey',
              body: richText(
                paragraph('President: Fatima Abdelsalam · Vice President: Tajnia Hussein'),
              ),
              links: [
                joinBtn(
                  'https://signal.group/#CjQKILEvbZc2lLr9OtcyeAYuXUb6SoFNDV1kqefSQR6AySYREhCSUI9dTbZVpIFMYRgUzq1N',
                ),
              ],
            },
            {
              heading: 'Texas',
              body: richText(paragraph('Acting President: Fatima Shaikh')),
              links: [
                joinBtn(
                  'https://signal.group/#CjQKIAN5S4ndUZlx4yLjsQfCBj9b5jSmz42_xIIUf2GGvtK_EhAGId810zFB5A_PDmAaorT_',
                ),
              ],
            },
            {
              heading: 'Georgia',
              body: richText(paragraph('President: John Patrick Abellera')),
              links: [
                joinBtn(
                  'https://signal.group/#CjQKIMjzbfemfxkYSHq0fFJVxtg6RzYWGpk133-__8Vg_B73EhD9-kvPN2pw-5UGlRVdvLT4',
                ),
              ],
            },
            {
              heading: 'Florida',
              links: [
                joinBtn(
                  'https://signal.group/#CjQKIFgHMP_KhARYFkye6VA-zsiY3u9eWiYucGed9xfeYUZiEhBJKE1KbeUZXCiTDgrWDU-o',
                ),
              ],
            },
            {
              heading: 'Illinois',
              body: richText(paragraph('President: Samia Naseem · Vice President: Wardah Alvi')),
              links: [
                joinBtn(
                  'https://signal.group/#CjQKILxBLjyYocOeoBBgs7r0OSgrdCAei59CdWD0P7V4-ZcnEhAZB8jzC1GOF8O3QE7cLtE6',
                ),
              ],
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const mapsAcademyVidsSlice: PageSlice = async (payload) => {
  // Resolve the two real video-category ids by their imported slugs (Phase 5).
  // The source page groups recordings under two MAPS Academy categories; binding
  // both drives the block's category filter bar. If the import hasn't run these
  // resolve to nothing and the block shows all academy videos.
  const cats = await payload.find({
    collection: 'video-categories',
    limit: 0,
    depth: 0,
  })
  const idBySlug = new Map(cats.docs.map((c) => [c.slug, c.id]))
  const categoryIds = [
    'maps-academy-public-service-fundamentals-career-entry-points',
    'maps-academy-public-service-executive-senior-official-pathways',
  ]
    .map((s) => idBySlug.get(s))
    .filter((v): v is number => typeof v === 'number')

  return [
    {
      slug: 'members/maps-academy-vids',
      title: 'MAPS Academy Videos',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Member Portal',
        richText: richText(
          heading('Recent MAPS Academy Programs'),
          paragraph(
            'Browse our collection of recorded sessions of internal and public career programs.',
          ),
          paragraph(
            'As many of these recordings are internal and not publicly available, for the privacy and security of our members and instructors, please do not share externally.',
          ),
        ),
      },
      layout: [
        {
          blockType: 'academyVideos',
          eyebrow: 'MAPS Academy',
          heading: 'Recorded sessions',
          populateBy: 'collection',
          categories: categoryIds,
          limit: 0,
        },
      ],
    },
  ] as unknown as PageData[]
}

const newYorkStateSlice: PageSlice = async (payload) => {
  // FeatureSplit.image and MediaGallery.images[].image are `upload` relations and
  // need a Media DOC id (not a path). Resolve each by filename at runtime — same
  // convention scripts/import-prose.ts uses (Media filename === export basename).
  // Any image whose Media doc does not exist yet is skipped so seeding never throws.
  const mediaIdByFile = async (file: string): Promise<number | null> => {
    const found = await payload.find({
      collection: 'media',
      where: { filename: { equals: file } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const id = found.docs[0]?.id
    return typeof id === 'number' ? id : null
  }

  const customLink = (
    label: string,
    url: string,
    appearance: 'default' | 'outline' = 'default',
  ) => ({
    link: { type: 'custom', url, label, newTab: true, appearance },
  })

  // The three NYC-action items + the Connect section, as alternating FeatureSplits.
  const featureDefs: Array<{
    file: string
    eyebrow?: string
    heading: string
    body: string[]
    link: { label: string; url: string }
    imageSide: 'left' | 'right'
    anchorId?: string
  }> = [
    {
      file: '6.webp',
      eyebrow: 'Grow',
      heading: 'Explore NYC Government Jobs',
      body: [
        'MAPS invites members to review the City of New York Government Jobs Portal to identify open positions that align with your skills and interests. Some positions require taking and passing a City of New York Civil Service Exam before applying for that position, while most positions require residency in the five boroughs within 90 days.',
      ],
      link: { label: 'NYC Jobs', url: 'https://cityjobs.nyc.gov/' },
      imageSide: 'right',
    },
    {
      file: '34.webp',
      heading: 'Apply for MAPS Endorsement to Vacant NYC Government Jobs',
      body: [
        'MAPS invites its members to apply for consideration for direct endorsement to the Mamdani Administration against open city government roles below. Please read the instructions in the following application form carefully and submit all requested information.',
      ],
      link: {
        label: 'Apply',
        url: 'https://forms.gle/wpRvWiekcq4xTZRx6',
      },
      imageSide: 'left',
    },
    {
      file: '43.webp',
      heading: 'Apply for MAPS Endorsement to NYC Board & Commission Roles',
      body: [
        'MAPS invites its members to apply for consideration for direct endorsement to the Mamdani Administration against roles on NYC Boards and Commissions below. Please read the instructions in the following application form carefully and submit all requested information.',
      ],
      link: {
        label: 'Apply',
        url: 'https://forms.gle/QJNsEXRkk1CkVHTcA',
      },
      imageSide: 'right',
    },
    {
      file: '21.webp',
      eyebrow: 'Connect',
      heading: 'Professional Networking & Community Building',
      body: [
        'Connect with a powerful network of Muslim American professionals across federal, state and city government that call New York home. Our social and community building events provide connections and introductions to fellow members within specific fields or agencies and allow for communal networking and knowledge sharing.',
      ],
      link: { label: 'MAPS-NY Signal Chat', url: 'https://bit.ly/3R81xV7' },
      imageSide: 'left',
      anchorId: 'networking',
    },
  ]

  // The 3 NYC-action items render as one 3-up Card Grid; the Connect section
  // stays a FeatureSplit (distinct intent, keeps its #networking anchor).
  const connectDef = featureDefs.find((d) => d.anchorId === 'networking')
  const actionDefs = featureDefs.filter((d) => d !== connectDef)

  const cardItems = []
  for (const def of actionDefs) {
    const imageId = await mediaIdByFile(def.file)
    if (imageId == null) continue // skip (Media doc not yet re-hosted; see gaps[])
    cardItems.push({
      image: imageId,
      heading: def.heading,
      body: richText(...def.body.map((p) => paragraph(p))),
      links: [customLink(def.link.label, def.link.url, 'default')],
    })
  }

  const featureBlocks = []
  if (cardItems.length > 0) {
    featureBlocks.push({
      blockType: 'cardGrid',
      header: {
        enableHeader: true,
        eyebrow: 'Grow',
        heading: 'Supporting Members in New York',
        anchorId: 'main-section',
        body: richText(
          paragraph(
            'NYC government employees deliver essential services and make critical decisions that shape our daily lives, and it is vital that our city’s workforce reflects the rich diversity of the communities it serves.',
          ),
          paragraph(
            'As part of our mission to elevate Muslim American voices in local government, MAPS New York is actively collecting candidate profiles from Full, Associate, and Affiliate members for career opportunities within New York City government.',
          ),
        ),
      },
      columns: '3',
      mediaType: 'image',
      items: cardItems,
    })
  }

  // Full NY State Committee roster (tight grid — 11 people).
  const nyTeamCategory = await payload.find({
    collection: 'team-categories',
    where: { slug: { equals: 'new-york-state-committee' } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const nyTeamCategoryId = nyTeamCategory.docs[0]?.id
  if (typeof nyTeamCategoryId === 'number') {
    featureBlocks.push({
      blockType: 'team',
      header: {
        enableHeader: true,
        eyebrow: 'Leadership',
        heading: 'Our Team',
      },
      layout: 'grouped',
      density: 'tight',
      populateBy: 'collection',
      categories: [nyTeamCategoryId],
      limit: 0,
    })
  }

  if (connectDef) {
    const imageId = await mediaIdByFile(connectDef.file)
    if (imageId != null) {
      featureBlocks.push({
        blockType: 'featureSplit',
        eyebrow: connectDef.eyebrow,
        imageSide: connectDef.imageSide,
        heading: connectDef.heading,
        body: richText(...connectDef.body.map((p) => paragraph(p))),
        image: imageId,
        anchorId: connectDef.anchorId,
        links: [customLink(connectDef.link.label, connectDef.link.url, 'default')],
      })
    }
  }

  // Lightbox gallery — resolve every image; only keep the ones with a Media doc.
  const galleryFiles = ['22.webp', '11.webp', '1.webp', '4_3.webp', '8.webp', '26.webp', '16.webp']
  const galleryImages = []
  for (const file of galleryFiles) {
    const imageId = await mediaIdByFile(file)
    if (imageId == null) continue // Media doc not yet re-hosted — skip (see gaps[])
    galleryImages.push({ image: imageId })
  }

  const layout: PageData['layout'] = [...featureBlocks] as unknown as PageData['layout']
  if (galleryImages.length > 0) {
    layout.push({
      blockType: 'mediaSlider',
      heading: 'Leaders in the Community',
      enableLightbox: true,
      images: galleryImages,
    } as unknown as PageData['layout'][number])
  }

  return [
    {
      slug: 'members/new-york-state',
      title: 'New York State',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Members',
        richText: richText(
          heading('MAPS New York'),
          node('paragraph', {}, [
            text(
              'The MAPS New York State Committee helps organize and support MAPS members and represent MAPS among government officials within the State. MAPS-NY leaders ensure professional development and community are brought directly to local public servants where they live and work. Meet our Leadership team ',
            ),
            node(
              'link',
              {
                version: 3,
                fields: { linkType: 'custom', url: '/about-us/state-committees', newTab: false },
              },
              [{ ...text('here'), format: 1 }],
            ),
            text(' or email us below.'),
          ]),
        ),
        links: [
          {
            link: {
              type: 'custom',
              url: 'mailto:newyork@mapsnational.org?subject=Email%20from%20Portal',
              label: 'Email MAPS New York',
              newTab: false,
              appearance: 'default',
            },
          },
        ],
      },
      layout,
    },
  ] as unknown as PageData[]
}

const policyLegalAdvocacySlice: PageSlice = async (payload) => {
  // Page-specific helper: rich text body for a card (heading/paragraph only).
  const cardBody = (...children: unknown[]) => richText(...children)

  // Resolve a policy/legal/rights video category at runtime so the recorded-
  // sessions block can scope to it. The Webflow CMS list was an empty placeholder
  // (w-dyn-bind-empty), so the videos themselves are re-entered in Payload; if no
  // matching category exists yet, fall back to showing every category rather than
  // omitting the section.
  const cats = await payload.find({
    collection: 'video-categories',
    where: {
      or: [
        { slug: { contains: 'policy' } },
        { slug: { contains: 'legal' } },
        { slug: { contains: 'rights' } },
      ],
    },
    limit: 0,
    depth: 0,
  })
  const policyCategoryIds = cats.docs
    .map((c) => c.id)
    .filter((v): v is number => typeof v === 'number')

  if (policyCategoryIds.length === 0) {
    payload.logger.warn(
      'policy-legal-advocacy: no policy/legal/rights video-category found — AcademyVideos block will show all categories.',
    )
  }

  return [
    {
      slug: 'members/policy-legal-advocacy',
      title: 'Policy & Legal Advocacy',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Member Portal',
        richText: richText(
          heading('Policy & Legal Advocacy', 'h1'),
          paragraph(
            'MAPS policy initiatives, including awareness and advocacy campaigns that aim to maintain or establish conducive, accommodating public institutions, as well as products, memos and templates, can be found here. In addition, legal support for members facing workplace discrimination and adversity is available via our Legal Advocacy intake process.',
          ),
          paragraph(
            'Internal recordings of our exclusive MAPS Policy & Legal Advocacy webinars and virtual topical programs for members, associates, or affiliates are also available below.',
          ),
        ),
        links: [
          {
            link: {
              type: 'custom',
              url: '#legal-resources',
              label: 'Policy Resources',
              appearance: 'default',
            },
          },
          {
            link: {
              type: 'custom',
              url: '#rights-issues',
              label: 'Trainings & Topical Videos',
              appearance: 'outline',
            },
          },
        ],
      },
      layout: [
        {
          blockType: 'cardGrid',
          header: {
            enableHeader: true,
            heading: 'Policy & Legal Advocacy Resources',
            anchorId: 'legal-resources',
          },
          columns: '3',
          mediaType: 'none',
          items: [
            {
              heading:
                'MAPS Template for Religious Accommodation Telework Request for Government Agencies',
              body: cardBody(
                paragraph(
                  'Check out our Template for Religious Accommodation Telework Request Memo. This has successfully granted members across many Federal agencies telework accommodation for Friday services and the month of Ramadan, but may apply beyond Federal government.',
                ),
              ),
              links: [
                {
                  link: {
                    type: 'custom',
                    url: '/documents/Federal-Telework-Accommodation-for-Muslim-Americans-Employee-Request-Language-Revised.docx',
                    label: 'Download Template',
                    appearance: 'default',
                    newTab: true,
                  },
                },
              ],
            },
            {
              heading:
                'MAPS Template for Dissemination of ISPU / Yaqeen Institute Toolkit for Government Administrators',
              body: cardBody(
                paragraph(
                  'Review suggested language for members employed at all levels and branches of government to share our Government Administrators Toolkit (ispu.org/toolkits-and-guides/government-administrators-toolkit) with your respective Department or Agency leadership or HR Officials as a resource on American Muslims and Islam.',
                ),
              ),
              links: [
                {
                  link: {
                    type: 'custom',
                    url: '/documents/Government-Executive-toolkit-Dissemination-Language-Revised.docx',
                    label: 'Download Template',
                    appearance: 'default',
                    newTab: true,
                  },
                },
              ],
            },
            {
              heading:
                'MAPS Legal Support for Workplace Discrimination, Termination and Other Issues',
              body: cardBody(
                paragraph(
                  'MAPS’ Legal Advocacy Committee is proud to offer legal information in support of members facing undeserved workplace adversity in their public service careers, including religious discrimination, retaliation, wrongful termination or other bias against a protected class.',
                ),
              ),
              links: [
                {
                  link: {
                    type: 'custom',
                    url: 'https://docs.google.com/forms/d/e/1FAIpQLSdHwOl7rrQCpGVjE60_euA2XQB2QcZoJ7O1Jq_SW9EwSPaqbg/viewform',
                    label: 'Intake Form',
                    appearance: 'default',
                    newTab: true,
                  },
                },
              ],
            },
          ],
        },
        {
          blockType: 'academyVideos',
          eyebrow: 'Members only',
          heading: 'Workplace Accommodation, Rights & Issues',
          intro: richText(
            paragraph(
              'Recordings of our exclusive MAPS Policy & Legal Advocacy webinars and virtual topical programs for members, associates, and affiliates.',
            ),
          ),
          populateBy: 'collection',
          categories: policyCategoryIds.length > 0 ? policyCategoryIds : undefined,
          limit: 0,
        },
      ],
    },
  ] as unknown as PageData[]
}

const memberPortalSlice: PageSlice = async (payload) => {
  // Resolve the Upcoming Events category for the events archive section.
  const cats = await payload.find({ collection: 'categories', limit: 0, depth: 0 })
  const idBySlug = new Map(cats.docs.map((c) => [c.slug, c.id]))
  const upcomingId = idBySlug.get('upcoming-events')

  // "Get Involved" tile — title + a single external intake button (Google Form
  // or similar), opened in a new tab. URLs below are PLACEHOLDERS: swap each
  // `https://forms.gle/REPLACE-*` for the real intake form when available.
  const getInvolved = (heading: string, formUrl: string) => ({
    heading,
    links: [
      {
        link: {
          type: 'custom',
          url: formUrl,
          label: 'Get started',
          newTab: true,
          appearance: 'outline',
        },
      },
    ],
    enableCardLink: false,
  })
  // Opportunity not yet open: a heading + "Coming soon" badge, no button.
  const comingSoon = (heading: string) => ({ heading, badge: 'Coming soon', enableCardLink: false })

  return [
    {
      slug: 'members/portal',
      title: 'Member Portal',
      _status: 'published',
      hero: { type: 'none' },
      layout: [
        // 1. Personalized welcome hero (client: Outseta greeting + wired actions).
        {
          blockType: 'memberPortalHero',
          eyebrow: 'Member Portal',
          welcomeText:
            "You're in. Jump straight to events, your profile, member resources, or your state committee below.",
          showMosaic: true,
        },
        // 2. Upcoming member-only events (Archive filtered to the Upcoming category).
        {
          blockType: 'archive',
          anchorId: 'upcoming-events',
          showRegisterLinks: true,
          introContent: richText(
            heading('Upcoming Events', 'h2'),
            paragraph(
              'Mark your calendars and sign up for upcoming MAPS events. Registering takes you to the event page, where you can sign in with your MAPS-registered email.',
            ),
          ),
          populateBy: 'collection',
          relationTo: 'posts',
          categories: upcomingId ? [upcomingId] : [],
          limit: 3,
        },
        // 3. Programs & Services (2x2 resource cards).
        {
          blockType: 'cardGrid',
          columns: '2',
          mediaType: 'none',
          header: {
            enableHeader: true,
            eyebrow: 'Resources',
            heading: 'MAPS programs and services',
            anchorId: 'programs-services',
            body: richText(
              paragraph(
                'Continued, central access to member content based on your membership category, balancing member support and exclusive services with network security and privacy.',
              ),
            ),
          },
          items: [
            {
              heading: 'Professional Development',
              lucideIcon: 'briefcase',
              body: richText(
                paragraph(
                  'Career resources, templates, guides, and webinar recordings, plus one-on-one services like resume reviews and mentorship.',
                ),
              ),
              enableCardLink: true,
              cardLink: { type: 'custom', url: '/members/professional-development', newTab: false },
            },
            {
              heading: 'Community Building',
              lucideIcon: 'users',
              body: richText(
                paragraph(
                  'Pathways to community engagement across our national membership, State Committee chat groups, and career Communities of Practice.',
                ),
              ),
              enableCardLink: true,
              cardLink: { type: 'custom', url: '/members/community-building', newTab: false },
            },
            {
              heading: 'Policy & Legal Advocacy',
              lucideIcon: 'scale',
              body: richText(
                paragraph(
                  'MAPS policy initiatives, advocacy campaigns, memos and templates, plus individual member legal support via our intake process.',
                ),
              ),
              enableCardLink: true,
              cardLink: { type: 'custom', url: '/members/policy-legal-advocacy', newTab: false },
            },
            {
              heading: 'Experts & Points of Contact',
              lucideIcon: 'network',
              body: richText(
                paragraph(
                  'Meet our internal career, community, and institutional points of contact, including mentors, resume reviewers, and agency representatives.',
                ),
              ),
              enableCardLink: true,
              cardLink: {
                type: 'custom',
                url: '/members/resources-points-of-contact',
                newTab: false,
              },
            },
          ],
        },
        // 4. Get Involved action grid (8 tiles).
        {
          blockType: 'cardGrid',
          columns: '4',
          mediaType: 'none',
          header: {
            enableHeader: true,
            eyebrow: 'Opportunities',
            heading: 'Get involved with MAPS',
            body: richText(
              paragraph(
                'There are many ways to contribute. Reach out to get started with any of the opportunities below.',
              ),
            ),
          },
          items: [
            getInvolved('Join our leadership team', 'https://forms.gle/sNfKvd21Q5TJeZnx8'),
            getInvolved(
              'Become an Institutional Representative',
              'https://docs.google.com/forms/d/1tQzTXAft4ImOf7bFqplmu7adaiHrbk-ELLuE_HtPVmg/viewform',
            ),
            comingSoon('Start a State Committee'),
            comingSoon('Start a MAPS Chapter'),
            comingSoon('Register as a Speaker or Expert'),
            comingSoon('Apply to the Advisory Council'),
            comingSoon('Become a Mentor or Peer Guide'),
            comingSoon('Share your feedback'),
          ],
        },
        // 5. State Committee Pages.
        {
          blockType: 'cardGrid',
          columns: '4',
          mediaType: 'none',
          header: {
            enableHeader: true,
            eyebrow: 'State Committees',
            heading: 'MAPS State Committee pages',
            anchorId: 'state-committee',
            body: richText(
              paragraph(
                'Access resources, content, and local services offered by our State Committees.',
              ),
            ),
          },
          items: [
            {
              heading: 'MAPS New York',
              featured: true,
              body: richText(
                paragraph('Resources and updates for the New York State member community.'),
              ),
              enableCardLink: true,
              cardLink: { type: 'custom', url: '/members/new-york-state', newTab: false },
            },
            // Upcoming committees — placeholder cards until each State page ships.
            // Source committees: NY (live), plus MA, TX, IL, MI, CA, NJ.
            ...['Massachusetts', 'Texas', 'Illinois', 'Michigan', 'California', 'New Jersey'].map(
              (state) => ({
                heading: `MAPS ${state}`,
                badge: 'Coming soon',
                body: richText(
                  paragraph(`Resources and updates for the ${state} member community.`),
                ),
                enableCardLink: false,
              }),
            ),
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const professionalDevelopmentSlice: PageSlice = async (_payload) => {
  // All links are custom URLs: the seed runner does not resolve internal Page
  // references to IDs, so internal targets are emitted as site-relative paths.
  // CardGrid item links are capped at maxRows:1, so each card carries exactly
  // ONE button; cards whose source had a second action fold that action's gist
  // into the body prose (flagged in gaps[] for manual refinement).
  const btn = (label: string, url: string, newTab = true) => ({
    link: { type: 'custom', url, label, newTab, appearance: 'outline' },
  })

  return [
    {
      slug: 'members/professional-development',
      title: 'Professional Development',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Member Portal',
        richText: richText(
          heading('Professional Development', 'h1'),
          paragraph(
            'Exclusive MAPS professional development resources, templates, and guides; direct one-on-one career services; political appointment and judicial pipelines; and recordings of previous internal webinars and workshops can be found here.',
          ),
        ),
        links: [
          {
            link: {
              type: 'custom',
              url: '#programs-services',
              label: 'Programs & Services',
              newTab: false,
              appearance: 'default',
            },
          },
          {
            link: {
              type: 'custom',
              url: '/members/maps-academy-vids',
              label: 'Recorded MAPS Academy Webinars',
              newTab: false,
              appearance: 'outline',
            },
          },
        ],
      },
      layout: [
        {
          blockType: 'cardGrid',
          columns: '3',
          mediaType: 'none',
          header: {
            enableHeader: true,
            heading: 'Career Services, Programs, & Resources',
            anchorId: 'programs-services',
          },
          items: [
            {
              heading: 'MAPS Resume Review Service',
              lucideIcon: 'file-text',
              body: richText(
                paragraph(
                  'Get your resume reviewed by our in-house experts and senior public servants for free. Just email it to resumereview@mapsnational.org and follow the instructions in the response email. (Due to volume, no responses can be sent to applicants; all must book review slots directly.)',
                ),
              ),
              links: [
                btn(
                  'Email Your Resume',
                  'mailto:resumereview@mapsnational.org?subject=Resume%20Review%20from%20Portal',
                  false,
                ),
              ],
              enableCardLink: false,
            },
            {
              heading: 'MAPS Mentorship Program',
              lucideIcon: 'users',
              body: richText(
                paragraph(
                  'MAPS Professional Development Committee invites the junior and mid-career professionals in our membership to sign up for our much-awaited Mentorship Program, connecting you to our most knowledgeable and senior members.',
                ),
                paragraph(
                  'Register as a Mentee, or volunteer to give back by registering as a Mentor.',
                ),
              ),
              links: [
                btn(
                  'Register as a Mentee',
                  'https://docs.google.com/forms/d/e/1FAIpQLScOJT0nq7sJzP0OUzGcQBzP0Q6Ptu3VdF0G2x5wS8AQWAf4bw/viewform?usp=header',
                ),
              ],
              enableCardLink: false,
            },
            {
              heading: 'MAPS Academy Resources',
              lucideIcon: 'folder-open',
              body: richText(
                paragraph(
                  'Check out our depository of shared member and government career resources, including our custom resume templates and guides, and primers on everything from how to craft a resume, to interview tips and how to apply to the Federal Senior Executive Service (SES).',
                ),
              ),
              links: [
                btn(
                  'Open Shared Folder',
                  'https://drive.google.com/drive/folders/1blgzeucqN6_U96ka6uELlQCBBG9TWosL?usp=drive_link',
                ),
              ],
              enableCardLink: false,
            },
            {
              heading: 'MAPS Communities of Practice',
              lucideIcon: 'network',
              body: richText(
                paragraph(
                  'Join our career-specific Communities of Practice. These groups are only open to current practitioners in these fields, and will maintain additional entry and participation criteria.',
                ),
              ),
              links: [btn('Explore CoPs', '/members/communities-of-practice', false)],
              enableCardLink: false,
            },
            {
              heading: 'MAPS Judicial Pipeline',
              lucideIcon: 'scale',
              body: richText(
                paragraph(
                  'Considering serving as a Judge at the Federal, State or local level in the near or distant future? Register for our Judicial pipeline list so we can begin to train you, connect you with sitting judges in our network, and keep you in mind when opportunities become available!',
                ),
              ),
              links: [btn('Register as a Future Judge', 'https://forms.gle/dWtuQkKL9Rc2uxtHA')],
              enableCardLink: false,
            },
            {
              heading: 'MAPS Appointments Pipeline',
              lucideIcon: 'landmark',
              body: richText(
                paragraph(
                  'Please review our exclusive MAPS Academy professional development content for Members, Associates, or Affiliates below. As many of these recordings are internal and not publicly available, for the privacy and security of our members and instructors, please do not share externally.',
                ),
              ),
              links: [
                btn('NYC Jobs Referral', 'https://forms.gle/wpRvWiekcq4xTZRx6'),
                btn(
                  'NYC Boards Referral',
                  'https://docs.google.com/forms/d/e/1FAIpQLSeb4nED2forgqveGhswqzx2cX2q8p6bSZ9ljlFDDKUzzLh-7w/viewform',
                ),
              ],
              enableCardLink: false,
            },
            {
              heading: 'Government Jobs & Fellowships',
              lucideIcon: 'briefcase',
              body: richText(
                paragraph(
                  'MAPS helps members navigate the many pathways to a career in Federal, State and local government. Outlined are many of the primary avenues to permanent careers, entry points to temporary Federal opportunities, fellowships, and jobs within the US Congress.',
                ),
              ),
              links: [btn('Jobs & Fellowships', '/resources/federal-employment', false)],
              enableCardLink: false,
            },
            {
              heading: 'MAPS Career Speaker Registry',
              lucideIcon: 'mic',
              body: richText(
                paragraph(
                  'Share your time, talents, and knowledge with our community through the MAPS Academy learning platform, or as a speaker or panelist for future MAPS or partner events. MAPS also refers its senior members to partner events and conferences as speakers and instructors.',
                ),
              ),
              links: [btn('Register as a Speaker/Expert', 'https://forms.gle/x2tfK2n9qPaP7K5g7')],
              enableCardLink: false,
            },
            {
              heading: 'MAPS Academy Recordings',
              lucideIcon: 'video',
              body: richText(
                paragraph(
                  'Please review our exclusive MAPS Academy professional development content for Members, Associates, or Affiliates below. Many of these recordings are internal and not publicly available. For the privacy and security of our members and instructors, please do not share externally.',
                ),
              ),
              links: [btn('Watch Recordings', '/members/maps-academy-vids', false)],
              enableCardLink: false,
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const communitiesOfPracticeSlice: PageSlice = async (_payload) => {
  // One card per Community of Practice, each linking to its Signal group invite.
  // (cop() still supports a "Coming soon" card with no url for future groups.)
  const cop = (heading: string, blurb: string, url?: string) => ({
    heading,
    body: richText(paragraph(blurb)),
    ...(url
      ? { enableCardLink: true, cardLink: { type: 'custom', url, newTab: true } }
      : { badge: 'Coming soon', enableCardLink: false }),
  })

  return [
    {
      slug: 'members/communities-of-practice',
      title: 'Communities of Practice',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        richText: richText(
          heading('MAPS Communities of Practice', 'h1'),
          paragraph(
            'MAPS convenes several professional Communities of Practice (COPs) that connect members based on common public service career tracks. These associations also serve to introduce and integrate prospective public servants directly into their desired public service professions.',
          ),
          paragraph('Review our engagement standards before joining.'),
        ),
        links: [
          {
            link: {
              type: 'custom',
              url: '/documents/MAPS-Messaging-Policy-for-Member-Chats-on-Signal-Platform-Revised.pdf',
              newTab: true,
              label: 'MAPS Chat Policy',
              appearance: 'outline',
            },
          },
          {
            link: {
              type: 'custom',
              url: '#communities',
              newTab: false,
              label: 'Join Chat Groups',
              appearance: 'default',
            },
          },
        ],
      },
      layout: [
        {
          blockType: 'cardGrid',
          columns: '3',
          mediaType: 'none',
          header: {
            enableHeader: true,
            heading: 'Find your community',
            anchorId: 'communities',
            body: richText(
              paragraph(
                'Join our career specific Communities of Practice. These groups are only open to current practitioners in these fields, and will maintain additional entry and participation criteria.',
              ),
              node('paragraph', {}, [
                text('For general or state level chats, visit '),
                linkNode('Community Building', '/members/community-building'),
                text('.'),
              ]),
            ),
          },
          items: [
            cop(
              'Legal Professionals',
              'For attorneys, paralegals, and legal staff across government and public interest law. Connect on Signal, share openings, and access legal career resources.',
              'https://bit.ly/3VmhFFc',
            ),
            cop(
              'Health Professionals',
              'For clinicians, public health practitioners, and health policy professionals serving in government and community institutions.',
              'https://bit.ly/3ViDh5e',
            ),
            cop(
              'National Security & Foreign Policy Professionals',
              'For professionals across national security, foreign policy, defense, and intelligence in public service.',
              'https://bit.ly/3HsCSWd',
            ),
            cop(
              'Economists',
              'For economists and economic policy professionals in government, research, and public institutions.',
              'https://signal.group/#CjQKID7M0VXLYLNu2pmGkJMVkgc-JXgNCQ32TtFjiVmGmYKLEhB99_jBtJB1PkJ7nq0vGbtw',
            ),
            cop(
              'Government Contractors',
              'Professionals serving the mission in contracting roles.',
              'https://signal.group/#CjQKIPPTGuztM0xNC4VJdcBwpPyjgo3SH3V0uQFGNRT2tIeAEhAQ3babjKgmz_8mtMyzgM6Y',
            ),
            cop(
              'Legislative Staffers',
              'For staff serving in Congress, state assemblies, and city councils across all levels of legislative government.',
              'https://signal.group/#CjQKIMHu56zrxzMo-fHBkN0Tk7OJMGC_B8dhCnIFAvqYSCa9EhAqsv8WYqykcn-foPiE0pa0',
            ),
            cop(
              'Communications & Media Professionals',
              'For communications, public affairs, and media professionals across government and public institutions.',
              'https://signal.group/#CjQKIInTV0E_861ki7VntxwNiQpKjbaaieg4mM9h4_YBmQsPEhDx-GMCMdDkmt23zjqgxI1T',
            ),
            cop(
              'STEM Professionals',
              'For professionals in science, technology, engineering, and mathematics across public service.',
              'https://signal.group/#CjQKIAmr8DqYl7l-HmJl2K4N9tLn76PqNo_SvBTrZDzWUKUiEhChsw4hjWYQzJHq_lV8gsP_',
            ),
          ],
        },
        {
          blockType: 'cta',
          richText: richText(
            heading('Lead a Community of Practice', 'h3'),
            paragraph(
              'Chief and Deputy Chief of Practice roles are open in several communities. If you have the qualifications and bandwidth, apply to help lead one.',
            ),
          ),
          links: [
            {
              link: {
                type: 'custom',
                url: 'https://forms.gle/ScTj9N3r1ktauKxJA',
                label: 'Apply to Lead',
                newTab: true,
                appearance: 'default',
              },
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const resourcesPointsOfContactSlice: PageSlice = async (_payload) => {
  return [
    {
      slug: 'members/resources-points-of-contact',
      title: 'Resources, Points of Contact',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Members',
        richText: richText(
          heading('Resources & Points of Contact'),
          paragraph(
            'A central directory of MAPS National resources and the people to reach for member support.',
          ),
        ),
      },
      layout: [
        {
          blockType: 'content',
          columns: [
            {
              size: 'full',
              richText: richText(
                heading('Coming soon', 'h2'),
                paragraph(
                  'This member resource hub is under construction. We are compiling a curated set of resources and a directory of points of contact across MAPS National so members can quickly find the right person and information.',
                ),
                paragraph(
                  'Check back soon for the full listing. In the meantime, reach out through the contact page and our team will point you to the right resource.',
                ),
              ),
              enableLink: false,
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const pressSlice: PageSlice = async (payload) => {
  // Resolve the three PRESS Post categories by slug at runtime (never hardcode ids).
  // Slugs confirmed against the source CSV "MAPS National - Latest Update Categories":
  // press-releases, statements, staff-announcements. They live in the shared `categories` collection.
  const PRESS_SLUGS = ['press-releases', 'statements', 'staff-announcements']
  const cats = await payload.find({
    collection: 'categories',
    where: { slug: { in: PRESS_SLUGS } },
    limit: 0,
    depth: 0,
  })
  const pressCategoryIds = cats.docs
    .map((c) => c.id)
    .filter((v): v is number => typeof v === 'number')

  if (pressCategoryIds.length === 0) {
    payload.logger.warn(
      'press slice: no PRESS categories found (run the Latest Update Categories import); ArchiveBlock will show recent posts unfiltered.',
    )
  }

  return [
    {
      slug: 'press',
      title: 'Press',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Press',
        richText: richText(
          heading('Press Releases'),
          paragraph('Latest statements, press releases, and media features from MAPS.'),
          paragraph(
            'MAPS engages with local and national press to share announcements and areas of concern to its members and the Muslim public service community at large.',
          ),
          paragraph('For media requests, please contact us.'),
        ),
        links: [
          {
            link: {
              type: 'custom',
              url: '/contact',
              label: 'Contact',
              appearance: 'outline',
            },
          },
        ],
      },
      layout: [
        {
          blockType: 'archive',
          populateBy: 'collection',
          relationTo: 'posts',
          categories: pressCategoryIds,
          limit: 12,
        },
      ],
    },
  ] as unknown as PageData[]
}

const careerSupportSlice: PageSlice = async (payload) => {
  // The four content images were re-hosted as Media during the Phase 5 prose
  // import (idempotent by filename). Resolve their doc ids at runtime — never
  // hardcode db ids. If import:prose hasn't run, fall back gracefully and warn.
  const mediaIdByFilename = async (filename: string): Promise<number | null> => {
    const res = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    const id = res.docs[0]?.id
    if (typeof id !== 'number') {
      payload.logger.warn(
        `career-support: Media "${filename}" not found — run \`npm run import:prose\` first. ` +
          `Falling back (card images dropped / FeatureSplit omitted).`,
      )
      return null
    }
    return id
  }

  const [img110, img70, img29, img102] = await Promise.all([
    mediaIdByFilename('110.webp'),
    mediaIdByFilename('70.webp'),
    mediaIdByFilename('29.webp'),
    mediaIdByFilename('102.webp'),
  ])

  // CardGrid — uniform media across the grid, so if any card image is missing
  // we drop to mediaType 'none' rather than seeding a half-imaged grid.
  const cardImages = [img110, img70, img29]
  const haveAllCardImages = cardImages.every((id): id is number => typeof id === 'number')

  const cardGrid = {
    blockType: 'cardGrid',
    header: {
      enableHeader: true,
      eyebrow: 'Elevate',
      heading: 'Comprehensive career support resources for all career levels',
      body: richText(
        paragraph(
          'Navigate your public service journey with targeted support designed to break barriers and amplify your potential in government and civic leadership. MAPS Professional Development portfolio entails three unique areas of support, offering the best of our community and institutional access has to offer.',
        ),
      ),
      anchorId: 'main-section',
    },
    columns: '3',
    mediaType: haveAllCardImages ? 'image' : 'none',
    items: [
      {
        ...(haveAllCardImages ? { image: img110 } : {}),
        heading: '"MAPS Academy" Webinars, Workshops & Direct Services',
        body: richText(
          paragraph(
            'Gain critical skills through tailored training programs addressing unique challenges in public service careers. MAPS Academy offers members virtual webinars on entering or advancing public service pathways and several exclusive one-on-one services to build specialized resumes, hone interview skills, navigate obscure applications & more.',
          ),
        ),
      },
      {
        ...(haveAllCardImages ? { image: img70 } : {}),
        heading: 'Referrals & Placement Support for Fellowships & Appointments',
        body: richText(
          paragraph(
            'Access curated, member-only job listings and strategic placement assistance across federal, state, and local government sectors. Fellowships requiring member and alumni nominations, internal vacancy announcements, and direct referrals by MAPS to White House, Statehouse, and local government administrations advance our best and brightest to key public service roles.',
          ),
        ),
      },
      {
        ...(haveAllCardImages ? { image: img29 } : {}),
        heading: 'Professional Networking & Communities of Practice',
        body: richText(
          paragraph(
            'Connect with a powerful network of Muslim American professionals committed to creating meaningful impact. Our membership connection services provide introductions to fellow members within specific fields or agencies, while organized Communities of Practice based on career track & profession allow communal networking & knowledge sharing.',
          ),
        ),
      },
    ],
  }

  // FeatureSplit — `image` is required; only place the block when its image
  // resolved, otherwise omit it (seeding a null required upload would throw).
  const layout: PageData['layout'] = [cardGrid as unknown as PageData['layout'][number]]
  if (typeof img102 === 'number') {
    layout.push({
      blockType: 'featureSplit',
      eyebrow: 'Grow',
      imageSide: 'right',
      heading: 'MAPS Academy Training Series',
      body: richText(
        paragraph(
          'While many of our MAPS Academy offerings on navigating specific public service processes from the most junior internship and entry level placements to the most senior appointments and Senate confirmations remain internal and exclusive to members, MAPS releases several recorded sessions to the public.',
        ),
      ),
      links: [
        {
          link: {
            type: 'custom',
            url: 'https://www.youtube.com/channel/UCb5T3l6hpKdWCFBltCmX-5g',
            newTab: true,
            label: 'YouTube Channel',
            appearance: 'outline',
          },
        },
      ],
      image: img102,
    } as unknown as PageData['layout'][number])
  }

  return [
    {
      slug: 'programs/career-support',
      title: 'Career Support',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Empower',
        richText: richText(
          heading('Advance your career, serve your community and country'),
          paragraph(
            'MAPS actively and comprehensively supports its Members, Associates, and partner networks transform their professional journey with strategic assistance designed for Muslim American public servants. Break through barriers and unlock your potential in government and civic leadership.',
          ),
        ),
        links: [
          {
            link: {
              type: 'custom',
              url: '#main-section',
              label: 'Learn more',
              appearance: 'default',
            },
          },
        ],
      },
      layout: [
        ...layout,
        {
          blockType: 'testimonials',
          type: 'career',
          populateBy: 'collection',
          limit: 0,
          eyebrow: 'Career support',
          heading: 'What our career-support members say',
        },
      ],
    },
  ] as unknown as PageData[]
}

const communityBuildingSlice: PageSlice = async (_payload) => {
  const contactLink = {
    link: {
      type: 'custom',
      url: '/contact',
      label: 'Contact',
      appearance: 'outline',
      newTab: false,
    },
  }

  return [
    {
      slug: 'programs/community-building',
      title: 'Community Building',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Programs',
        richText: richText(
          heading('Community Building'),
          paragraph(
            'MAPS is proud to build formal communities based on state of residence, place of employment, and chosen profession.',
          ),
        ),
        links: [contactLink],
      },
      layout: [
        {
          blockType: 'faq',
          layout: 'sideBySide',
          header: {
            enableHeader: true,
            eyebrow: 'Community Building',
            heading:
              'MAPS State Committees, Chapter Employee Resource Groups & Communities of Practice',
            body: richText(
              paragraph(
                'MAPS is the first national non-profit that aims to support, reinforce, sustain and connect staff associations serving Muslim Americans in their government institutions, formal communities of Muslim public servants where they reside at the State and local level, and dedicated communities of practice for Muslim American public servants within their career track, subject matter, or professional field.',
              ),
              paragraph(
                'Muslim public servants form such groups to foster community, support professional networking and career development, contribute to their agencies’ personnel accommodation objectives, and increase employee morale, retention and productivity. Learn more about these vital communities and join or help build one today.',
              ),
              paragraph(
                'Contact MAPS National (info@mapsnational.org) below or our Outreach Committee (outreach@mapsnational.org) to learn more, connect with representatives of established Chapters and Muslim ERGs, or receive documentation and resources to get you started.',
              ),
            ),
            links: [contactLink],
          },
          items: [
            {
              question: 'MAPS State Committees',
              defaultOpen: false,
              answer: richText(
                paragraph(
                  'MAPS invites our Members and Associate Members across the country to build our network of communities in your State. These State committees connect members based on location and include Federal, State or local public servants serving or residing within the States below.',
                ),
                paragraph(
                  'State committees may be proposed and formed by MAPS National members residing in any US State. MAPS State committees are supported by MAPS’ Board and Advisory Council, and have access to MAPS programming, services, resources, volunteers, contacts, distribution lists, collective support, advocacy toward local initiatives and concerns, and the joint resources of MAPS chapters and partner organizations.',
                ),
                paragraph(
                  'MAPS State Committees engage both virtually and in person across their respective states where local members meet, support one another, share resources, and hold private gatherings and public events. MAPS National supports and maintains active and growing communities in New York, Massachusetts, Texas, Illinois, Michigan, California, and New Jersey, with additional committees being formed.',
                ),
                paragraph(
                  'Please reach out to Outreach Director Aamer Uddin to join or help lead a new chapter in your State via outreach@mapsnational.org. Where State Committee Presidents are in place, please direct communications or questions on all further leadership, membership, operations, and services offered to them, or contact them below:',
                ),
                paragraph(
                  'michigan@mapsnational.org, newyork@mapsnational.org, california@mapsnational.org, massachusetts@mapsnational.org, texas@mapsnational.org, newjersey@mapsnational.org, illinois@mapsnational.org',
                ),
              ),
            },
            {
              question: 'Employee Resource Groups (ERGs)',
              answer: richText(
                paragraph(
                  'Also known as Affinity Groups or Voluntary Employee Organizations (VEOs), Employee Resource Groups (ERGs) are a way to cultivate a supportive, welcoming, inclusive and equitable work environment in your Federal, State or local agency, department, or other public institution.',
                ),
                paragraph(
                  'They serve as a critical link between employees and senior management, connecting a diverse array of backgrounds, beliefs, and experiences to each Department’s diversity managers, Human Capital staff, and key decision-makers. They support the personal growth and professional development of their members and they help develop programs and learning opportunities not only for themselves but for the rest of the workforce.',
                ),
                paragraph(
                  'ERGs have the pulse of their community and their constituents and work with management to develop and execute recommendations to solve mission-related problems before they become large-scale issues. While the Office of Personnel Management (OPM) no longer supports Federal Department and Agency sponsorship of ERGs, many State and local government institutions offer support and recognition to associations that represent employees and contractors of a protected group, gender, ethnic or national origin, sexual orientation, race, faith, or special interest.',
                ),
                paragraph(
                  'There is now a growing momentum for Muslim professionals to be similarly represented across government offices. MAPS assists its members to build thriving communities in their government workplaces. MAPS also helps link these communities through a national network alongside other closely related public service organizations.',
                ),
              ),
            },
            {
              question: 'Communities of Practice (COP)',
              answer: richText(
                paragraph(
                  'MAPS is proud to launch several Communities of Practice (COP) connecting members across the country and Federal, State or local government agencies based on common professions or interests.',
                ),
                paragraph(
                  'We welcome you to join our growing Communities of Practice, or career-specific subgroups exclusively for MAPS Members and Associate Members who are current or prospective professionals in those fields or professions. Each community is led, coordinated and supported by a Chief of Practice and Deputy Chief of Practice who are experienced public servants across Federal, State or local government.',
                ),
                paragraph(
                  'MAPS currently supports active communities serving: National Security, Foreign Policy and Intelligence Professionals; International Development Professionals; Health Professionals; Economists; Engineers; Communications Specialists; Lawyers & Legal Professionals; Education Professionals; and Legislative Staffers.',
                ),
                paragraph(
                  'If these COPs represent your current or desired career focus and you would like to connect with others in these fields, direct invitations to join the dedicated groups on the Signal messaging app can be found in each MAPS Member email, where you would be further vetted for inclusion. New members may also indicate which COP they are interested in joining via the membership application. Contact our Professional Development team via profdev@mapsnational.org to learn more.',
                ),
              ),
            },
            {
              question: 'MAPS Institutional Representatives',
              answer: richText(
                paragraph(
                  'MAPS Members may also serve as MAPS Institutional Representatives at their Federal, State or local agencies. Representatives serve as liaisons between our national network and their institution, and as a point of contact for colleagues interested in building informal communities until formal MAPS Chapters become viable.',
                ),
              ),
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const legalAdvocacySlice: PageSlice = async (payload) => {
  // Resolve the four content images (re-hosted by scripts/import-prose.ts) to
  // Media doc ids at runtime by filename — never hardcode DB ids.
  const mediaIdByFilename = new Map<string, number>()
  for (const filename of ['17_1.webp', '24_1.webp', '25_1.webp', '14_1.webp']) {
    const found = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
    })
    const id = found.docs[0]?.id
    if (typeof id === 'number') mediaIdByFilename.set(filename, id)
  }
  const mediaId = (filename: string): number | undefined => mediaIdByFilename.get(filename)

  // A single outline CTA, matching the source "is-secondary" buttons.
  const cta = (label: string, url: string, newTab = false) => ({
    link: { type: 'custom', url, label, newTab, appearance: 'outline' },
  })

  const featureImage = mediaId('14_1.webp')

  return [
    {
      slug: 'programs/legal-advocacy',
      title: 'Legal Advocacy',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Empower',
        richText: richText(
          heading('Legal Advocacy'),
          paragraph(
            'MAPS actively and comprehensively supports its Members, Associates, and partner networks transform their professional journey with strategic assistance designed for Muslim American public servants. Break through barriers and unlock your potential in government and civic leadership.',
          ),
        ),
        links: [
          cta(
            'Email our Legal Advocacy Committee',
            'mailto:legaladvocacy@mapsnational.org?subject=Email%20from%20the%20Portal',
            false,
          ),
        ],
      },
      layout: [
        {
          blockType: 'cardGrid',
          header: {
            enableHeader: true,
            eyebrow: 'Guide',
            heading: 'Know Your Rights. Understand Redress. Navigate Processes.',
            body: richText(
              paragraph(
                'MAPS’ Legal Advocacy Committee (LAC) is proud to offer legal information in support of members facing adversity in their public service careers. Learn more below and either Join MAPS to submit a request, or offer your services.',
              ),
            ),
            anchorId: 'main-section',
          },
          columns: '3',
          mediaType: 'image',
          items: [
            {
              ...(mediaId('17_1.webp') ? { image: mediaId('17_1.webp') } : {}),
              heading: 'MAPS Legal Advocacy Support for Members Facing Workplace Issues',
              body: richText(
                paragraph(
                  'MAPS National supports its members across federal, state and local government who are facing or undergoing workplace adversity, discrimination, retaliation, bias, or hostile work environments based on religion, race, sex, or national origin. The Legal Advocacy Committee shares valuable insights, explains the processes for redress, and shares resources and pro bono, paid legal, and partner organization services.',
                ),
              ),
              links: [cta('Request support', '/join', true)],
            },
            {
              ...(mediaId('24_1.webp') ? { image: mediaId('24_1.webp') } : {}),
              heading: 'Volunteer Services in Support of Muslim American Public Servants',
              body: richText(
                paragraph(
                  'The Legal Advocacy Committee (LAC) for MAPS National is seeking pro bono attorneys to assist with Employment Discrimination cases. Our goal is to build a repository of employment or government attorneys willing to volunteer in the event the LAC needs to refer an individual to seek counsel. Please fill out this form to express your interest in supporting our efforts as a pro bono attorney, or recommend one, today.',
                ),
              ),
              links: [
                cta(
                  'Offer Legal Support',
                  'https://docs.google.com/forms/d/e/1FAIpQLSc6V0WoqSW5wQ_rFsmVh4YpmJVtBnT-oZOTPcBdEPOj1jJ-nA/viewform',
                  true,
                ),
              ],
            },
            {
              ...(mediaId('25_1.webp') ? { image: mediaId('25_1.webp') } : {}),
              heading: 'Knowledge Sharing & Professional Networking Among Members',
              body: richText(
                paragraph(
                  'Connect with a powerful network of Muslim American professionals committed to creating meaningful impact. Our membership connection services provide introductions to fellow members who have successfully navigated a range of workplace challenges and circumstances across a number of agencies to allow for communal networking & knowledge sharing when it matters most.',
                ),
              ),
              links: [cta('Request support', '/join', false)],
            },
          ],
        },
        {
          blockType: 'featureSplit',
          eyebrow: 'Explore',
          imageSide: 'right',
          heading: 'MAPS Advocacy & Accommodation Recordings',
          body: richText(
            paragraph(
              'Muslim Americans in Public Service shares its exclusive webinars alongside partners and allies on your rights as an employee, as well as trends, challenges and opportunities facing Muslim American public servants. These recorded sessions, events, and training webinars are publicly available, while internal and non-public programs are only shared on the MAPS member portal. Join MAPS as a Member or Associate today to gain full access.',
            ),
          ),
          links: [
            cta(
              'Policy & Rights on YouTube',
              'https://www.youtube.com/playlist?list=PL3vpn_hDyfXggwXmNbEyUy5Izt1lBbDdg',
              true,
            ),
          ],
          ...(featureImage ? { image: featureImage } : {}),
          anchorId: 'recordings',
        },
      ],
    },
  ] as unknown as PageData[]
}

const policyInitiativesSlice: PageSlice = async (payload) => {
  void payload

  return [
    {
      slug: 'programs/policy-initiatives',
      title: 'Policy Initiatives',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Programs',
        richText: richText(
          heading('Policy & Advocacy Initiatives'),
          paragraph('Supporting Federal, State & Local Government Staffers.'),
          paragraph(
            'Government works best when all public servants feel welcome in the workplace. Federal, State and local government elected officials and career government administrators should ensure that Muslim American employees are able to serve without fear of discrimination, retaliation, or disadvantage.',
          ),
          paragraph(
            'MAPS National, State Committees, and Chapter staff associations and ERGs across Federal, State, and local government aim to serve as strategic partners in fostering a culture of respect and accommodation within public institutions; support existing institutional efforts to maintain safe and conducive workplaces free of discrimination; and facilitate and promote the contributions and achievements of Muslim public service professionals.',
          ),
        ),
        links: [
          {
            link: {
              type: 'custom',
              url: '/contact',
              label: 'Contact',
              appearance: 'outline',
              newTab: false,
            },
          },
        ],
      },
      layout: [
        {
          blockType: 'faq',
          layout: 'sideBySide',
          header: {
            enableHeader: true,
            eyebrow: 'Policy & Advocacy',
            heading: 'Initiatives, toolkits & resources',
            body: richText(
              paragraph(
                'Please view these policy initiatives, toolkits and resources MAPS and its partners have developed to promote inclusive government. We welcome the review, dissemination and amplification of these substantive initiatives and resources by members, allies, government officials, and all Americans who value an effective government of and by the people.',
              ),
            ),
          },
          items: [
            {
              question: '1. Government Workplace Accommodations',
              answer: richText(
                paragraph(
                  'MAPS works alongside its esteemed partner organizations and coalitions to engage the White House, Federal Department leadership, Congressional Offices, Statehouses, City Halls and local government agencies on many of the following issues that continue to pose workplace challenges to Muslim American public servants.',
                ),
                paragraph(
                  'A. Prayer and meditation spaces — Government agencies must establish or maintain Muslim or interfaith prayer rooms across all agencies to better accommodate Muslim employees across the federal interagency and state and local government. Spaces have been previously established or currently maintained in the US Congress, State Department, Department of Transportation, Department of Commerce, and elsewhere. Many still lack them or have inconsistent, opaque processes for setting them up.',
                ),
                paragraph(
                  'B. Employee Resource Groups — The formation of ERGs for Muslim American staffers too often faces delays and discriminatory hurdles. MAPS Chapter ERGs have been previously established at the White House, and Departments of Justice, Commerce, Transportation, Labor, HHS, EPA, SBA, and others. Additional guidance and clarity may be communicated to administrators and department officials to help facilitate or expedite their formation and recognition, including designating a point of contact to shepherd applications through approval.',
                ),
                paragraph(
                  'C. Internal Communications — Government entities may strengthen messaging and internal communications against anti-Muslim bigotry within their departments and agencies. MAPS also encourages agencies to review and strengthen grievance processes in order to effectively prevent and address workplace harassment or discrimination on the basis of religion.',
                ),
                paragraph(
                  'D. Resource Availability — To help identify and prevent bias, MAPS urges agencies to coordinate with relevant civil society and civil rights organizations. Agencies may adopt the MAPS/ISPU Toolkit (see Section 4) to improve awareness of Muslim employee faith practices, including daily prayer, Friday congregational prayer, Ramadan fasting, and religious holidays, and where possible coordinate with Federal Centers for Faith-Based and Neighborhood Partnerships.',
                ),
                paragraph(
                  'E. Training — Government executives should work to eliminate anti-Muslim bias in workforce and national security trainings. MAPS urges that Islamophobia awareness courses piloted by ING, ISPU, America Indivisible, MPAC, and Emgage be scaled up and widely adopted, and that law enforcement agencies be better trained to engage with Muslim communities.',
                ),
              ),
              defaultOpen: false,
            },
            {
              question: '2. Data Collection on Religious Affiliation',
              answer: richText(
                paragraph(
                  'Federal, State, and local governments should collect and analyze disaggregated data on employees’ self-reported religious affiliations to measure demographic representation and senior workforce composition. The White House PPO has previously collected religion data alongside other demographic categories. Expanding this practice helps identify gaps and ensure an inclusive workplace for all underrepresented groups.',
                ),
              ),
            },
            {
              question: '3. Muslim American Heritage / Appreciation Month',
              answer: richText(
                paragraph(
                  'MAPS promotes the establishment of Muslim American Heritage Month at all levels of government, preferably during January to align with the academic school year. New Jersey, New York, Illinois, Georgia, and California have already passed State-level declarations, while Federal and Congressional efforts have been initiated but not finalized.',
                ),
              ),
            },
            {
              question: '4. MAPS / ISPU Toolkit for Government Administrators',
              answer: richText(
                paragraph(
                  'Developed with the Institute for Social Policy and Understanding (ISPU), this toolkit provides government officials with information about Muslim American identity, faith practices, and public service. It was created to address gaps in resource availability and awareness identified by MAPS since July of 2021 shortly after its establishment. MAPS encourages sharing this helpful resource with public administrators and human capital executives at every level.',
                ),
              ),
            },
            {
              question: '5. Government Roles & Bodies to Combat Anti-Muslim Hate',
              answer: richText(
                paragraph(
                  'MAPS supports the creation of dedicated government roles and institutional bodies at every level to monitor and combat anti-Muslim bigotry.',
                ),
                paragraph(
                  'A. Federal Government — Create a Special Envoy to Monitor and Combat Anti-Muslim Bigotry at the State Department and a domestic Special Representative, modeled on the existing envoy for Antisemitism. The House passed the Combating International Islamophobia Act in December 2021; the White House has executive authority to act without Congress. Canada and the EU have already established similar roles.',
                ),
                paragraph(
                  'B. State Government — Establish State-level commissions or advisory boards dedicated to combating Islamophobia. Virginia, for example, created a Commission to Combat Antisemitism through executive order in 2022, housed in the Office of the Governor and staffed by faith leaders, law enforcement, educators, and subject matter experts. This model demonstrates how States can take targeted action against religious bigotry, and MAPS urges States to extend the same commitment to all communities of faith.',
                ),
                paragraph(
                  'C. Local Government — Create dedicated municipal offices and roles to address anti-Muslim hate. New York City offers a leading example: the city maintains a Mayor’s Office to Combat Antisemitism, and under Mayor Zohran Mamdani established an Office of Community Safety in March 2026 with a hate crime prevention mandate. The NYC Commission on Human Rights has also led anti-Islamophobia campaigns and cultural competency workshops. The Mayor’s Guide to Countering Islamophobia, published by America Indivisible and the U.S. Conference of Mayors in 2025, provides a practical framework any municipality can adopt.',
                ),
              ),
            },
            {
              question: '6. Shariah-Compliant Retirement Plans',
              answer: richText(
                paragraph(
                  'Many Muslim Americans adhere to Shariah-compliant investing, which prohibits usury, conventional bonds, and certain other instruments. Muslim public servants at every level of government should not be forced to choose between their religious beliefs and their retirement benefits.',
                ),
                paragraph(
                  'A. Federal Government — The Federal Thrift Savings Plan (TSP), managed by the Federal Retirement Thrift Investment Board, currently allows a Mutual Fund Window of up to 25% to be allocated to alternative funds that include Shariah-compliant options. MAPS advocates for expanding this window to 100%. MAPS’ partners at Amana Mutual Funds offer resources on selecting compliant funds through the existing brokerage window.',
                ),
                paragraph(
                  'B. State Government — State employees typically participate in 457(b) or 403(b) retirement plans, which often have more limited investment menus than the Federal TSP. Some State plans offer self-directed brokerage accounts that allow employees to select Shariah-compliant funds, but many do not. MAPS encourages State governments to review their plan offerings and ensure self-directed brokerage options are available to all employees.',
                ),
                paragraph(
                  'C. Local Government — Municipal and county employees face similar constraints through their employer-sponsored retirement plans. MAPS urges local governments to work with their plan administrators to add self-directed brokerage windows or include Shariah-compliant fund options in their default investment menus, ensuring Muslim employees can participate fully without compromising their faith.',
                ),
              ),
            },
            {
              question: '7. Equity in Security Clearances (Federal-Specific)',
              answer: richText(
                paragraph(
                  'Many Muslim Federal employees have reported discrimination in security clearance interviews that go beyond SF-86 standard practice, or have had clearances denied without apparent cause or recourse. This creates a chilling effect on Muslim recruitment into the Federal workforce.',
                ),
                paragraph(
                  'MAPS calls for the revision of clearance processes to remove any discrimination on the basis of religious belief or affiliation, or establishing an independent audit, adjudication, or appeals process when such processes are conducted by independent Federal agencies or sub-national authorities.',
                ),
              ),
            },
            {
              question: 'Additional Workplace Issues',
              answer: richText(
                paragraph(
                  'MAPS welcomes additional accommodation issues affecting our members and the Muslim American community within government workplaces or beyond. Reach us at policy@mapsnational.org to submit your feedback or suggestions today to help make, and keep, our public institutions representative and conducive.',
                ),
              ),
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const publicSectorEngagementSlice: PageSlice = async (payload) => {
  // CardGrid `image` cards and the FeatureSplit `image` are upload relations to
  // the media collection — they need Media doc IDs, not path strings. The Phase 5
  // prose importer (scripts/import-prose.ts) already re-hosted these by filename
  // (originals committed under public/import/prose/), so resolve the IDs at runtime.
  const mediaIdByFilename = async (filename: string): Promise<number> => {
    const found = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    const id = found.docs[0]?.id
    if (typeof id !== 'number') {
      throw new Error(
        `private-sector-engagement: Media doc "${filename}" not found. Run "npm run import:prose" first (it re-hosts public/import/prose/${filename}).`,
      )
    }
    return id
  }

  const [govconImg, positioningImg, teamingImg, registerImg] = await Promise.all([
    mediaIdByFilename('36.webp'),
    mediaIdByFilename('15.webp'),
    mediaIdByFilename('25.webp'),
    mediaIdByFilename('24.webp'),
  ])

  return [
    {
      slug: 'programs/private-sector-engagement',
      title: 'Private Sector Engagement',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Empower',
        richText: richText(
          heading('MAPS Private Sector Engagement (PSE)'),
          paragraph(
            'The purpose of the MAPS Private Sector Engagement (PSE) Committee is to lead MAPS engagement with Muslim-led companies and organizations who partner with government agencies, also known as government contractors. While MAPS inherently serves government employees, we recognize and value the contributions of private entities working with the government as essential for government success.',
          ),
        ),
        links: [
          {
            link: {
              type: 'custom',
              url: 'mailto:private.sector@mapsnational.org?subject=Email%20from%20Website',
              label: 'Email the PSE Team',
              newTab: false,
              appearance: 'default',
            },
          },
        ],
      },
      layout: [
        // Feature grid — the source duplicates this section verbatim; include it ONCE.
        {
          blockType: 'cardGrid',
          header: {
            enableHeader: true,
            eyebrow: 'Elevate',
            heading:
              'Comprehensive support for Muslim Owned or Operated Private Firms & Contractors',
            body: richText(
              paragraph(
                'Navigate your public service journey as a private firm or contractor with targeted support designed to break barriers and amplify your potential in government and civic leadership. MAPS Private Sector Engagement (PSE) Committee offers three areas of support from the best our community and institutional access has to offer.',
              ),
            ),
            anchorId: 'main-section',
          },
          columns: '3',
          mediaType: 'image',
          items: [
            {
              image: govconImg,
              heading: 'GovCon Ecosystem Overview',
              body: richText(
                paragraph(
                  'The MAPS PSE Committee provides a concise, high-level understanding of how the government contracting ecosystem functions; clarifies key actors (agencies, primes, subcontractors) and how work flows; and aligns members on a shared understanding.',
                ),
              ),
            },
            {
              image: positioningImg,
              heading: 'Strategic Positioning for Firms',
              body: richText(
                paragraph(
                  'MAPS PSE Committee shares resources on how organizations should position themselves within the market, guides agency targeting, capability alignment, and long-term positioning, and supports more established organizations looking to refine their approach.',
                ),
              ),
            },
            {
              image: teamingImg,
              heading: 'Teaming & Partnership Strategy',
              body: richText(
                paragraph(
                  'PSE Committee support outlines how firms structure relationships (prime vs subcontractor), highlights best practices for building effective teams and partnerships, and emphasizes the importance of collaboration in winning and executing contracts.',
                ),
              ),
            },
          ],
        },
        // Closing call-to-register split.
        {
          blockType: 'featureSplit',
          eyebrow: 'Grow',
          imageSide: 'right',
          heading: 'Register with MAPS PSE Committee to Start',
          body: richText(
            paragraph(
              'The Committee leads on delivering activities that engage partner organizations, which starts with their enlistment and carries on to offering workshops and other services to help them understand and prepare for government contracting opportunities.',
            ),
            paragraph(
              'This valuable insider support includes learning programs and information sessions, networking events, and representation of our community in forums, small business meetings, and groups.',
            ),
            paragraph(
              'Register today by Joining MAPS as an Ally and checking off the box indicating your representation of a partner firm.',
            ),
          ),
          image: registerImg,
          links: [
            {
              link: {
                type: 'custom',
                url: '/join',
                label: 'Join MAPS as a PSE Member Here',
                newTab: true,
                appearance: 'default',
              },
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const federalEmploymentSlice: PageSlice = async (_payload) => {
  return [
    {
      slug: 'resources/federal-employment',
      title: 'Federal Employment',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Resources',
        richText: richText(
          heading('Federal & State Government Jobs', 'h1'),
          paragraph(
            'Muslim Americans in Public Service helps members navigate the many pathways to a career in Federal, State and local government.',
          ),
        ),
      },
      layout: [
        {
          blockType: 'faq',
          layout: 'sideBySide',
          header: {
            enableHeader: true,
            eyebrow: 'Career Resources',
            heading: 'Federal & State Government Employment Resources',
            body: richText(
              paragraph(
                'Outlined are many of the primary avenues to permanent careers within the Federal Executive Branch across the Interagency, both in Washington DC and across the United States closer to home, and entry points to State and local government opportunities, and jobs within the US Congress.',
              ),
              paragraph(
                'MAPS Mentorship and MAPS Academy programs aim to shed further light on the Federal application, employment, promotion, and advancement process. MAPS also offers extensive resume reviews on a one-on-one basis for registered members, and shares a range of additional resources, exclusive content, webinars, recordings and services toward public service opportunities that are available to Members and Associate Members only.',
              ),
              paragraph('Join MAPS to access our full suite of career and community support.'),
            ),
            links: [
              {
                link: {
                  type: 'custom',
                  url: '/contact',
                  label: 'Contact',
                  appearance: 'outline',
                  newTab: false,
                },
              },
            ],
          },
          items: [
            {
              question: 'Federal Detail Opportunities & Internships',
              answer: richText(
                paragraph(
                  'Open Opportunities is a government-wide program offering professional development opportunities to current federal employees and internships to students. The program facilitates collaboration and knowledge sharing across the federal government.',
                ),
                paragraph(
                  'An opportunity is an experience-based learning assignment with any agency across the federal government. Opportunities offer current Federal employees a way to develop and grow their professional skills and experience — all while keeping their current Federal job. Agencies benefit too, because opportunities are a great way to get extra help, learn from other agencies, and develop, engage and retain employees.',
                ),
                paragraph(
                  'The program offers a wide variety of real-world projects to work on for students looking for internships.',
                ),
                paragraph(
                  'Learn more and begin your search: https://www.usajobs.gov/search/results/?wt=15320&p=1',
                ),
              ),
            },
            {
              question: 'Public Service Fellowships',
              answer: richText(
                paragraph(
                  'There are many opportunities to enter or develop your career in public service by way of fellowships. These worthwhile programs serve as entry points into government for professionals of almost all career tracks and levels of experience. MAPS has compiled and arranged a list of selected fellowships for the benefit of our members and the general public.',
                ),
                paragraph(
                  'Explore Junior or Entry-Level Fellowships: /resources/public-service-fellowships-young-professionals',
                ),
                paragraph(
                  'Explore Mid-career and Senior Fellowships: /resources/public-service-fellowships-mid-career-to-senior-professionals',
                ),
              ),
            },
            {
              question: 'GoGovernment Federal Internship & Fellowship Finder',
              answer: richText(
                paragraph(
                  'The Federal government offers many exciting job opportunities, but they can be difficult to find, track and navigate, complicated by short application windows and information scattered across hundreds of different webpages.',
                ),
                paragraph(
                  'The GoGovernment Federal Internship Finder, created by the Partnership for Public Service, will simplify your search for federal opportunities. The tool compiles publicly accessible information about professional and academic opportunities in government for students and recent graduates into one centralized place.',
                ),
                paragraph(
                  'You can navigate the GoGovernment Federal Internship Finder here: https://www.paynefellows.org/',
                ),
              ),
            },
            {
              question: 'Federal Government (Executive Branch / Interagency)',
              answer: richText(
                paragraph(
                  'The Federal Government offers unique hiring paths to help hire individuals that represent our diverse society. Hiring paths include the general public of U.S. citizens, current or former Federal employees, veterans, military spouses, national guard and reserves, students and recent graduates, senior executives, individuals with a disability, family of overseas employees, Native Americans, and Peace Corps & AmeriCorps volunteers.',
                ),
                paragraph(
                  'To find additional information about Federal Government job openings, internships, and fellowships, visit the Office of Personnel Management (OPM) on USAJOBS.',
                ),
                paragraph(
                  'The Federal employment and application process is different from the private sector in many regards, and can be highly specific and obscure to most first-time applicants. OPM shares helpful information clarifying common myths about the hiring process.',
                ),
                paragraph(
                  'For additional support consider visiting GoGovernment, an initiative of the Partnership for Public Service that is designed to be your guide as you consider, apply, and secure federal employment.',
                ),
              ),
            },
            {
              question: 'White House (Non-Career Schedule C Political Appointments)',
              answer: richText(
                paragraph(
                  'Apart from career positions in the Federal government, applicants interested in serving in a political appointment in the current administration may apply for these non-career positions and should check back for active application processes and endorsement procedures.',
                ),
              ),
            },
            {
              question: 'United States Congress',
              answer: richText(
                paragraph(
                  'Employment opportunities with the U.S. House of Representatives and their Committees can be found at https://www.house.gov/employment, while opportunities with the U.S. Senate Offices and Committees can be found at https://www.senate.gov/pagelayout/visiting/h_multi_sections_and_teasers/employment.htm.',
                ),
              ),
            },
            {
              question: 'State & Local Government Jobs',
              answer: richText(
                paragraph(
                  'Browse state and local government jobs to explore other branches or levels of government employment.',
                ),
                paragraph(
                  'Civic Match by Work for America is a nonpartisan program connecting federal workers and campaign staff with meaningful roles in state and local governments across the country: https://www.workforamerica.org/civicmatch',
                ),
              ),
            },
            {
              question: 'Resources for Recently Terminated Federal Employees',
              answer: richText(
                paragraph(
                  'Civil Service Strong: People, organizations, and communities across the country join together to ensure civil servants have resources if they are targeted or attacked. Check back as resources come online and for monitoring of threats to the civil service.',
                ),
                paragraph(
                  'FedSupport, a project of the Partnership for Public Service, curates resources on a wide range of timely topics in response to the latest civil service news and developments.',
                ),
                paragraph(
                  'Unemployment Compensation For Federal Employees (UCFE) provides unemployment compensation for federal employees who have lost their employment at no fault of their own. Claims should be filed in the state where the employee’s last official duty station was located, with limited exceptions. See https://www.dol.gov/general/topic/unemployment-insurance and https://oui.doleta.gov/unemploy/docs/factsheet/UCFE_FactSheet.pdf.',
                ),
                paragraph(
                  'Open to Work: a guide to writing an Open to Work post on LinkedIn — https://thejobhopper.substack.com/p/when-and-how-to-use-open-to-work',
                ),
                paragraph(
                  'Federal News Network has advice on appeals, unemployment, health benefits, and life insurance for terminated probationary employees: https://federalnewsnetwork.com/hiring-retention/2025/02/there-is-help-for-probationary-employees-who-were-terminated/',
                ),
                paragraph(
                  'Maryland has a resource directory for federal workers, including unemployment insurance benefits, career guidance, and reemployment support: https://www.dllr.state.md.us/federalworkers/. Maryland’s American Job Centers provide job listings, referrals to training programs, placement services, resume assistance, and workshops: https://labor.maryland.gov/county/',
                ),
                paragraph(
                  'Virginia Career Works has helpful information on transitioning from the federal government, with tips and resources for federal employees who may be returning to the civilian workforce, plus free services including job listings, resume help, career coaching, and training programs: https://virginiacareerworks.com/',
                ),
              ),
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const jumuahServicesSlice: PageSlice = async (_payload) => {
  return [
    {
      slug: 'resources/jumuah-services',
      title: 'Jumuah Prayer Services in Washington, DC',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Friday Congregational Prayer',
        richText: richText(
          heading('Jumuah Services in Washington DC Metro Area'),
          paragraph(
            'Many Federal employees have established active Friday services within their offices to accommodate Muslim colleagues and avoid excessive disruptions during the work day. To help establish an employee resource group to build community and organize communal services at your Federal agency, learn more here.',
          ),
        ),
      },
      layout: [
        {
          blockType: 'mapLocationCards',
          eyebrow: 'Friday Congregational Prayer',
          heading: 'Jumuah Prayer Services Near Government Buildings',
          intro: richText(
            paragraph(
              'The following are selected Friday Jumuah prayer services available near most government buildings. Information current as of 4/2/2025.',
            ),
          ),
          enableMap: true,
          locations: [
            {
              name: 'George Washington University (1:15pm)',
              lat: 38.8997,
              lng: -77.0476,
              address: 'GWU Student Center, Room 406\n800 21st Street NW, Washington, DC 20037',
              email: 'education@gwmsa.com',
            },
            {
              name: 'Georgetown University (1:30pm)',
              lat: 38.9097,
              lng: -77.0743,
              address:
                'Bulldog Alley, Leavy Center Main Floor\n3800 Reservoir Rd. NW (37th Street & O St)\nWashington, DC 20057',
            },
            {
              name: 'U.S. Capitol Building (12:30pm)',
              lat: 38.8899,
              lng: -77.0091,
              address:
                '*Congressional Staffers and Guests Only — Contact MAPS to coordinate escort*\nRoom HC-5, First St. SE, Washington, DC 20004\nA valid government ID (e.g. driver’s license) is required for entry. Inform the guard where you are headed; they are familiar with “Muslim Friday Prayer” and will give you directions to the service.',
            },
            {
              name: 'Islamic Center on Massachusetts Avenue (12:30pm EST, 1:30pm EDT)',
              lat: 38.9171,
              lng: -77.0567,
              address: '2551 Mass Avenue NW, Washington, DC 20008',
              phone: '(202) 332-8343',
            },
            {
              name: 'Center DC (1:00pm & 2:00pm)',
              lat: 38.9092,
              lng: -77.0237,
              address:
                '1426 9th St NW Suite 100, Washington, DC 20001\nDue to space limitations, registration is required to attend.',
              linkLabel: 'RSVP for Jummah & Center DC events',
              linkUrl: 'https://centerdc.churchcenter.com/registrations',
            },
            {
              name: 'The Church of the Epiphany (1:00pm)',
              lat: 38.8982,
              lng: -77.029,
              address:
                '1317 G St., NW, Washington, DC 20005\nIn the basement of the church (towards 14th St). Located two blocks from Metro Center — serves the downtown working community. Hosted in the Church of the Epiphany, the only church on G street between 13th and 14th streets.',
            },
            {
              name: 'Islamic Center of America (1:30pm)',
              lat: 38.881,
              lng: -77.0166,
              address:
                '900 4th St., SW, Washington, DC 20024\nEntrance is on the I Street side, in the basement of “Christ United Methodist Church.” Roughly two blocks from the Waterfront Metro Station — serves the SW working community, right by Southwest Library.',
              phone: '(202) 437-1295',
            },
            {
              name: 'IMAAM Center in Silver Spring (12:15pm & 1:30pm)',
              lat: 39.0043,
              lng: -77.0375,
              address:
                '9100 Georgia Avenue, Silver Spring, MD 20910\nBlocks from downtown Silver Spring, close to several Federal buildings in or around Silver Spring.',
              phone: '(240) 233-6967',
            },
            {
              name: 'McLean Islamic Center (11:30am, 12:30pm & 1:30pm EST)',
              lat: 38.9269,
              lng: -77.2287,
              address: '8800 Jarrett Valley Drive, Vienna, VA 22182',
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const fellowshipsMidSeniorSlice: PageSlice = async (_payload) => {
  // Bold-linked program name followed by its description, matching the live
  // source's `<a><strong>Name</strong></a> — description` pattern (external
  // link, new tab).
  const bold = (value: string) => ({ ...text(value), format: 1 })
  const fellowship = (label: string, url: string, description: string) =>
    node('paragraph', {}, [
      node('link', { version: 3, fields: { linkType: 'custom', url, newTab: true } }, [
        bold(label),
      ]),
      text(` — ${description}`),
    ])

  return [
    {
      slug: 'resources/public-service-fellowships-mid-career-to-senior-professionals',
      title: 'Public Service Fellowships for Mid-Career to Senior Professionals',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Resources',
        richText: richText(
          heading('Public Service Fellowships', 'h1'),
          paragraph('Mid-Career to Senior Professionals'),
        ),
      },
      layout: [
        {
          blockType: 'faq',
          layout: 'sideBySide',
          header: {
            enableHeader: true,
            heading: 'Mid-Career to Senior Professionals',
            body: richText(
              paragraph(
                'There are many opportunities to develop your career in public service by way of fellowships. These worthwhile programs serve as entry points into government for professionals of almost all career tracks and levels of experience. As a starting point, MAPS has compiled and arranged this list of well-known fellowships for the benefit of our members and the general public. Please visit their respective sites below to learn more about what they offer, what they’re looking for, and important application deadlines.',
              ),
              paragraph(
                'The following are a selection of fellowships for mid career or senior professionals to enrich their careers in public service, or enter it for the first time from the private or non-profit sectors. These selective fellowships invite you to apply your experience, talents, research, or expertise in related areas, toward specific Federal agencies or groups of Federal or Congressional offices.',
              ),
            ),
            links: [
              {
                link: {
                  type: 'custom',
                  url: '/resources/public-service-fellowships-young-professionals',
                  label: 'More Fellowships',
                  appearance: 'default',
                  newTab: false,
                },
              },
              {
                link: {
                  type: 'custom',
                  url: '/contact',
                  label: 'Contact',
                  appearance: 'outline',
                  newTab: false,
                },
              },
            ],
          },
          items: [
            {
              question: 'Leadership & Public Administration',
              defaultOpen: false,
              answer: richText(
                fellowship(
                  'White House Fellowship',
                  'https://www.whitehouse.gov/get-involved/fellows/',
                  'White House Fellowships offer exceptional emerging leaders first-hand experience working at the highest levels of the Federal government. Selected individuals typically spend a year working as a full-time, paid Fellow to senior White House Staff, Cabinet Secretaries, and other top-ranking government officials. There are no formal age restrictions; employees of the Federal government are not eligible unless they are career military personnel.',
                ),
                fellowship(
                  'White House Leadership Development Program (WHLDP)',
                  'https://www.pic.gov/whldp/',
                  'Engages a diverse annual cohort of GS-15 career employees to work on the federal government’s highest priority, highest impact challenges. Sponsored by the Executive Office of the President and supported by the Performance Improvement Council.',
                ),
                fellowship(
                  'Excellence in Government Fellowship',
                  'https://ourpublicservice.org/programs/excellence-in-government-fellows-program/',
                  'The premier leadership development course for federal employees at the GS-14 to GS-15 levels. For more than 30 years, EIG has helped federal employees develop strong leadership skills through application-based learning, interactive activities, self-reflection, personalized coaching, and governmentwide networking.',
                ),
                fellowship(
                  'President’s Management Council Interagency Rotation Program',
                  'https://www.opm.gov/policy-data-oversight/training-and-development/leadership-development/#url=PMC-Interagency-Rotation-Prgm',
                  'Launched in 2011 by the PMC and CHCO Council to bolster cross-agency exposure for high-potential GS 13-15s through interagency rotation assignments that develop leadership competencies and broaden organizational experience.',
                ),
                fellowship(
                  'HillVets House Fellowship',
                  'https://www.hillvets.org/',
                  'HillVets is the community of Veterans, Servicemembers, and their supporters interested in governance, international affairs, policy and politics. It provides a fellowship for veterans interested in policy, politics, or government, and leadership training for veterans in the National Capitol Region.',
                ),
                fellowship(
                  'The Center for Ethics and the Rule of Law (CERL)',
                  'https://www.penncerl.org/',
                  'Affiliated with the Annenberg Public Policy Center at Penn, a non-partisan interdisciplinary institute dedicated to preserving and promoting ethics and the rule of law in national security, warfare, and democratic governance.',
                ),
                fellowship(
                  'The Millennium Fellowship',
                  'http://www.millenniumfellowship.org/#apply',
                  'A year-long, high-impact leadership accelerator for rising leaders from around the world and across sectors, pairing world-class leadership development resources with access to the Atlantic Council’s geopolitical expertise and global networks.',
                ),
                fellowship(
                  'AEI Leadership Network',
                  'http://www.aei.org/feature/leadership-network/',
                  'An exclusive policy education and professional development program for state-based, mid-career executives in the public, private, and non-profit sectors.',
                ),
              ),
            },
            {
              question: 'International Affairs / National Security',
              answer: richText(
                fellowship(
                  'Franklin Talent Exchange Partnership (FTEP)',
                  'https://careers.state.gov/work/fellowships/franklin-fellows/',
                  'A partnership program between the U.S. Department of State and private sector entities sharing an interest in advancing foreign policy priorities, offering a two-way exchange that brings in private-sector experts and sends State employees on assignment to partner organizations.',
                ),
                fellowship(
                  'The ASG Rising Leaders Program',
                  'https://www.aspensecurityforum.org/asg-rising-leaders',
                  'A year-long program under the aegis of the Aspen Strategy Group: participants attend the Aspen Security Forum, join tailored leadership seminars and discussions with foreign policy experts, and co-author policy papers, joining a lifetime alumni network.',
                ),
                fellowship(
                  'The National Security Fellows Program (FDD)',
                  'https://www.fdd.org/national-security-fellows-program/',
                  'A 12-month program supporting promising 30-40 year old professionals with networking, skill-building workshops, off-the-record dinners with senior officials, and roundtables with issue experts.',
                ),
                fellowship(
                  'The Shawn Brimley Next Generation National Security Leaders Fellowship (CNAS)',
                  'https://www.cnas.org/next-generation-programs/nextgeneration',
                  'A year-long, part-time professional development fellowship bringing together young professionals across sectors to learn leadership best practices, culminating in a week-long international study tour.',
                ),
                fellowship(
                  'The National Security Institute Fellows (GMU)',
                  'https://nationalsecurity.gmu.edu/fellows/',
                  'National security practitioners and industry leaders drawing on experience across the intelligence community, government, private sector, and academia, contributing scholarship on legal and practical national security challenges.',
                ),
                fellowship(
                  'The Strategy and Statecraft Fellowship (CSIS)',
                  'https://www.csis.org/programs/international-security-program/strategy-and-statecraft-fellowship',
                  'Monthly dinners on key topics in foreign policy, national security, and strategic thought featuring current and former senior officials, concluding with the Strategy and Statecraft Summit.',
                ),
                fellowship(
                  'The Nuclear Scholars Initiative (CSIS)',
                  'https://nuclearnetwork.csis.org/programs/nuclear-scholars-initiative/',
                  'Provides top graduate students and young professionals a venue to dialogue with senior experts on nuclear weapons issues across daylong monthly workshops over six months at CSIS.',
                ),
                fellowship(
                  'The Emissary Program (MilitaryMentors)',
                  'https://www.militarymentors.org/emissary',
                  'Trains industry leaders through a six-month cohort-style leadership curriculum to serve as mentors ("eMMissaries"), increasing organizational awareness and seeking opportunities to influence and develop others.',
                ),
                fellowship(
                  'Emerging as a Global Leader Experience (EaGLE) Program',
                  'https://globally.org/eagle',
                  'Accelerates the careers of emerging leaders in national security and public service through immersive virtual workshops on design thinking, lean startup methods, and strengths-based leadership.',
                ),
                fellowship(
                  'The Military Fellows Program (William & Mary PIPS)',
                  'https://www.wm.edu/offices/global-research/research-labs/pips/people/military-fellows/index.php',
                  'Pairs research fellows with active-duty military officers who mentor and lend strategic expertise throughout the academic year, from identifying emerging international challenges in the fall to providing analytical feedback on policy recommendations in the spring.',
                ),
                fellowship(
                  'National Security and Counterterrorism Fellowship (McCain Institute)',
                  'https://www.mccaininstitute.org/programs/national-security-counterterrorism/national-security-and-counterterrorism-fellowship/',
                  'Brings together promising rising leaders in national security and counterterrorism across Five Eyes partner nations, preparing character-driven leaders for future leadership.',
                ),
                fellowship(
                  'The McCain Global Leaders Program',
                  'https://www.mccaininstitute.org/programs/leadership-programs/mccain-global-leaders/',
                  'A 10-month fellowship supporting 25 character-driven leaders per cohort from around the world who are advancing democracy, human rights, and freedom, providing training, resources, and access to global networks.',
                ),
                fellowship(
                  'The USGLC (U.S. Global Leadership Coalition)',
                  'https://www.usglc.org/nextgen/',
                  'A year-long leadership training and engagement program for a diverse, bipartisan group of next-generation leaders, culminating in a seat on a USGLC State Advisory Committee.',
                ),
                fellowship(
                  'The Presidential Leadership Scholars Program',
                  'https://www.presidentialleadershipscholars.org/apply/',
                  'Challenges Scholars to develop their leadership skills through deep reflection and meaningful engagement across differing perspectives, drawing on the resources of four presidential foundations.',
                ),
                fellowship(
                  'The Great Leaders & Great Biographies Fellowship (Hertog Foundation)',
                  'https://hertogfoundation.org/programs/great-leaders-great-biographies',
                  'Uses the rigorous study of great biography to investigate geopolitics, leadership, and human character, with guest scholars and national security leaders.',
                ),
                fellowship(
                  'The CXO Fellows Program',
                  'https://www.cfo.gov/cxo-fellows/',
                  'A year-long virtual professional development program engaging the next generation of federal leaders in acquisition, financial management, human capital, IT, and data.',
                ),
                fellowship(
                  "New America's Fellows Program",
                  'https://www.newamerica.org/fellows/about/',
                  'Invests in journalists, scholars, filmmakers, and policy analysts who generate bold ideas, providing a competitive one-year term with an intellectual home, community, and resources to pursue their projects.',
                ),
                fellowship(
                  "The Wilson Center's Foreign Policy Fellowship Program (FPFP)",
                  'https://www.wilsoncenter.org/foreignpolicyfellowship',
                  'A six-week seminar series encouraging Fellows to debate key global issues with leading foreign policy thinkers, concluding with a bipartisan foreign policy roleplay scenario.',
                ),
                fellowship(
                  'The Rising Experts Program (YPFP)',
                  'https://www.ypfp.org/amplify/fellowship-program/',
                  'A roughly year-long writing initiative pairing young professionals with editors to build writing skills and a portfolio of published analysis and op-eds.',
                ),
                fellowship(
                  'The Technology and National Security Fellowship (NSIN)',
                  'https://www.nsin.mil/tnsf/',
                  'A one-year Department of Defense fellowship embedding recent advanced-degree graduates with key decision-makers in the Pentagon or on Capitol Hill to address technology and national security policy.',
                ),
                fellowship(
                  'The Truman Project',
                  'https://www.trumanproject.org/membership/membership-overview',
                  'A national security leadership network of over 2,000 members, admitted by competitive application across three cohorts: Fellows, Partners, and the Defense Council.',
                ),
                fellowship(
                  'The National Security & Sino-American Technology Competition Fellowship (Hertog Foundation)',
                  'https://hertogfoundation.org/programs/national-security-sino-american-technology-competition-fellowship',
                  'Educates the next generation of East Asia strategists and national security generalists on how technology shapes U.S.-China strategic rivalry.',
                ),
                fellowship(
                  'The Public Interest Fellowship (TPIF)',
                  'https://publicinterestfellowship.org/',
                  'Operates four programs, including a flagship two-year fellowship, identifying and developing future leaders devoted to liberty and the public interest across policy and journalism.',
                ),
                fellowship(
                  'The National Defense Fellowship (NDF)',
                  'https://www.alexanderhamiltonsociety.org/rri-ahs-national-defense-fellowship',
                  'A joint program of the Alexander Hamilton Society and the Ronald Reagan Institute educating roughly 20 advanced students through a Peace Through Strength Boot Camp and the Reagan National Defense Forum.',
                ),
                fellowship(
                  'Defense Ventures (Shift, with AFWERX)',
                  'https://www.shift.org/dvp-cohorts/seventeen',
                  'An 8-week fellowship identifying emerging innovators from the Department of Defense and facilitating industry immersions at venture capital firms, incubators, and startups.',
                ),
                fellowship(
                  'The German-American Young Leaders Conference',
                  'https://www.atlantik-bruecke.org/en/the-young-leaders-program/',
                  'An intensive, interdisciplinary exchange on current transatlantic issues that builds professional and personal bridges across the Atlantic, featuring leading public figures as guest speakers.',
                ),
                fellowship(
                  "The Heritage Foundation's George C. Marshall Fellows Program",
                  'https://www.heritage.org/george-c-marshall-fellowship',
                  'Gives exceptional young professionals a comprehensive overview of national security principles and the practice of strategic leadership.',
                ),
                fellowship(
                  'The Carnegie Ethics Fellowship',
                  'https://www.carnegiecouncil.org/initiatives-issues/carnegie-ethics-fellows',
                  'A two-year fellowship developing the next generation of ethical leaders from business, government, academia, and non-governmental organizations through values-driven, reflective leadership work.',
                ),
                fellowship(
                  'Harold W. Rosenthal Fellowship in International Relations',
                  'https://gogovernment.org/fellowship/harold-w-rosenthal-fellowship-in-international-relations/',
                  'Offers outstanding, civic-minded graduate students in international affairs a summer working to solve major national and global challenges.',
                ),
                fellowship(
                  'The Herbert Scoville Jr. Peace Fellowship Program',
                  'https://scoville.org/apply/application-information/',
                  'Full-time, six-to-nine-month fellowships in Washington, DC for recent college and graduate alumni to work with nonprofit, public-interest organizations addressing peace and security issues.',
                ),
                fellowship(
                  'CSIS Fellowship: Enriching the Future of Foreign Policy',
                  'https://www.csis.org/programs/executive-education/university-programs/csis-fellowship-enriching-future-foreign-policy',
                  'A semester-long fellowship for rising sophomores, juniors, and seniors from any academic background who want to prepare for a career in the policy field.',
                ),
                fellowship(
                  'The Belfer Center National Security Fellowship (Harvard)',
                  'https://www.belfercenter.org/fellowship/national-security-fellowship',
                  'A 10-month research fellowship for U.S. military officers at the Lt. Col./Colonel rank and their civilian counterparts who show promise of rising to the most challenging leadership positions.',
                ),
                fellowship(
                  'The Abshire-Inamori Leadership Academy (AILA) at CSIS',
                  'https://www.csis.org/programs/executive-education/leadership-development/aila-international-fellowship',
                  'An intensive week of seminars and experiential learning equipping aspiring global leaders to be effective and ethical changemakers.',
                ),
                fellowship(
                  'The Executive Leaders Program (ELP, Naval Postgraduate School CHDS)',
                  'https://www.chds.us/c/academic-programs/elp/',
                  'A non-degree, graduate-level program for senior homeland security and public safety leaders, developing critical thinking through a diverse, cross-functional cohort.',
                ),
                fellowship(
                  'The International Strategy Forum (ISF, Schmidt Futures)',
                  'https://isf.schmidtfutures.com/fellowship/',
                  'Chaired by Fareed Zakaria and Jared Cohen, seeks out non-traditional talent across boardrooms, newsrooms, labs, and policy councils, equipping rising leaders in technology and international affairs to tackle hard global problems.',
                ),
                fellowship(
                  'The Irregular Warfare Initiative Nonresident Fellows Program',
                  'https://irregularwarfare.org/iwi-fellows/',
                  'A network of academics, practitioners, and policy makers advancing research and discussion on irregular warfare, with opportunities to present research and travel.',
                ),
                fellowship(
                  'The Robert and Marion Oster National Security Affairs Fellows (NSAF) Program (Hoover Institution)',
                  'https://www.hoover.org/fellows/category/national-security-affairs-fellows',
                  'Gives a high-ranking military or government official with extensive foreign policy experience an academic year at Hoover to conduct independent research and mentor students.',
                ),
                fellowship(
                  'The Bochnowski Family Veteran Fellowship Program (VFP, Hoover Institution)',
                  'https://www.hoover.org/veteran-fellowship-program',
                  'A nonresidential, year-long, project-based program for 10 military veterans accelerating solution-finding on public-sector challenges aligned with Hoover’s research priorities.',
                ),
                fellowship(
                  'The International Affairs Fellowship (IAF, CFR)',
                  'https://www.cfr.org/fellowships/international-affairs-fellowship',
                  'Bridges the gap between the study and making of U.S. foreign policy: academics are placed in policy-oriented public service settings and government officials in scholarly settings.',
                ),
                fellowship(
                  'David Rockefeller Fellows: North America (Trilateral Commission)',
                  'https://www.trilateral.org/about/david-rockefeller-fellows-north-america/',
                  'For applicants 35 or younger with strong potential for future leadership, joining the Commission’s annual meetings as full participants with costs of attendance covered.',
                ),
                fellowship(
                  'The Artificial Intelligence Lab (Wilson Center)',
                  'https://www.wilsoncenter.org/artificial-intelligence-lab',
                  'A six-week seminar series introducing participants to foundational AI topics — machine learning, neural networks, autonomous systems, and AI’s implications for national security — led by top technologists and scholars.',
                ),
              ),
            },
            {
              question: 'Science, Tech, Engineering & Math',
              answer: richText(
                fellowship(
                  'ASME Federal Government Fellowship Program',
                  'https://www.asme.org/government-relations/federal-fellows-program',
                  'The American Society of Mechanical Engineers established the first engineering-society Federal Government Fellowship in 1973, enabling selected members to spend a year providing engineering and technical advice to policy makers in Congress, the White House, and federal agencies.',
                ),
                fellowship(
                  'Engineering & International Development Fellowship (IEEE-USA)',
                  'https://ieeeusa.org/advocacy/government-fellowships/usaid-fellowships/',
                  'Fellows serve as advisors to the U.S. Agency for International Development (USAID), providing technical expertise while contributing to the foreign policy process.',
                ),
                fellowship(
                  'Jefferson Science Fellows Program (JSF)',
                  'https://sites.nationalacademies.org/PGA/Jefferson/index.htm',
                  'Engages the American academic STEM and medical communities in U.S. foreign policy and international development; tenured faculty spend a year advising at the U.S. Department of State or USAID.',
                ),
                fellowship(
                  'AIP State Department Science Fellowship Program',
                  'https://www.aip.org/policy/fellowships/state-department',
                  'An American Institute of Physics fellowship enhancing the science & technology capacity of the State Department by enabling scientists to work a one-year term at headquarters; mid- and late-career professionals are encouraged to apply.',
                ),
                fellowship(
                  'Presidential Innovation Fellowship (PIF)',
                  'https://presidentialinnovationfellows.gov/',
                  'Pairs industry’s top technologists, designers, and strategists with federal changemakers as one-year "entrepreneurs in residence," bringing data science, design, engineering, product, and systems thinking into government at the GS-15 senior level.',
                ),
                fellowship(
                  'The Artificial Intelligence Lab (Wilson Center)',
                  'https://www.wilsoncenter.org/artificial-intelligence-lab',
                  'A six-week seminar series introducing participants to foundational AI topics — machine learning, neural networks, autonomous systems, and AI’s implications for national security — led by top technologists and scholars.',
                ),
              ),
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const fellowshipsYoungSlice: PageSlice = async (_payload) => {
  // Linked program-name paragraph — restores the outbound link Webflow carried
  // on the bolded program name (opens in a new tab, since every target is external).
  const progLink = (label: string, url: string) =>
    node('paragraph', {}, [linkNode(label, url, true)])

  return [
    {
      slug: 'resources/public-service-fellowships-young-professionals',
      title: 'Public Service Fellowships for Young Professionals',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Resources',
        richText: richText(
          heading('Public Service Fellowships — Young Professionals', 'h1'),
          paragraph(
            'There are many opportunities to develop your career in public service by way of fellowships. These worthwhile programs serve as entry points into government for professionals of almost all career tracks and levels of experience. As a starting point, MAPS has compiled and arranged this list of well-known fellowships for the benefit of our members and the general public. Please visit their respective sites below to learn more about what they offer, what they’re looking for, and important application deadlines.',
          ),
          paragraph(
            'The following are a selection of fellowships for students, PhD candidates, post-doctorates, and young professionals. These selective fellowships build up professional experience or facilitate entry into specific Federal agencies, Federal or Congressional offices based on area of study or career track, or provide living and learning accommodations to DC-bound young professionals.',
          ),
        ),
      },
      layout: [
        {
          blockType: 'faq',
          layout: 'sideBySide',
          header: {
            enableHeader: true,
            eyebrow: 'Fellowships',
            heading: 'Browse fellowships by field',
            body: richText(
              paragraph(
                'Expand a category to explore fellowships aligned with that area of study or career track. Each listing links out to the program’s own site for full eligibility details, benefits, and application deadlines.',
              ),
            ),
            links: [
              {
                link: {
                  type: 'custom',
                  url: '/resources/public-service-fellowships-mid-career-to-senior-professionals',
                  label: 'More Fellowships',
                  appearance: 'default',
                },
              },
              {
                link: {
                  type: 'custom',
                  url: '/contact',
                  label: 'Contact',
                  appearance: 'outline',
                },
              },
            ],
            anchorId: 'fellowships',
          },
          items: [
            {
              question: 'Muslim Public Service Fellowships',
              defaultOpen: false,
              answer: richText(
                progLink(
                  'Muslim Public Service Network (MPSN) – Summer Fellowship',
                  'https://www.muslimpublicservice.org/',
                ),
                paragraph(
                  'Since 1994, the MPSN Fellowship has been a one-of-a-kind summer experience that educates, connects, and inspires talented Muslims to make a difference through public service. Components of the MPSN Summer Fellowship include cooperative living for students and young professionals undertaking summer internships in Washington, D.C., and career mentoring from well-placed MPSN alumni. Through living, learning, and working together in the MPSN residence, fellows build relationships across ideological differences, while the experience includes an eight-week graduate level lecture series on Islam and public ethics.',
                ),
                progLink(
                  'Congressional Leadership Development Program (CLDP)',
                  'https://cldp.org/',
                ),
                paragraph(
                  'Now powered by the Muslim Public Affairs Council (MPAC), CLDP provides unique access to networks inside government departments, sectors, support groups and other allies in Washington. CLDP trains fellows to engage with elected officials and public figures in ways that create discourse and influence policy change. Accepted fellows will work with MPAC staff to apply for and secure internships/fellowships on Capitol Hill throughout February and March. The summer program itself lasts 10 weeks.',
                ),
              ),
            },
            {
              question: 'Leadership & Public Administration',
              answer: richText(
                progLink(
                  'White House Fellowship',
                  'https://www.whitehouse.gov/get-involved/fellows/',
                ),
                paragraph(
                  'White House Fellowships offer exceptional emerging leaders first-hand experience working at the highest levels of the Federal government. Selected individuals typically spend a year working as a full-time, paid Fellow to senior White House Staff, Cabinet Secretaries, and other top-ranking government officials. There are no formal age restrictions; the Fellowship program was created to give selected Americans the experience of government service early in their careers. Employees of the Federal government are not eligible unless they are career military personnel.',
                ),
                progLink(
                  'APSA Congressional Fellowship Program for Political Scientists',
                  'https://www.apsanet.org/cfp',
                ),
                paragraph(
                  'The American Political Science Association (APSA) Congressional Fellowship gives early to mid-career political scientists an opportunity to learn more about Congress and the legislative process. Office assignments as full-time legislative aides in the House of Representatives and/or Senate for candidates with a PhD completed within the last 15 years or a dissertation near completion, and a scholarly interest in Congress and the policymaking process.',
                ),
                progLink(
                  'International Leadership Foundation (ILF) Civic Fellowship Program',
                  'https://www.ilfnational.org/fellowship.html',
                ),
                paragraph(
                  'The International Leadership Foundation Civic Fellowship is a civic leadership development program designed specifically to foster the next generation of Asian American and Pacific Islander (AAPI) leaders in public service. ILF Civic Fellowship provides an 8 to 10-week public service internship at federal agencies, scholarships, and a variety of seminars and workshops on civic engagement and career, personal, and leadership development.',
                ),
                progLink(
                  'Running Start Congressional Fellowship',
                  'https://runningstart.org/college-programs/',
                ),
                paragraph(
                  'A seasonal lecture series that meets monthly and provides young working professionals aspiring for a career in US foreign policy, or in the early stages of their career, the opportunity to engage and interact with current and former senior-ranking US policymakers, diplomats and military officials.',
                ),
                progLink(
                  'Local Government Management Fellowship (LGMF)',
                  'https://icma.org/local-government-management-fellowship',
                ),
                paragraph(
                  'The Local Government Management Fellowship is a career development opportunity for recent graduate-degree recipients pursuing careers in local government management, offering a full-time placement and mentorship in a participating local government.',
                ),
                progLink(
                  'Jamestown’s Young Professionals Program',
                  'https://jamestown.org/programs/jamestowns-young-professionals-program/',
                ),
                paragraph(
                  'A program that connects young working professionals aspiring for a career in US foreign policy, or in the early stages of their career, with current and former senior-ranking US policymakers, diplomats, and military officials.',
                ),
                progLink(
                  'The French-American Foundation Young Leaders Program',
                  'https://frenchamerican.org/young-leaders/apply/',
                ),
                paragraph(
                  'The Young Leaders Program brings together a select group of emerging leaders from France and the United States for a two-year program of cross-cultural exchange and dialogue. Participants agree to the Young Leaders Responsibilities Charter; the Foundation reserves the right to withdraw a Young Leader who does not abide by the charter.',
                ),
                progLink(
                  'The Shawn Brimley Next Generation National Security Leaders Fellowship',
                  'https://www.cnas.org/next-generation-programs/nextgeneration',
                ),
                paragraph(
                  'A year-long, part-time professional development fellowship that aims to bring together young professionals across sectors within the national security field to learn best practices and lessons in leadership. Next Gen fellows engage with thought leaders on leadership principles and national security through various engagements, including a monthly dinner series. The program culminates in a week-long international study tour to delve deeper into national security issues and leadership.',
                ),
                progLink(
                  'The Young Strategists Forum',
                  'https://www.gmfus.org/young-strategists-forum',
                ),
                paragraph(
                  'Run by the German Marshall Fund, the Young Strategists Forum seeks to develop a new generation of strategic thinkers and equip them with the skills to successfully navigate a world in flux. Held in Tokyo, the program centers on the US-Japan alliance and security dynamics in the Indo-Pacific region through lectures, a 36-hour simulation exercise, meetings with policymakers and journalists, and a study tour.',
                ),
              ),
            },
            {
              question: 'International Affairs & Law',
              answer: richText(
                progLink(
                  'Charles B. Rangel International Affairs Fellowship Program',
                  'http://rangelprogram.org/',
                ),
                paragraph(
                  'For college seniors or graduates who want to become Foreign Service Officers in the U.S. Department of State, the Rangel Graduate Fellowship Program provides benefits of up to $95,000 over two years toward a two-year master’s degree, arranges internships on Capitol Hill and at U.S. embassies, and provides mentorship and professional development support.',
                ),
                progLink(
                  'Robertson Foundation for Government Fellowships',
                  'https://rfg.org/overview',
                ),
                paragraph(
                  'RFG seeks to support outstanding graduate students from public service, policy and administration schools who represent diverse backgrounds and perspectives, with a common embrace of government service as a future calling. By supporting their education through academic fellowships and funding for government internships, RFG enables fellows to emerge from graduate school with lower or no financial burden so that they may pursue federal careers with complete dedication.',
                ),
                progLink(
                  'Thomas R. Pickering Graduate Foreign Affairs Fellowship',
                  'https://pickeringfellowship.org/',
                ),
                paragraph(
                  'The Thomas R. Pickering Foreign Affairs Fellowship Program attracts and prepares outstanding young people for Foreign Service careers in the U.S. Department of State. It welcomes the application of members of minority groups historically underrepresented in the State Department, women, and those with financial need. Based on the fundamental principle that diversity is a strength in our diplomatic efforts, the program values varied backgrounds, including ethnic, racial, social, and geographic diversity.',
                ),
                progLink(
                  'Mike Mansfield Fellowship Program',
                  'https://mansfieldfellows.org/about-the-fellowship/',
                ),
                paragraph(
                  'The Mansfield Fellowship Program was established by the U.S. Congress in 1994 to build a corps of U.S. Federal government employees with proficiency in the Japanese language and practical, firsthand knowledge about Japan and its government. Applicants must be federal government employees with at least two consecutive years of service and are subsequently required to serve at least two years in the Federal government.',
                ),
                progLink(
                  'Barbara A. Ringer Copyright Honors Program',
                  'https://www.copyright.gov/about/special-programs/ringer.html',
                ),
                paragraph(
                  'The Ringer Honors Program offers 18-24-month paid fellowships for attorneys in the initial stages of their careers who demonstrate promising ability and interest in copyright law. Ringer Fellows work closely with United States Copyright Office senior attorneys on a range of copyright-related law and policy matters.',
                ),
                progLink('Dave Kennedy Fellowship', 'https://ij.org/opportunities/students/'),
                paragraph(
                  'The Institute for Justice recruits the most talented law students from across the country as summer fellowship program participants, called Dave Kennedy Fellows. The program offers an unparalleled professional opportunity to substantively contribute to active and future strategic litigation in both state and federal courts.',
                ),
              ),
            },
            {
              question: 'Economics',
              answer: richText(
                progLink(
                  'JPSM Junior Fellows Program',
                  'https://jpsm.umd.edu/academics/junior-fellows-program',
                ),
                paragraph(
                  'The Junior Fellow Program supports career opportunities for those who have the knowledge and skills to design, collect, and analyze large-scale databases by offering a paid research assistantship, plus educational benefits that can expand the horizons of what you can do in your career. Junior Fellows will be placed at various statistical and survey organizations.',
                ),
              ),
            },
            {
              question: 'Science, Tech, Engineering & Math',
              answer: richText(
                progLink(
                  'American Association for the Advancement of Science (AAAS)',
                  'https://www.aaas.org/fellowships',
                ),
                paragraph(
                  'The Science & Technology Policy Fellowships program provides opportunities for scientists and engineers to contribute to federal policymaking while learning firsthand about the intersection of science and policy.',
                ),
                progLink(
                  'Christine Mirzayan Science & Technology Policy Graduate Fellowship',
                  'https://www.nationalacademies.org/our-work/the-christine-mirzayan-science--technology-policy-graduate-fellowship-program',
                ),
                paragraph(
                  'A full-time hands-on training and educational program that provides early career individuals with the opportunity to spend 12 weeks at the National Academies of Sciences, Engineering, and Medicine in Washington, DC learning about science and technology policy and the role that scientists and engineers play in advising the nation.',
                ),
                progLink('Cybersecurity Talent Initiative', 'https://cybertalentinitiative.org/'),
                paragraph(
                  'The Cybersecurity Talent Initiative is a public-private partnership aimed at recruiting and training a world-class cybersecurity workforce. Participants selected for the program will be guaranteed a two-year placement at a federal agency with cybersecurity needs.',
                ),
                progLink(
                  'Department of Energy National Nuclear Security Administration Laboratory Residency Graduate Fellowship',
                  'https://www.krellinst.org/lrgf/about-doe-nnsa-lrgf',
                ),
                paragraph(
                  'Launched in 2017, the DOE NNSA Laboratory Residency Graduate Fellowship (DOE NNSA LRGF) provides excellent financial benefits and professional development opportunities to students pursuing a Ph.D. in fields of study that address complex science and engineering problems critical to stewardship science.',
                ),
                progLink(
                  'U.S. Food and Drug Administration (FDA) Scientific Internships and Fellowships',
                  'https://www.fda.gov/about-fda/jobs-and-training-fda/scientific-internships-fellowships-trainees-and-non-us-citizens',
                ),
                paragraph(
                  'Whether you’re an undergraduate looking to pursue a career in science, a graduate science student seeking experience in regulatory science, a postgraduate looking for fellowship opportunities, or a senior scientist pursuing research experience in your field of expertise, FDA offers many paths to learning about the field of regulatory science.',
                ),
                progLink(
                  'Foreign Affairs Information Technology (FAIT) Fellowship',
                  'https://www.faitfellowship.org/',
                ),
                paragraph(
                  'The FAIT Fellowship, funded by the United States Department of State, provides undergraduate and graduate students in IT-related fields with tuition assistance, as well as mentorship and professional development, to launch their careers in the Foreign Service as Information Management Specialists.',
                ),
                progLink(
                  'Mickey Leland Energy Fellowship (MLEF) Program',
                  'https://orise.orau.gov/mlef/',
                ),
                paragraph(
                  'The Mickey Leland Energy Fellowship Program provides students with educational opportunities to gain real-world, hands-on research experience with the Department of Energy’s (DOE) Office of Fossil Energy. The MLEF program was created in 1995 with the goal of improving opportunities for under-represented and minority students in STEM fields.',
                ),
                progLink('NASA Postdoctoral Program', 'https://npp.usra.edu/'),
                paragraph(
                  'The NASA Postdoctoral Program (NPP) provides early-career and more senior scientists the opportunity to share in NASA’s mission. NASA Postdoctoral Fellows work on 1 to 3 year assignments with NASA scientists and engineers at NASA centers and institutes to advance NASA’s missions in earth science, heliophysics, planetary science, astrophysics, space bioscience, aeronautics, engineering, human exploration and space operations, astrobiology, and science management.',
                ),
                progLink(
                  'Oak Ridge Institute of Science and Education Department of Defense Fellowship Program',
                  'https://orise.orau.gov/dodprograms/',
                ),
                paragraph(
                  'To ensure the robust supply of scientists and engineers to meet the U.S. Department of Defense’s future science and technology needs, the ORISE program places individuals from the academic community (students, recent graduates, and faculty) in DoD research projects.',
                ),
                progLink(
                  'Science, Mathematics and Research for Transformation (SMART) Scholarship for Service Program',
                  'https://www.smartscholarship.org/smart',
                ),
                paragraph(
                  'The SMART Scholarship for Service Program is an opportunity for students pursuing an undergraduate, graduate or doctoral degree in STEM disciplines to receive a full scholarship and be gainfully employed upon degree completion in the U.S. Department of Defense.',
                ),
                progLink(
                  'The Science and Technology Policy Institute (STPI) Fellowship',
                  'https://www.ida.org/en/careers/students-and-recent-graduates/summer-associate-internships-and-fellowships/science-policy-fellowship',
                ),
                paragraph(
                  'The STPI Fellowship provides recent bachelor’s degree recipients with an opportunity to use their critical thinking and analytic skills to work on science and technology (S&T) policy areas, including energy and the environment, space sciences, innovation and competitiveness, evaluation, life sciences, information technologies, national security, and STEM education. Fellows are involved in collaborative research for leaders in the White House Office of Science and Technology Policy (OSTP) and other Federal Government organizations.',
                ),
                progLink(
                  'USGS Mendenhall Research Fellowship Program',
                  'https://www.usgs.gov/centers/mendenhall',
                ),
                paragraph(
                  'The Mendenhall Research Fellowship Program of the U.S. Geological Survey (USGS) provides Fellows research experiences that enhance their scientific stature and credentials. The USGS invites postdoctoral scholars to conduct concentrated research in association with selected members of the USGS professional staff. Fellows have two-year appointments to the USGS, receiving a full salary and benefits at the GS-12 level. Applicants must have their PhD degree no earlier than 5 years before the application opening date.',
                ),
              ),
            },
            {
              question: 'Health',
              answer: richText(
                progLink(
                  'Sustaining Technical and Analytical Resources (STAR)',
                  'https://www.ghstar.org/participants/fellows',
                ),
                paragraph(
                  'Through fellowships, internships, and strategic partnerships, STAR supports building the capacity of diverse global health professionals and organizations at all levels to make inclusive, collaborative, and innovative contributions to global health.',
                ),
                progLink(
                  'Post Baccalaureate Intramural Research Training Award (Postbac IRTA/CRTA)',
                  'https://www.training.nih.gov/programs/postbac_irta',
                ),
                paragraph(
                  'The NIH Postbac IRTA program provides recent college graduates who are planning to apply to graduate or professional (medical/dental/pharmacy) school an opportunity to spend one or two years performing full-time research at the NIH. Postbac IRTAs/CRTAs work side-by-side with some of the leading scientists in the world, in an environment devoted exclusively to biomedical research.',
                ),
              ),
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

const contactUsSlice: PageSlice = async (payload) => {
  // Contact form (CO1, #98). Owned here and upserted by title so a reseed keeps
  // it and a fresh DB recreates it — self-healing like the gallery media.
  const formData = {
    title: 'Contact Form',
    submitButtonLabel: 'Send message',
    confirmationType: 'message' as const,
    confirmationMessage: richText(
      heading('Thank you. Your message has been sent.', 'h3'),
      paragraph("We'll be in touch with you shortly."),
    ),
    // Field set mirrors the live Webflow contact form (LR11): first/last name,
    // email, phone, title/role, organization, a "describe yourself" select, and
    // the message. Two-up (width 50) name/contact rows collapse to one column on
    // mobile via the Width block.
    fields: [
      {
        blockType: 'text',
        name: 'first-name',
        blockName: 'first-name',
        label: 'First name',
        required: true,
        width: 50,
      },
      {
        blockType: 'text',
        name: 'last-name',
        blockName: 'last-name',
        label: 'Last name',
        required: true,
        width: 50,
      },
      {
        blockType: 'email',
        name: 'email',
        blockName: 'email',
        label: 'Email',
        required: true,
        width: 50,
      },
      {
        blockType: 'text',
        name: 'phone',
        blockName: 'phone',
        label: 'Phone number',
        required: false,
        width: 50,
      },
      {
        blockType: 'text',
        name: 'title-role',
        blockName: 'title-role',
        label: 'Title/Role',
        required: false,
        width: 50,
      },
      {
        blockType: 'text',
        name: 'organization',
        blockName: 'organization',
        label: 'Organization',
        required: false,
        width: 50,
      },
      {
        blockType: 'select',
        name: 'describe-yourself',
        blockName: 'describe-yourself',
        label: 'How would you describe yourself?',
        required: true,
        width: 100,
        // Values match the live form's option labels verbatim so submissions
        // land in the same buckets ops already reports on.
        options: [
          { label: 'Current Member', value: 'Current Member' },
          { label: 'Prospective member', value: 'Prospective member' },
          { label: 'Organization partner', value: 'Organization partner' },
          { label: 'Press / journalist', value: 'Press / journalist' },
          { label: 'Other', value: 'Other' },
        ],
      },
      {
        blockType: 'textarea',
        name: 'message',
        blockName: 'message',
        label: 'Message',
        required: true,
        width: 100,
      },
    ],
    emails: [
      {
        emailTo: 'info@mapsnational.org',
        // CC operations + CTO on every contact submission (comma-separated; the
        // form-builder passes the string through to the adapter).
        cc: 'operations@mapsnational.org, cto@mapsnational.org',
        // Sender must be on a domain verified with the email provider (Resend).
        // Driven by the same env as the adapter's defaultFromAddress so the
        // verified sender is set in one place; falls back to a sensible default.
        emailFrom: `"${process.env.EMAIL_FROM_NAME || 'MAPS National'}" <${process.env.EMAIL_FROM_ADDRESS || 'no-reply@mapsnational.org'}>`,
        subject: "You've received a new contact message.",
        // {{*:table}} is expanded by the form-builder into an HTML table of every
        // submitted field, so ops gets the full submission (name, contact, role,
        // message) in the notification instead of just a "you got a message" ping.
        message: richText(
          paragraph('A new message was submitted via the website contact form:'),
          paragraph('{{*:table}}'),
        ),
      },
    ],
  }

  const existingForm = await payload.find({
    collection: 'forms',
    where: { title: { equals: formData.title } },
    limit: 1,
    depth: 0,
  })
  const formId = existingForm.docs[0]
    ? (
        await payload.update({
          collection: 'forms',
          id: existingForm.docs[0].id,
          data: formData as never,
        })
      ).id
    : (await payload.create({ collection: 'forms', data: formData as never })).id

  return [
    {
      slug: 'contact',
      title: 'Contact Us',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'Get in touch',
        richText: richText(
          heading('Contact us', 'h1'),
          paragraph(
            "We're here to listen and help you find your place in public service. Send us a message and we'll be in contact with you shortly.",
          ),
        ),
      },
      layout: [
        {
          blockType: 'formBlock',
          form: formId,
          enableIntro: true,
          introContent: richText(heading('Send us a message', 'h3')),
        },
        {
          blockType: 'contactDetails',
          heading: 'Reach MAPS National',
          // Email intentionally omitted — the form above is the contact path.
          items: [
            {
              icon: 'location',
              label: 'Mailing address',
              value: '420 Florida Ave NE, #29\nWashington, DC 20002',
            },
          ],
        },
        {
          // Steers donors away from mailing checks (a recurring problem) and
          // back to the online flow. Sits directly under the mailing address.
          blockType: 'cta',
          richText: richText(
            heading('Sending a donation?', 'h3'),
            paragraph(
              "Please don't mail a check to this address. Online gifts reach MAPS right away and are far easier for us to process, so please donate securely online instead.",
            ),
          ),
          links: [
            {
              link: {
                type: 'custom',
                appearance: 'default',
                label: 'Donate online',
                url: '/donate',
              },
            },
          ],
        },
      ],
    },
  ] as unknown as PageData[]
}

// Latest Updates — the full Posts feed. Target of the "View all updates" CTAs
// on the home + events pages (previously a dead /latest-updates link, #EV1).
const latestUpdatesSlice: PageSlice = async (_payload) => {
  return [
    {
      slug: 'latest-updates',
      title: 'Latest Updates',
      _status: 'published',
      hero: {
        type: 'lowImpact',
        eyebrow: 'News',
        richText: richText(
          heading('Latest Updates', 'h1'),
          paragraph(
            'Statements, press releases, events, photos, and professional development updates from across the MAPS National network.',
          ),
        ),
      },
      layout: [
        {
          blockType: 'archive',
          populateBy: 'collection',
          relationTo: 'posts',
          limit: 0,
        },
      ],
    },
  ] as unknown as PageData[]
}

// ---------------------------------------------------------------------------
// Slice: /programs hub — the front door to the 5 program leaves.
//
// "On-Ramp" design (chosen by the hub-page design panel): a full-bleed navy
// highImpact masthead, a two-sentence serif standfirst, then an EARLY icon-card
// directory where every leaf is a whole-card link and one card is the navy
// `featured` accent; two photo-led FeatureSplit features for the flagship
// programs; a single pull-quote; a recent-updates strip; and a quiet join CTA.
// Buildable from existing blocks only (no net-new). The navy comes solely from
// the hero scrim and the one featured card — never a faked band.

const programsHubSlice: PageSlice = async (payload) => {
  // Resolve a Media doc id by filename; create it from the tracked source under
  // public/import/prose if missing (so a fresh DB, or a photo added outside the
  // Webflow export, still seeds). `alt` is only used when creating.
  const mediaId = async (filename: string, alt = ''): Promise<number | null> => {
    const res = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    const id = res.docs[0]?.id
    if (typeof id === 'number') return id

    const source = path.join(process.cwd(), 'public/import/prose', filename)
    if (existsSync(source)) {
      const data = await readFile(source)
      const created = await payload.create({
        collection: 'media',
        data: { alt: alt || filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') },
        file: { name: filename, data, mimetype: 'image/webp', size: data.length },
      })
      payload.logger.info(`programs: created media "${filename}" from tracked source`)
      return created.id
    }
    return null
  }
  // Flagship feature photos (re-hosted by the prose/program imports). The hero
  // needs a 4:3 landscape image (validated); programs-hero.webp is 1600×1200,
  // while careerImg (4_1) keeps feeding the FeatureSplit below.
  const [heroImg, careerImg, communityImg] = await Promise.all([
    mediaId('programs-hero.webp', 'MAPS members at a 2025 program event'),
    mediaId('4_1.webp'),
    mediaId('5_1.webp'),
  ])

  // "Programs in motion" strip reuses the EVENT-type Post categories (programs
  // run the events). Resolve at runtime; only emit the strip if at least one
  // resolves, so we never seed an Archive scoped to nothing.
  const cats = await payload.find({ collection: 'categories', limit: 0, depth: 0 })
  const idBySlug = new Map(cats.docs.map((c) => [c.slug, c.id]))
  const eventCategoryIds = ['cosponsored-event', 'events', 'partner-event', 'upcoming-events']
    .map((s) => idBySlug.get(s))
    .filter((v): v is number => typeof v === 'number')

  const heroLinks = [
    {
      link: {
        type: 'custom',
        appearance: 'default',
        label: 'Explore the programs',
        url: '#the-programs',
      },
    },
    { link: { type: 'custom', appearance: 'outline', label: 'Become a member', url: '/join' } },
  ]
  const heroCopy = richText(
    heading('Five ways to serve, and to rise.', 'h1'),
    paragraph(
      'Our programs help Muslim American public servants advance their careers, build community across government, and shape the policy that affects them. Pick a path, or start with the one that fits you today.',
    ),
  )
  // mediumImpact REQUIRES a Media image (wide cover banner above the copy); fall
  // back to an on-brand lowImpact header when the career photo isn't imported yet,
  // so the seed always succeeds.
  const hero = heroImg
    ? {
        type: 'mediumImpact',
        media: heroImg,
        richText: heroCopy,
        links: heroLinks,
      }
    : { type: 'lowImpact', eyebrow: 'MAPS Programs', richText: heroCopy, links: heroLinks }

  // Whole-card-link directory: all 5 leaves as navy icon-chip cards (mediaType
  // 'none' renders the decorative `lucideIcon` chip), Policy Initiatives the
  // single navy `featured` accent. mediaType 'none' keeps the grid independent
  // of per-program photography (Legal Advocacy / Private Sector Engagement have none).
  const dirCard = (
    lucideIcon: string,
    cardHeading: string,
    body: string,
    url: string,
    featured = false,
  ) => ({
    lucideIcon,
    heading: cardHeading,
    body: richText(paragraph(body)),
    featured,
    enableCardLink: true,
    cardLink: { type: 'custom', url, newTab: false },
  })

  const layout: PageData['layout'] = [
    {
      blockType: 'content',
      columns: [
        {
          size: 'full',
          enableLink: false,
          richText: richText(
            paragraph(
              'MAPS is where Muslim American public servants find their footing and their people. From the MAPS Academy to fellowship placement, community to policy, every program below is a door into the same mission: serve with dignity, and never alone.',
            ),
          ),
        },
      ],
    },
    {
      blockType: 'cardGrid',
      columns: '3',
      mediaType: 'none',
      header: {
        enableHeader: true,
        eyebrow: 'The programs',
        heading: 'Five ways MAPS moves your career and community forward.',
        anchorId: 'the-programs',
      },
      items: [
        dirCard(
          'briefcase',
          'Career Support',
          'Academy webinars, 1:1 resume and interview help, and fellowship placement.',
          '/programs/career-support',
        ),
        dirCard(
          'users',
          'Community Building',
          'Communities of Practice and Muslim staff associations across government.',
          '/programs/community-building',
        ),
        dirCard(
          'scale',
          'Legal Advocacy',
          'Religious accommodation and legal support in the workplace.',
          '/programs/legal-advocacy',
        ),
        dirCard(
          'landmark',
          'Policy Initiatives',
          'Nonpartisan policy and advocacy on issues affecting Muslim public servants.',
          '/programs/policy-initiatives',
          true,
        ),
        dirCard(
          'network',
          'Private Sector Engagement',
          'Government contracting support for Muslim-owned firms and contractors.',
          '/programs/private-sector-engagement',
        ),
      ],
    },
  ] as unknown as PageData['layout']

  // FeatureSplit `image` is required — only place each feature when its photo
  // resolved. Mirrored imageSide so the two read as a spread.
  if (typeof careerImg === 'number') {
    layout.push({
      blockType: 'featureSplit',
      eyebrow: 'Program 01',
      imageSide: 'right',
      heading: 'Advance your career, serve your country.',
      body: richText(
        paragraph(
          'MAPS Academy webinars and workshops, 1:1 resume and interview services, and fellowship referrals and placement to White House, Statehouse, and local roles.',
        ),
      ),
      links: [
        {
          link: {
            type: 'custom',
            appearance: 'default',
            label: 'Explore Career Support',
            url: '/programs/career-support',
          },
        },
      ],
      image: careerImg,
    } as unknown as PageData['layout'][number])
  }
  if (typeof communityImg === 'number') {
    layout.push({
      blockType: 'featureSplit',
      eyebrow: 'Program 02',
      imageSide: 'left',
      heading: 'Find your people, in your field and your state.',
      body: richText(
        paragraph(
          'Connect nationally and at the state level, join Communities of Practice by field, and get support forming Muslim employee staff associations across government.',
        ),
      ),
      links: [
        {
          link: {
            type: 'custom',
            appearance: 'outline',
            label: 'Explore Community Building',
            url: '/programs/community-building',
          },
        },
      ],
      image: communityImg,
    } as unknown as PageData['layout'][number])
  }

  // Proof — programs testimonials slider (collection-backed; programs
  // testimonials are seeded by phase4ShowcaseSlice).
  layout.push({
    blockType: 'testimonials',
    type: 'programs',
    populateBy: 'collection',
    limit: 0,
    eyebrow: 'In their words',
    heading: 'From members who have been there',
  } as unknown as PageData['layout'][number])

  // Liveness — recent program/event updates. Skip if no event categories exist.
  if (eventCategoryIds.length > 0) {
    layout.push({
      blockType: 'archive',
      display: 'grid',
      populateBy: 'collection',
      relationTo: 'posts',
      categories: eventCategoryIds,
      limit: 3,
      introContent: richText(heading('Programs in motion', 'h2')),
    } as unknown as PageData['layout'][number])
  }

  // Close — quiet join CTA (CallToAction renders neutral bg-card, by design).
  layout.push({
    blockType: 'cta',
    richText: richText(
      paragraph('Public service is better together. Membership is free and member-led.'),
    ),
    links: [
      { link: { type: 'custom', appearance: 'default', label: 'Become a member', url: '/join' } },
    ],
  } as unknown as PageData['layout'][number])

  return [
    { slug: 'programs', title: 'Programs', _status: 'published', hero, layout },
  ] as unknown as PageData[]
}

// ---------------------------------------------------------------------------
// Slice: /about-us hub — the front door to the 6 About leaves.
//
// Same "On-Ramp" skeleton as /programs (a sibling, not a clone): navy highImpact
// masthead, serif standfirst, the early icon-card directory (Mission the navy
// `featured` card), then About's own proof spine instead of program features:
// a mission FeatureSplit, the founding Timeline, a compact Board teaser, a
// 4-question FAQ teaser, and a quiet join CTA. The three
// Team rosters stay on their leaves and are only routed to here.

const aboutUsHubSlice: PageSlice = async (payload) => {
  // Resolve a Media doc id by filename; create it from the tracked source under
  // public/import/prose if it isn't in Media yet (so a fresh DB, or a photo added
  // outside the Webflow export, still seeds). Returns null only when no source exists.
  const mediaId = async (filename: string, alt: string): Promise<number | null> => {
    const res = await payload.find({
      collection: 'media',
      where: { filename: { equals: filename } },
      limit: 1,
      depth: 0,
    })
    const id = res.docs[0]?.id
    if (typeof id === 'number') return id

    const source = path.join(process.cwd(), 'public/import/prose', filename)
    if (existsSync(source)) {
      const data = await readFile(source)
      const created = await payload.create({
        collection: 'media',
        data: { alt: alt || filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') },
        file: { name: filename, data, mimetype: 'image/webp', size: data.length },
      })
      payload.logger.info(`about-us: created media "${filename}" from tracked source`)
      return created.id
    }
    return null
  }
  // The hero needs a 4:3 landscape image (validated); about-us-hero.webp is 1600×1200.
  const [communityImg, missionImg] = await Promise.all([
    mediaId('about-us-hero.webp', 'MAPS community at a networking event'),
    mediaId('29.webp', 'MAPS mission'),
  ])

  const heroLinks = [
    {
      link: {
        type: 'custom',
        appearance: 'default',
        label: 'Get to know MAPS',
        url: '#inside-maps',
      },
    },
    {
      link: {
        type: 'custom',
        appearance: 'outline',
        label: 'Meet the team',
        url: '/about-us/board-leadership',
      },
    },
  ]
  const heroCopy = richText(
    heading('Muslim Americans, in public service.', 'h1'),
    paragraph(
      'A volunteer-run 501(c)(3) founded in 2021, connecting public servants across every level of government. Free to join, member-led, and nonpartisan.',
    ),
  )
  // mediumImpact: wide cover banner above the copy. Falls back to a lowImpact
  // header when the photo is missing.
  const hero = communityImg
    ? {
        type: 'mediumImpact',
        media: communityImg,
        richText: heroCopy,
        links: heroLinks,
      }
    : { type: 'lowImpact', eyebrow: 'About MAPS', richText: heroCopy, links: heroLinks }

  const dirCard = (
    lucideIcon: string,
    cardHeading: string,
    body: string,
    url: string,
    featured = false,
  ) => ({
    lucideIcon,
    heading: cardHeading,
    body: richText(paragraph(body)),
    featured,
    enableCardLink: true,
    cardLink: { type: 'custom', url, newTab: false },
  })

  const faqItem = (question: string, answer: string) => ({
    question,
    answer: richText(paragraph(answer)),
    defaultOpen: false,
  })

  const layout: PageData['layout'] = [
    {
      blockType: 'content',
      columns: [
        {
          size: 'full',
          enableLink: false,
          richText: richText(
            paragraph(
              'MAPS exists so that no Muslim American in public service has to navigate it alone. We are 100 percent volunteer run, free to join, and built by members who serve at every level of government.',
            ),
          ),
        },
      ],
    },
    {
      blockType: 'cardGrid',
      columns: '3',
      mediaType: 'none',
      header: {
        enableHeader: true,
        eyebrow: 'Inside MAPS',
        heading: 'Six ways to get to know who we are.',
        anchorId: 'inside-maps',
      },
      items: [
        dirCard(
          'landmark',
          'Mission, Values & History',
          'Our mission, seven values, and the founding story.',
          '/about-us/mission',
          true,
        ),
        dirCard(
          'file-text',
          'FAQ',
          'Membership, funding, and advocacy, answered.',
          '/about-us/faq',
        ),
        dirCard(
          'network',
          'Partners',
          'The organizations standing with MAPS.',
          '/about-us/partners',
        ),
        dirCard(
          'users',
          'Board & Leadership',
          'The board and deputies who steer the work.',
          '/about-us/board-leadership',
        ),
        dirCard(
          'mic',
          'Advisory Council',
          'The advisors who guide our direction.',
          '/about-us/advisory-council',
        ),
        dirCard(
          'folder-open',
          'State Committees',
          'Member leaders organizing in your state.',
          '/about-us/state-committees',
        ),
      ],
    },
  ] as unknown as PageData['layout']

  // Lead feature — mission and values as an editorial spread (only when the
  // photo resolved, since FeatureSplit `image` is required).
  if (typeof missionImg === 'number') {
    layout.push({
      blockType: 'featureSplit',
      eyebrow: 'Who we are',
      imageSide: 'right',
      heading: 'A home for public servants, founded in 2021.',
      body: richText(
        paragraph(
          'Our mission is to support the career, community, and workplace development of Muslim American public servants. Seven values guide the work, from public service and religious freedom to community building and broad-based inclusion.',
        ),
      ),
      links: [
        {
          link: {
            type: 'custom',
            appearance: 'default',
            label: 'Read our mission and values',
            url: '/about-us/mission',
          },
        },
      ],
      image: missionImg,
    } as unknown as PageData['layout'][number])
  }

  // History — the founding timeline (self-contained, no media).
  layout.push({
    blockType: 'timeline',
    header: {
      enableHeader: true,
      heading: 'From an idea to a movement',
      body: richText(paragraph('Key milestones in the founding and growth of MAPS National.')),
      anchorId: 'history',
    },
    items: [
      {
        date: '2019',
        title: "DOT's first Muslim ERG",
        body: richText(
          paragraph(
            "Muslim Federal employees at the US Department of Transportation create MAPS, the agency's first Employee Resource Group to support Muslim staff.",
          ),
        ),
      },
      {
        date: '2021',
        title: 'MAPS officially launches',
        body: richText(
          paragraph(
            'Muslim Americans in Public Service incorporates as a 501(c)(3) and launches as the first national organization to support and represent Muslims across American government.',
          ),
        ),
      },
      {
        date: '2022',
        title: 'First National Iftar and first State Committee',
        body: richText(
          paragraph(
            'MAPS holds its first National Iftar in DC and launches its first State Committee, MAPS New York.',
          ),
        ),
      },
      {
        date: '2023',
        title: 'The network grows',
        body: richText(
          paragraph(
            'State committees, Communities of Practice, and the partner network expand across the country.',
          ),
        ),
      },
    ],
  } as unknown as PageData['layout'][number])

  // People — a teaser that routes to the full board roster rather than listing a
  // partial set of members (the board is too large to excerpt, and listing only a
  // few reads as arbitrary). The advisory-council and state-committee rosters are
  // already linked from the "Inside MAPS" directory above.
  layout.push({
    blockType: 'cta',
    richText: richText(
      heading('The people behind MAPS', 'h2'),
      paragraph('A volunteer board and deputies steer the work across every level of government.'),
    ),
    links: [
      {
        link: {
          type: 'custom',
          appearance: 'default',
          label: 'Meet the board and leadership',
          url: '/about-us/board-leadership',
        },
      },
    ],
  } as unknown as PageData['layout'][number])

  // FAQ teaser — the make-or-break questions answered inline, then route to the
  // full ~18-question leaf.
  layout.push({
    blockType: 'faq',
    layout: 'sideBySide',
    header: {
      enableHeader: true,
      eyebrow: 'Good to know',
      heading: 'The questions everyone asks',
      links: [
        {
          link: {
            type: 'custom',
            url: '/about-us/faq',
            label: 'See all questions',
            appearance: 'outline',
            newTab: false,
          },
        },
      ],
    },
    items: [
      faqItem(
        'Is membership free?',
        'Yes. MAPS membership is 100 percent opt-in and free. Unsubscribing from the MAPS email list ends your membership.',
      ),
      faqItem(
        'How is MAPS funded?',
        'By Muslim American and public-service foundations, state commissions, and tax-deductible donations from members and supporters. MAPS does not charge member dues and does not accept foreign-government funding.',
      ),
      faqItem(
        'Is MAPS partisan?',
        'No. MAPS is a nonpartisan 501(c)(3) and limits its policy work to issues affecting Muslim American public servants.',
      ),
      faqItem(
        'Who can join?',
        'US citizens, legal permanent residents, or those within six months of either. All others are welcome to follow MAPS via the general mailing list.',
      ),
    ],
  } as unknown as PageData['layout'][number])

  layout.push({
    blockType: 'cta',
    richText: richText(paragraph('Membership is free, and so is belonging.')),
    links: [
      { link: { type: 'custom', appearance: 'default', label: 'Become a member', url: '/join' } },
    ],
  } as unknown as PageData['layout'][number])

  return [
    { slug: 'about-us', title: 'About Us', _status: 'published', hero, layout },
  ] as unknown as PageData[]
}

const PAGE_SLICES: PageSlice[] = [
  aboutUsSlice,
  programsHubSlice,
  aboutUsHubSlice,
  phase4ShowcaseSlice,
  contactUsSlice,
  latestUpdatesSlice,
  aboutUsFaqSlice,
  missionSlice,
  partnersSlice,
  donateSlice,
  eventsSlice,
  homeSlice,
  joinSlice,
  membersCommunityBuildingSlice,
  mapsAcademyVidsSlice,
  newYorkStateSlice,
  policyLegalAdvocacySlice,
  memberPortalSlice,
  professionalDevelopmentSlice,
  communitiesOfPracticeSlice,
  resourcesPointsOfContactSlice,
  pressSlice,
  careerSupportSlice,
  communityBuildingSlice,
  legalAdvocacySlice,
  policyInitiativesSlice,
  publicSectorEngagementSlice,
  federalEmploymentSlice,
  jumuahServicesSlice,
  fellowshipsMidSeniorSlice,
  fellowshipsYoungSlice,
]

// ---------------------------------------------------------------------------
// Team member ordering (C6) — exact per-group order read from the live site
// (mapsnational.webflow.io, June 2026). Groups are listed in display-seniority
// order; each member takes a single global `order` from the FIRST (most senior)
// group they appear in, so the Team block's `sort: 'order'` renders every group
// in this sequence and a cross-listed leader surfaces at the top of their junior
// groups (e.g. a state president leads their own committee). A single numeric
// field can't encode two independent ranks, so the few members cross-listed
// across two *leadership* groups keep their senior rank in the junior one:
// Fatima Abdelsalam and Hon. Samia Naseem therefore sort to the top of the
// "State Committee Presidents" group rather than their exact live slot — refine
// in admin if that subsection's precise order matters.
// Imported names can carry non-breaking spaces (U+00A0) from the source CSV, so
// normalize on both sides before matching against the live-order lists.
const normName = (s: string) => s.split(String.fromCharCode(160)).join(' ').trim()

const TEAM_ORDER: string[][] = [
  // Board of Directors
  [
    'Ahmad Maaty',
    'Ameer Abdulrahman',
    'Katie Qutub',
    'Aamer Uddin',
    'Assma Daifallah',
    'Idil Ahmed',
    'Farrah Pappa',
    'Mahnoor Jaura',
    'Jaheda Guliwala',
    'Tamim Chowdhury',
    'Hassan Sheikh',
    'Mohammed Sohail Chaudhry',
  ],
  // Board Specialists, Committee Chairs & Deputy Directors
  [
    'Syed "Waqar" Azeem',
    'Ismail Mohammed',
    'Ejaz Baluch',
    'Fatima Abdelsalam',
    'Omar Aswad',
    'Maisa Munawara',
    'Zaineb Sharif',
    'Muna Sultana',
    'Ayah Elwannas',
    'Badr Alsaidi',
  ],
  // Committee and Task Force Members
  ['Mariya Ilyas', 'Sarah Ahmad', 'Ameena Razzaque', 'Saeb Ahsan', 'Suha Ansari', 'Madiha Zuberi'],
  // Advisory Council (its own page — keep exact, so it precedes the presidents)
  [
    'Adil Ahmed',
    'Ahsia Badi',
    'Laila ElGohary',
    'Dr. Hashima Hasan',
    'Hon. Rashad Hauter',
    'Madiha Latif',
    'Syra Madad',
    'Saeed Mody',
    'Ahmed Mousa',
    'Hon. Samia Naseem',
    'Hon. Asim Rehman',
    'Fatema Z. Sumar',
    'Yusufi Vali',
    'Hon. Asad Ba-Yunus',
  ],
  // State Committee Presidents
  [
    'Basem Hassan',
    'Sofia Abdi',
    'Machhadie Assi',
    'Fatima Abdelsalam',
    'Mahanaz Ebadi',
    'Hon. Samia Naseem',
    'Fatima Shaikh',
    'Dr. Samia Hussein',
    'John Patrick Abellera',
  ],
  // State committees — president first, then live order
  [
    'Basem Hassan',
    'Hesham El Meligy',
    'Sadiyah Kazi',
    'Sarah Khan',
    'Rumana Haque',
    'Syed Adnan Bukhari',
    'Ayyad Algabyali',
    'Zunera Ahmed',
    'Saira Amar',
    'Ayyan S. Zubair',
    'Duriba Khan',
  ], // New York
  ['Sofia Abdi', 'Hodan Hashi', 'Faarooq Sahabdeen', 'Armaya Doremi'], // Massachusetts
  ['Machhadie Assi', 'Omar Shajrah', 'Aiyah Kassem', 'Ola Albayati', 'Saja Badawi'], // Michigan
  ['Fatima Abdelsalam', 'Tajnia Hussain'], // New Jersey
  ['Mahanaz Ebadi', 'Zeeshan M. Chaudhry', 'Sada Ahmed'], // California
  ['Hon. Samia Naseem', 'Wardah Alvi', 'Safiyah Zaidi'], // Illinois
  ['Fatima Shaikh'], // Texas
  ['Dr. Samia Hussein', 'Sabit Nasir'], // Connecticut
  ['John Patrick Abellera'], // Georgia
]

const applyTeamOrder = async (payload: Payload, context: Record<string, unknown>) => {
  const all = await payload.find({ collection: 'team', limit: 0, depth: 0 })
  const byName = new Map(all.docs.map((d) => [normName(d.name), d]))

  // Assign one global order from each member's first (most senior) appearance.
  const orderByName = new Map<string, number>()
  let counter = 1
  for (const group of TEAM_ORDER) {
    for (const name of group) {
      if (!orderByName.has(name)) orderByName.set(name, counter++)
    }
  }

  const missing: string[] = []
  let updated = 0
  for (const [name, order] of orderByName) {
    const doc = byName.get(name)
    if (!doc) {
      missing.push(name)
      continue
    }
    if (doc.order !== order) {
      await payload.update({ collection: 'team', id: doc.id, data: { order }, context })
    }
    updated++
  }
  payload.logger.info(`Team order: set ${updated}/${orderByName.size} members from live order.`)
  if (missing.length) payload.logger.warn(`Team order: no DB match for: ${missing.join(', ')}`)
}

// Members present in the import but not on the live site (C6/b) — hidden via the
// `inactive` flag rather than deleted, so the directory matches the source while
// the record (bio, photo, history) is preserved and reversible in admin.
const TEAM_INACTIVE: string[] = ['Hasan Shanawani']

const applyTeamActive = async (payload: Payload, context: Record<string, unknown>) => {
  const all = await payload.find({ collection: 'team', limit: 0, depth: 0 })
  const inactiveSet = new Set(TEAM_INACTIVE.map(normName))
  const matched = new Set<string>()
  let updated = 0
  for (const doc of all.docs) {
    const name = normName(doc.name)
    const shouldHide = inactiveSet.has(name)
    if (shouldHide) matched.add(name)
    // Also backfills existing NULL rows to an explicit false.
    if (Boolean(doc.inactive) !== shouldHide) {
      await payload.update({
        collection: 'team',
        id: doc.id,
        data: { inactive: shouldHide },
        context,
      })
      updated++
    }
  }
  payload.logger.info(
    `Team active: ${updated} member(s) toggled; ${matched.size}/${inactiveSet.size} hidden.`,
  )
  const unmatched = [...inactiveSet].filter((n) => !matched.has(n))
  if (unmatched.length) payload.logger.warn(`Team active: no DB match for: ${unmatched.join(', ')}`)
}

// Slug redirects (JU2 + future renames) — upserted into the redirects collection
// so old URLs 301 to the new ones. PayloadRedirects matches `from` against the
// requested "/path" and follows `to.url`.
const SLUG_REDIRECTS: { from: string; to: string }[] = [
  { from: '/resources/jumuah-prayer-services-washington-dc', to: '/resources/jumuah-services' },
  // Legacy Webflow paths → new canonical paths.
  { from: '/contact-us', to: '/contact' },
  { from: '/latest-updates-archive', to: '/latest-updates' },
  { from: '/programs/public-sector-engagement', to: '/programs/private-sector-engagement' },
]

const applyRedirects = async (payload: Payload, context: Record<string, unknown>) => {
  for (const { from, to } of SLUG_REDIRECTS) {
    const existing = await payload.find({
      collection: 'redirects',
      where: { from: { equals: from } },
      limit: 1,
      depth: 0,
    })
    const data = { from, to: { type: 'custom' as const, url: to } }
    if (existing.docs[0]) {
      await payload.update({ collection: 'redirects', id: existing.docs[0].id, data, context })
    } else {
      await payload.create({ collection: 'redirects', data, context })
    }

    // A slug rename leaves the page under the OLD slug behind (upsert keys on the
    // new slug), so delete it — the redirect now covers that path.
    const oldSlug = from.replace(/^\//, '')
    const stale = await payload.find({
      collection: 'pages',
      where: { slug: { equals: oldSlug } },
      limit: 10,
      depth: 0,
    })
    for (const doc of stale.docs) {
      await payload.delete({ collection: 'pages', id: doc.id, context })
      payload.logger.info(`Removed stale page /${oldSlug}`)
    }

    payload.logger.info(`Redirect: ${from} -> ${to}`)
  }
}

// ---------------------------------------------------------------------------
// Runner

// Fresh-DB / clean-checkout safety: every content image is committed under
// public/import/prose, but most slices resolve media find-only (they assume a
// prior `import:prose`). On an empty DB those lookups return null and whole
// layouts collapse (minRows). Pre-import the tracked originals once so every
// find-only resolver hits. Idempotent (deduped by filename); alt derived from
// the filename when the originals carry none.
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

// SEO meta (title + description) per page slug (LR14). Kept as one central map,
// applied in the upsert loop below, rather than threaded through every slice —
// the two hub one-liners and the eventChild factory would otherwise each need a
// bespoke edit. generateMeta appends " | MAPS National" to the title tag, so
// titles never restate it; descriptions stay <=165 chars to avoid SERP
// truncation. Grounded in each page's own hero/section copy.
const META_BY_SLUG: Record<string, { title: string; description: string }> = {
  'about-us': {
    title: 'About MAPS',
    description:
      'A volunteer-run 501(c)(3) founded in 2021, MAPS connects Muslim American public servants across every level of government. Free to join and nonpartisan.',
  },
  'about-us/advisory-council': {
    title: 'Advisory Council',
    description:
      'The MAPS Advisory Council is a standing, non-decision-making body of accomplished professionals who advise the Board and serve as a resource to members.',
  },
  'about-us/board-leadership': {
    title: 'Board & Leadership',
    description:
      'Muslim Americans in Public Service is led by a Board of Directors, supported by Deputy Directors, Board Committees, and State Committees across the country.',
  },
  'about-us/faq': {
    title: 'Frequently Asked Questions',
    description:
      "Answers to common questions about MAPS National's organization, membership, funding, advocacy, and programming.",
  },
  'about-us/mission': {
    title: 'Mission, Values & History',
    description:
      'Our mission is to support the career, community, and workplace development of Muslim American public servants and expand their collective impact in public service.',
  },
  'about-us/partners': {
    title: 'Our Partner Organizations',
    description:
      'MAPS collaborates with independent organizations, government agencies, and advocacy groups that share its mission of empowering Muslim Americans in public service.',
  },
  'about-us/state-committees': {
    title: 'State Committees',
    description:
      'MAPS State Committees organize members and public servants and represent MAPS with government officials, bringing professional development directly to their state.',
  },
  contact: {
    title: 'Contact Us',
    description:
      'Get in touch with MAPS National. Send us a message and we will be in contact with you shortly.',
  },
  donate: {
    title: 'Donate to MAPS',
    description:
      'MAPS is a 501(c)(3) nonprofit and donations are fully tax-deductible. Support the career, workplace, and community development of Muslim American public servants.',
  },
  events: {
    title: 'Events',
    description:
      'Upcoming and recent MAPS member events, webinars, and professional development opportunities, plus cosponsored and partner events across the network.',
  },
  'events/maps': {
    title: 'MAPS Events',
    description:
      'Browse events hosted by MAPS National, including member gatherings and professional development opportunities.',
  },
  'events/partner': {
    title: 'Partner Events',
    description:
      "Events co-hosted with MAPS National's partner organizations across the public service community.",
  },
  'events/upcoming': {
    title: 'Upcoming Events',
    description: 'Register for upcoming MAPS webinars, training sessions, and member events.',
  },
  home: {
    title: 'Empowering Muslim American Public Servants',
    description:
      'MAPS fosters a supportive community for Muslim American public servants, helping them excel in their careers through collaboration, mentorship, and advocacy.',
  },
  join: {
    title: 'Join the MAPS Network',
    description:
      'MAPS is a grassroots community of Muslim Americans in government, supporting career, community, and workplace development through four membership categories.',
  },
  'latest-updates': {
    title: 'Latest Updates',
    description:
      'Statements, press releases, events, photos, and professional development updates from across the MAPS National network.',
  },
  'members/communities-of-practice': {
    title: 'Communities of Practice',
    description:
      'MAPS Communities of Practice connect members by public service career track, integrating prospective public servants directly into their desired professions.',
  },
  'members/community-building': {
    title: 'Community Building for Members',
    description:
      'Find your community and join nationwide MAPS conversations about public service and community building.',
  },
  'members/maps-academy-vids': {
    title: 'MAPS Academy Videos',
    description:
      'Browse recorded sessions from internal and public MAPS Academy career programs. Internal recordings are for members and instructors only.',
  },
  'members/new-york-state': {
    title: 'MAPS New York',
    description:
      'The MAPS New York State Committee organizes and supports members and represents MAPS with officials, bringing development directly to NYC public servants.',
  },
  'members/policy-legal-advocacy': {
    title: 'Policy & Legal Advocacy',
    description:
      'MAPS policy initiatives, advocacy campaigns, templates, and legal support for members facing workplace discrimination, plus recordings of exclusive member webinars.',
  },
  'members/portal': {
    title: 'Member Portal',
    description:
      'A secure home for MAPS Members, Associates, Affiliates, and Allies, with event registrations and career, community, and policy resources by membership category.',
  },
  'members/professional-development': {
    title: 'Professional Development',
    description:
      'Exclusive MAPS professional development resources, templates, one-on-one career services, political appointment and judicial pipelines, and recorded webinars.',
  },
  'members/resources-points-of-contact': {
    title: 'Resources & Points of Contact',
    description:
      'A central directory of MAPS National resources and the people to reach for member support.',
  },
  press: {
    title: 'Press Releases',
    description:
      'Latest statements, press releases, and media features from MAPS National for local and national press and the Muslim public service community.',
  },
  programs: {
    title: 'Programs',
    description:
      'MAPS programs help Muslim American public servants advance their careers, build community across government, and shape the policy that affects them.',
  },
  'programs/career-support': {
    title: 'Career Support',
    description:
      'MAPS supports members and partner networks with career assistance for Muslim American public servants, helping them advance in government and civic leadership.',
  },
  'programs/community-building': {
    title: 'Community Building',
    description:
      'MAPS builds communities based on state of residence, place of employment, and profession, including State Committees, chapter groups, and communities of practice.',
  },
  'programs/legal-advocacy': {
    title: 'Legal Advocacy',
    description:
      'The MAPS Legal Advocacy Committee offers legal information and support for members facing adversity in their public service careers.',
  },
  'programs/policy-initiatives': {
    title: 'Policy & Advocacy Initiatives',
    description:
      'MAPS policy initiatives, toolkits, and resources promote inclusive government, helping Muslim American employees serve without fear of discrimination or retaliation.',
  },
  'programs/private-sector-engagement': {
    title: 'Private Sector Engagement (PSE)',
    description:
      'MAPS PSE Committee leads engagement with Muslim-led companies and government contractors, recognizing their role alongside government employees in public service.',
  },
  'resources/federal-employment': {
    title: 'Federal & State Government Jobs',
    description:
      'MAPS helps members navigate pathways to careers in Federal, State, and local government, from the Executive Branch to Congress.',
  },
  'resources/jumuah-services': {
    title: 'Jumuah Services in Washington, DC',
    description:
      'Many Federal employees hold Friday Jumuah services at their offices. Learn how to establish an employee resource group to organize communal prayer at your agency.',
  },
  'resources/public-service-fellowships-mid-career-to-senior-professionals': {
    title: 'Fellowships: Mid-Career to Senior',
    description:
      'MAPS has compiled well-known public service fellowships for mid-career to senior professionals, entry points into government across nearly every career track.',
  },
  'resources/public-service-fellowships-young-professionals': {
    title: 'Fellowships for Young Professionals',
    description:
      'MAPS has compiled public service fellowships for students, PhD candidates, and young professionals, building experience or entry into specific Federal agencies.',
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

      // Backfill SEO meta from the central map (LR14), preserving any meta the
      // slice already set (e.g. meta.image). Only title/description are managed
      // here, so a slice that sets its own is never overwritten field-for-field.
      const seo = META_BY_SLUG[data.slug]
      if (seo) {
        const existingMeta = (data as { meta?: Record<string, unknown> }).meta
        ;(data as { meta?: Record<string, unknown> }).meta = { ...seo, ...existingMeta }
      }

      // Payload only auto-stamps publishedAt on an actual draft->published
      // transition; re-running this upsert against an already-published doc
      // never backfills one that's missing (LR15), so stamp it here instead.
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

  await applyTeamOrder(payload, context)
  await applyTeamActive(payload, context)
  await applyRedirects(payload, context)

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
