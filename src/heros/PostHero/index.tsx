import { formatDateTime } from 'src/utilities/formatDateTime'
import Link from 'next/link'
import React, { Fragment } from 'react'

import type { Category, Post } from '@/payload-types'

import { Media } from '@/components/Media'
import { cn } from '@/utilities/ui'

// Which section a post hangs off, by its category slug. Event categories each
// have their own landing page under /events; press categories all roll up to the
// single /press page; anything else (e.g. videos, uncategorized) falls back to
// the full /latest-updates feed. One source of truth for the breadcrumb trail.
const EVENT_CATEGORY_PAGE: Record<string, string> = {
  'upcoming-events': '/events/upcoming',
  events: '/events/maps',
  'partner-event': '/events/partner',
  'cosponsored-event': '/events',
}
const PRESS_CATEGORIES = new Set(['press-releases', 'statements', 'staff-announcements'])

export const PostHero: React.FC<{
  post: Post
}> = ({ post }) => {
  const { categories, heroImage, publishedAt, title } = post

  const hasImage = heroImage && typeof heroImage !== 'string'

  // Breadcrumb derived from the post's first category, mirroring the interior-page
  // trail Home / Section / Category (e.g. Home / Events / Upcoming Events). The
  // section also serves as the eyebrow, exactly as the /events/* pages render it.
  const firstCategory = (Array.isArray(categories) ? categories : []).find(
    (c): c is Category => typeof c === 'object' && c !== null,
  )
  const slug = firstCategory?.slug ?? ''
  const section =
    slug in EVENT_CATEGORY_PAGE
      ? { label: 'Events', url: '/events' }
      : PRESS_CATEGORIES.has(slug)
        ? { label: 'Press', url: '/press' }
        : { label: 'Latest Updates', url: '/latest-updates' }
  const breadcrumbs: { label: string; url?: string }[] = [{ label: 'Home', url: '/' }, section]
  if (firstCategory) {
    // Event categories link to their own landing page; press/other categories have
    // none, so the leaf is a plain label (avoids a duplicate link to the section).
    breadcrumbs.push({
      label: firstCategory.title,
      url: EVENT_CATEGORY_PAGE[firstCategory.slug],
    })
  }

  return (
    // Full-bleed navy band that the overlay header sits on; pulls up under the
    // header (which the post page sets to its dark/white-logo theme).
    <div className="-mt-[calc(var(--header-height)+var(--page-top-pad))] bg-brand-primary">
      <div className="container pb-14 pt-[calc(var(--header-height)+var(--page-top-pad))]">
        {/* Same 48rem centered column the article body uses, so the headline
            aligns with the prose below it (and the flyer's right edge with it). */}
        <div
          className={cn(
            'mx-auto max-w-[48rem] items-center gap-10 lg:gap-16',
            hasImage && 'lg:grid lg:grid-cols-[minmax(0,1fr)_18rem]',
          )}
        >
          {/* Text column — leads the masthead, one clear H1 */}
          <div className="max-w-[42rem]">
            {/* Ancestor trail to where the post lives; the post itself is the H1
                below, so no crumb is the current page (no aria-current). */}
            <nav aria-label="Breadcrumb" className="mb-4">
              <ol className="flex flex-wrap items-center gap-2 text-sm text-white/70">
                {breadcrumbs.map(({ label, url }, i) => {
                  const isLast = i === breadcrumbs.length - 1
                  return (
                    <Fragment key={i}>
                      <li>
                        {url ? (
                          <Link
                            className={cn(
                              'transition-colors hover:text-white',
                              isLast && 'text-white',
                            )}
                            href={url}
                          >
                            {label}
                          </Link>
                        ) : (
                          <span className={cn(isLast && 'text-white')}>{label}</span>
                        )}
                      </li>
                      {!isLast && (
                        <li aria-hidden="true" className="text-white/40">
                          /
                        </li>
                      )}
                    </Fragment>
                  )
                })}
              </ol>
            </nav>

            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-[var(--brand-secondary-lighter)]">
              {section.label}
            </p>

            <h1 className="type-display text-white">{title}</h1>

            <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3 border-t border-white/15 pt-5 text-sm">
              {publishedAt && (
                <div className="flex flex-col gap-1">
                  <p className="text-xs uppercase tracking-wide text-white/70">Published</p>
                  <time className="text-white" dateTime={publishedAt}>
                    {formatDateTime(publishedAt)}
                  </time>
                </div>
              )}
            </div>
          </div>

          {/* Flyer card — shown whole (intrinsic Media, never cropped) on a white card */}
          {hasImage && (
            <div className="mt-8 w-full max-w-[20rem] overflow-hidden rounded-lg bg-[var(--neutral-white)] shadow-2xl ring-1 ring-white/10 lg:mt-0 lg:max-w-none">
              <Media
                resource={heroImage}
                imgClassName="block w-full h-auto"
                size="(max-width: 1024px) 80vw, 22rem"
                priority
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
