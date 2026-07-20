/**
 * Prose-page importer (issue #76).
 *
 * The non-CMS prose pages (mission, programs, resources, donate/join, …) aren't
 * CSV rows, so they don't fit the src/import CSV framework. This script does the
 * Phase-5 half of the job for them — it does NOT assemble pages (that's Phase 6):
 *
 *   1. Re-hosts every content image as Media (idempotent by filename), copying
 *      the original from the gitignored Webflow export into tracked
 *      public/import/prose/ first so a clean checkout can re-host without the
 *      export (mirrors the team/updates pattern).
 *   2. Converts each page's block-level editorial prose (headings, paragraphs,
 *      lists, blockquotes, .w-richtext) to Payload Lexical — leaving structured
 *      components (accordions, card grids, timelines, forms, map widgets) for
 *      Phase 6 to assemble as blocks.
 *   3. Writes a seed-ready artifact per page to src/seed/prose/<slug>.json
 *      ({ slug, title, richText, images }) plus an index.json. A Phase 6 page
 *      slice reads these to bind prose + images onto Pages.
 *
 *   npm run import:prose
 *
 * Adding a page: append a ProsePage to PAGES. `root` is the main-content
 * container; `exclude` drops structured-component subtrees within it. Re-running
 * is idempotent (Media deduped by filename; artifacts regenerated deterministically).
 */

import 'dotenv/config'

import { existsSync } from 'node:fs'
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import configPromise from '@payload-config'
import { JSDOM } from 'jsdom'
import { getPayload, type Payload } from 'payload'

const ROOT = process.cwd()
const EXPORT = path.join(ROOT, 'migration/mapsnational.webflow') // full export (HTML + images/)
const TRACKED_IMG = path.join(ROOT, 'public/import/prose') // committed originals
const ARTIFACTS = path.join(ROOT, 'src/seed/prose') // committed seed-ready output

type ProsePage = {
  slug: string
  title: string
  file: string // relative to EXPORT
  root: string // main content container selector (excludes nav/footer)
  exclude?: string[] // structured-component subtrees to leave for Phase 6 blocks
}

// Chrome present on every page — excluded from prose everywhere (and from image
// re-hosting, since these aren't content images).
const SHARED_EXCLUDE = ['.navbar_component', '.footer_component', '.w-form', '.w-dyn-list']

// Per-page: `exclude` drops STRUCTURED components from the prose only (accordions,
// card grids, pricing tiers, location/contact grids, timelines) — Phase 6
// assembles those as blocks. Content images inside them are still re-hosted.
const PAGES: ProsePage[] = [
  {
    slug: 'about-us/mission',
    title: 'Mission, Values & History',
    file: 'about-us/mission.html',
    root: '.section_content',
    exclude: ['.content_metatag-list', '.timeline_list', '#timeline'],
  },
  // Programs — header + card-grid pages: keep the section intros, drop the grids.
  {
    slug: 'programs/career-support',
    title: 'Career Support',
    file: 'programs/career-support.html',
    root: 'main',
    exclude: ['.layout_list'],
  },
  {
    slug: 'programs/legal-advocacy',
    title: 'Legal Advocacy',
    file: 'programs/legal-advocacy.html',
    root: 'main',
    exclude: ['.layout_list'],
  },
  {
    slug: 'programs/private-sector-engagement',
    title: 'Private Sector Engagement',
    file: 'programs/public-sector-engagement.html',
    root: 'main',
    exclude: ['.layout_list'],
  },
  // Programs/resources — accordion guides: keep the intro, drop the accordions.
  {
    slug: 'programs/community-building',
    title: 'Community Building',
    file: 'programs/community-building.html',
    root: 'main',
    exclude: ['.faq_accordion'],
  },
  {
    slug: 'programs/policy-initiatives',
    title: 'Policy & Advocacy Initiatives',
    file: 'programs/policy-initiatives.html',
    root: 'main',
    exclude: ['.faq_accordion'],
  },
  {
    slug: 'resources/federal-employment',
    title: 'Federal & State Government Employment Resources',
    file: 'resources/federal-employment.html',
    root: 'main',
    exclude: ['.faq_accordion'],
  },
  {
    slug: 'resources/public-service-fellowships-young-professionals',
    title: 'Public Service Fellowships — Young Professionals',
    file: 'resources/public-service-fellowships-young-professionals.html',
    root: 'main',
    exclude: ['.faq_accordion'],
  },
  {
    slug: 'resources/public-service-fellowships-mid-career-to-senior-professionals',
    title: 'Public Service Fellowships — Mid-Career to Senior Professionals',
    file: 'resources/public-service-fellowships-mid-career-to-senior-professionals.html',
    root: 'main',
    exclude: ['.faq_accordion'],
  },
  // Contact/location pages: keep the intro, drop the location grid + form.
  {
    slug: 'resources/jumuah-prayer-services-washington-dc',
    title: 'Jumuah Services in Washington DC Metro Area',
    file: 'resources/jumuah-prayer-services-washington-dc.html',
    root: 'main',
    exclude: ['.contact_location'],
  },
  {
    slug: 'contact-us',
    title: 'Contact Us',
    file: 'contact-us.html',
    root: 'main',
    exclude: ['.contact_location'],
  },
  // Special layouts.
  // Keep the section intro heading/paragraph; drop only the structured table / tier grid below it.
  {
    slug: 'donate',
    title: 'Donate',
    file: 'donate.html',
    root: 'main',
    exclude: ['.comparison_content'],
  },
  {
    slug: 'join',
    title: 'Join the MAPS Network',
    file: 'join.html',
    root: 'main',
    exclude: ['.pricing_grid-list', '.faq_accordion'],
  },
  {
    slug: 'about-us/faq',
    title: 'Frequently Asked Questions',
    file: 'about-us/faq.html',
    root: 'main',
    exclude: ['.faq_accordion'],
  },
  { slug: 'press', title: 'Press Releases', file: 'press.html', root: 'main', exclude: [] },
]

// Webflow puts editorial text in <p>, <div class="text-size-medium">, and CMS
// rich-text blocks (.w-richtext) — collect all, plus headings/lists/quotes.
const PROSE_SELECTOR =
  '.w-richtext, h1, h2, h3, h4, h5, h6, p, blockquote, ul, ol, .text-size-medium'

const MIME: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  avif: 'image/avif',
}

// Strip Webflow's id="" noise and whitespace-only sentinel paragraphs.
const cleanHtml = (h: string): string =>
  h
    .replace(/\s+id="[^"]*"/g, '')
    .replace(/<p[^>]*>(?:\s|&nbsp;|‍|​| )*<\/p>/gi, '')
    .trim()

type RehostedImage = { src: string; filename: string; id: number | string }

/** Local export image → Media (idempotent by filename), copied to a tracked dir first. */
const rehostImage = async (
  payload: Payload,
  src: string,
  alt: string,
): Promise<RehostedImage | null> => {
  const base = path.basename(src.split('?')[0])
  const ext = base.split('.').pop()?.toLowerCase() || ''
  if (!MIME[ext]) return null // skip svg logos/icons and anything non-raster — chrome, not content
  const source = path.join(EXPORT, 'images', base)
  if (!existsSync(source)) return null

  await mkdir(TRACKED_IMG, { recursive: true })
  const tracked = path.join(TRACKED_IMG, base)
  if (!existsSync(tracked)) await copyFile(source, tracked)

  const found = await payload.find({
    collection: 'media',
    where: { filename: { equals: base } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (found.docs[0]) return { src, filename: base, id: found.docs[0].id }

  const buffer = await readFile(tracked)
  const media = await payload.create({
    collection: 'media',
    data: { alt: alt || base },
    file: { name: base, data: buffer, mimetype: MIME[ext], size: buffer.length },
    overrideAccess: true,
  })
  return { src, filename: base, id: media.id }
}

/** Collect top-most prose elements in document order, skipping excluded subtrees. */
const extractProse = (root: Element, exclude: string[]): string => {
  const excluded = exclude.flatMap((s) => [...root.querySelectorAll(s)])
  const isExcluded = (el: Element) => excluded.some((ex) => ex === el || ex.contains(el))

  const matched = [...root.querySelectorAll(PROSE_SELECTOR)].filter((el) => !isExcluded(el))
  const set = new Set(matched)
  // Keep only the outermost matches — a matched element inside another matched
  // element is already covered by the ancestor's outerHTML.
  const topmost = matched.filter((el) => {
    let p = el.parentElement
    while (p) {
      if (set.has(p)) return false
      p = p.parentElement
    }
    return true
  })
  // Drop exact-duplicate blocks — some source pages repeat a whole section
  // verbatim (a Webflow authoring duplication), which we don't want twice.
  // ponytail: exact outerHTML match only; editorial prose ~never repeats a full block.
  const seen = new Set<string>()
  return topmost
    .map((el) => el.outerHTML)
    .filter((h) => (seen.has(h) ? false : (seen.add(h), true)))
    .join('\n')
}

/**
 * A Webflow `.timeline_list` → a Payload Timeline block ({ header, items }).
 * Dated milestones are structured data, not prose, so they're captured here for
 * Phase 6's Timeline block rather than flattened into the rich-text blob (the
 * thematic History narrative stays in the prose). Returns null if the page has
 * no timeline.
 */
const extractTimeline = async (
  root: Element,
  editorConfig: Parameters<typeof convertHTMLToLexical>[0]['editorConfig'],
): Promise<Record<string, unknown> | null> => {
  const items: Array<Record<string, unknown>> = []
  for (const item of root.querySelectorAll('.timeline_list .timeline_item')) {
    const date = item.querySelector('h2, h3, h4, h5, h6')?.textContent?.trim()
    if (!date) continue
    const bodyHtml = cleanHtml([...item.querySelectorAll('p')].map((p) => p.outerHTML).join('\n'))
    const body = bodyHtml
      ? await convertHTMLToLexical({ editorConfig, html: bodyHtml, JSDOM })
      : undefined
    items.push({ date, ...(body ? { body } : {}) })
  }
  if (!items.length) return null
  return {
    blockType: 'timeline',
    header: { enableHeader: true, heading: 'Timeline', anchorId: 'timeline' },
    items,
  }
}

const run = async (): Promise<void> => {
  const payload = await getPayload({ config: configPromise })
  const editorConfig = (await editorConfigFactory.default({
    config: payload.config,
  })) as Parameters<typeof convertHTMLToLexical>[0]['editorConfig']

  await mkdir(ARTIFACTS, { recursive: true })
  const index: Array<{ slug: string; title: string; file: string; images: number }> = []

  for (const page of PAGES) {
    const html = await readFile(path.join(EXPORT, page.file), 'utf8')
    const doc = new JSDOM(html).window.document
    const root = doc.querySelector(page.root)
    if (!root) throw new Error(`root "${page.root}" not found in ${page.file}`)

    // Images: re-host everything in the content (minus chrome) so Phase 6 has
    // them — including images inside cards/accordions. Prose: also drop the
    // structured components so their text doesn't leak into the rich-text blob.
    const imgExclude = SHARED_EXCLUDE.flatMap((s) => [...root.querySelectorAll(s)])
    const isImgExcluded = (el: Element) => imgExclude.some((ex) => ex === el || ex.contains(el))

    const images: RehostedImage[] = []
    for (const img of [...root.querySelectorAll('img')].filter((el) => !isImgExcluded(el))) {
      const src = img.getAttribute('src') || ''
      const r = await rehostImage(payload, src, img.getAttribute('alt') || page.title)
      if (r && !images.some((i) => i.filename === r.filename)) images.push(r)
    }

    const proseHtml = cleanHtml(extractProse(root, [...SHARED_EXCLUDE, ...(page.exclude || [])]))
    const richText = await convertHTMLToLexical({ editorConfig, html: proseHtml, JSDOM })

    // Structured sections captured as block data for Phase 6 (e.g. the timeline).
    const timeline = await extractTimeline(root, editorConfig)
    const blocks = [timeline].filter(Boolean)

    const fileName = `${page.slug.replace(/\//g, '-')}.json`
    await writeFile(
      path.join(ARTIFACTS, fileName),
      JSON.stringify({ slug: page.slug, title: page.title, richText, images, blocks }, null, 2),
    )
    index.push({ slug: page.slug, title: page.title, file: fileName, images: images.length })
    payload.logger.info(
      `prose: ${page.slug} — ${images.length} images, ${proseHtml.length} chars prose` +
        (blocks.length ? `, +${blocks.length} block(s)` : ''),
    )
  }

  await writeFile(path.join(ARTIFACTS, 'index.json'), JSON.stringify(index, null, 2))
  payload.logger.info(`Prose import complete: ${index.length} page(s).`)
  // Flush before exit or in-flight S3 uploads of the re-hosted images are killed
  // and their Media docs are left dangling (row, no object). Same reason
  // import/cli.ts and seed-pages.ts destroy before exiting.
  await payload.destroy()
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
