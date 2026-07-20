import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { draftMode } from 'next/headers'
import React from 'react'
import { homeStatic } from '@/endpoints/seed/home-static'
import { queryPageBySlug } from '@/utilities/queryPageBySlug'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { PageTOC } from '@/components/PageTOC'

// Rendered on demand (SSR). The pages are DB-backed and managed hosts have no DB
// in the build container, so nothing can prerender; the page also reads draftMode()
// (a dynamic API), which would throw DYNAMIC_SERVER_USAGE under static generation.
export const dynamic = 'force-dynamic'

export async function generateStaticParams() {
  try {
    const payload = await getPayload({ config: configPromise })
    const pages = await payload.find({
      collection: 'pages',
      draft: false,
      limit: 1000,
      overrideAccess: false,
      pagination: false,
      select: {
        slug: true,
      },
    })

    const params = pages.docs
      ?.filter((doc) => {
        return doc.slug !== 'home'
      })
      // Catch-all route: a slug may be a nested path ("about-us/board-leadership"),
      // so split it into segments.
      .map(({ slug }) => {
        return { slug: (slug ?? '').split('/') }
      })

    return params
  } catch {
    // ponytail: DB unreachable at build (managed hosts have no DB in the build
    // container) — return no static paths; pages render on demand at runtime.
    return []
  }
}

type Args = {
  params: Promise<{
    // Catch-all gives an array of path segments; the root re-export passes none.
    slug?: string[]
  }>
}

/** Join catch-all segments back into the stored slug ("a/b"), defaulting to home. */
const resolveSlug = (segments?: string[]): string =>
  segments?.length ? segments.map(decodeURIComponent).join('/') : 'home'

const SECTION_LABELS: Record<string, string> = {
  'about-us': 'About Us',
  events: 'Events',
  members: 'Members',
  programs: 'Programs',
  resources: 'Resources',
}

// Sections that now have a real hub landing page — the breadcrumb section crumb
// links to it. Sections without a hub (e.g. resources) stay plain text so a crumb
// never points at a slug that 404s.
const SECTION_HUBS: Record<string, string> = {
  'about-us': '/about-us',
  events: '/events',
  programs: '/programs',
}

// No-dashes-in-copy rule: render any em/en dash in a title as a comma.
const cleanLabel = (s: string): string => s.replace(/\s*[—–]\s*/g, ', ')

// Member sub-pages whose parent section is State Committees rather than Resources.
const MEMBER_STATE_COMMITTEES = new Set(['new-york-state'])

// The Member Portal section a sub-page belongs to. One source of truth so the
// breadcrumb trail and the hero eyebrow always name the same section.
const memberSection = (sub: string): { label: string; url: string } =>
  MEMBER_STATE_COMMITTEES.has(sub)
    ? { label: 'State Committees', url: '/members/portal#state-committee' }
    : { label: 'Resources', url: '/members/portal#programs-services' }

// Returns the sub-page segment ("professional-development") for a /members/* page
// other than the portal hub itself, else null.
const memberSubPage = (slug: string): string | null => {
  const segments = slug.split('/')
  return segments[0] === 'members' && segments.length > 1 && segments[1] !== 'portal'
    ? segments[1]
    : null
}

/**
 * Breadcrumbs derived from the page's slug + title so every interior page shares
 * one trail shape — Home → section → current page (plain text). The section crumb
 * links to its hub when one exists (SECTION_HUBS: /about-us, /programs, /events)
 * and stays plain text otherwise, so no crumb points at a slug that 404s. This
 * overrides the per-page hero.breadcrumbs seed data, which had drifted into
 * inconsistent styles and broken links. Only the lowImpact hero renders breadcrumbs.
 *
 * Member sub-pages are the exception: they hang off the Member Portal hub rather
 * than Home, as Member Portal → (section) → page.
 */
const deriveBreadcrumbs = (slug: string, title: string): { label: string; url?: string }[] => {
  const sub = memberSubPage(slug)
  if (sub) {
    return [
      { label: 'Member Portal', url: '/members/portal' },
      memberSection(sub),
      { label: cleanLabel(title) },
    ]
  }

  const segments = slug.split('/')
  const crumbs: { label: string; url?: string }[] = [{ label: 'Home', url: '/' }]
  if (segments.length > 1) {
    const section = segments[0]
    crumbs.push({
      label: SECTION_LABELS[section] ?? cleanLabel(section),
      url: SECTION_HUBS[section],
    })
  }
  crumbs.push({ label: cleanLabel(title) })
  return crumbs
}

export default async function Page({ params: paramsPromise }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug: segments } = await paramsPromise
  const decodedSlug = resolveSlug(segments)
  const slug = decodedSlug
  const url = '/' + decodedSlug
  let page: RequiredDataFromCollectionSlug<'pages'> | null

  page = await queryPageBySlug({
    slug: decodedSlug,
  })

  // Remove this code once your website is seeded
  if (!page && slug === 'home') {
    page = homeStatic
  }

  if (!page) {
    return <PayloadRedirects url={url} />
  }

  const { hero, layout } = page
  // Member sub-pages already carry "Member Portal" as the first breadcrumb crumb,
  // so the hero eyebrow names the section instead (Resources / State Committees).
  const memberSub = memberSubPage(slug)

  return (
    <article className="pt-[var(--page-top-pad)] pb-24">
      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <RenderHero
        {...hero}
        eyebrow={memberSub ? memberSection(memberSub).label : hero.eyebrow}
        breadcrumbs={slug === 'home' ? undefined : deriveBreadcrumbs(slug, page.title ?? '')}
      />
      <div className="relative" data-toc-content>
        {!['home', 'members/portal', 'programs', 'about-us', 'members/new-york-state'].includes(
          slug,
        ) && <PageTOC />}
        <RenderBlocks blocks={layout} />
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug: segments } = await paramsPromise
  const page = await queryPageBySlug({
    slug: resolveSlug(segments),
  })

  return generateMeta({ doc: page })
}
