import configPromise from '@payload-config'
import NextImage from 'next/image'
import { getPayload } from 'payload'
import React from 'react'

import type { Testimonial, TestimonialsBlock as TestimonialsBlockProps } from '@/payload-types'

import { Carousel } from '@/components/Carousel'
import RichText from '@/components/RichText'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { cn } from '@/utilities/ui'

const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

/** Resolve a headshot relationship to a usable src, if present. */
const headshotSrc = (t: Testimonial): string | null => {
  const photo = t.headshot
  if (photo && typeof photo === 'object' && photo.url)
    return getMediaUrl(photo.url, photo.updatedAt)
  return null
}

/**
 * The Webflow source had no real author names — the imported `author` is a
 * legacy id code ("10", "11", "1b", "4a"). Treat an author that's just digits
 * (optionally one trailing letter) as "no name" so we show an anonymous quote
 * (no attribution block) instead of junk. Hand-seeded testimonials with real
 * names ("Amina R.") are unaffected.
 */
const hasNamedAuthor = (t: Testimonial): boolean =>
  Boolean(t.author && !/^\d+[a-z]?$/i.test(t.author.trim()))

const Avatar: React.FC<{ testimonial: Testimonial; className?: string }> = ({
  testimonial,
  className,
}) => {
  const src = headshotSrc(testimonial)
  if (src) {
    return (
      <span className={cn('relative block aspect-square overflow-hidden rounded-full', className)}>
        <NextImage alt={testimonial.author} className="object-cover" fill sizes="64px" src={src} />
      </span>
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex aspect-square items-center justify-center rounded-full bg-primary/10 font-serif font-semibold text-primary',
        className,
      )}
    >
      {initials(testimonial.author)}
    </span>
  )
}

const Identity: React.FC<{ testimonial: Testimonial }> = ({ testimonial }) => (
  <div>
    <p className="font-serif font-semibold text-content">{testimonial.author}</p>
    {testimonial.role && <p className="text-sm text-content-secondary">{testimonial.role}</p>}
  </div>
)

/**
 * A single featured pull-quote, left-aligned to the container edge like every other
 * section: a maroon decorative quote glyph, the quote in the canonical pull-quote
 * ramp (`.type-quote` — inner prose is disabled so the paragraph inherits it), then
 * flush-left attribution. Shared by the `single` and `slider` variants, both of which
 * show one testimonial at a time.
 */
const Quote: React.FC<{ testimonial: Testimonial; className?: string }> = ({
  testimonial,
  className,
}) => (
  <figure className={cn('max-w-2xl', className)}>
    <span
      aria-hidden="true"
      className="block type-display leading-none text-brand-secondary dark:text-[var(--brand-secondary-light)]"
    >
      &ldquo;
    </span>
    <blockquote className="mt-1 type-quote text-content">
      <RichText data={testimonial.quote} enableGutter={false} enableProse={false} />
    </blockquote>
    {hasNamedAuthor(testimonial) && (
      <figcaption className="mt-8 flex items-center gap-4">
        <Avatar className="size-14" testimonial={testimonial} />
        <Identity testimonial={testimonial} />
      </figcaption>
    )}
  </figure>
)

/**
 * Testimonials — quotes from the Testimonials collection. The server resolves
 * the docs (collection query or an editor-picked selection), filters by `type`,
 * then renders them as an autoplaying pull-quote slider. The slider itself is a
 * client component (`Carousel`); this wrapper stays server-only.
 */
export const TestimonialsBlock: React.FC<TestimonialsBlockProps & { id?: string }> = async (
  props,
) => {
  const { eyebrow, heading, intro, limit, populateBy, selectedTestimonials, type } = props

  let docs: Testimonial[] = []
  if (populateBy === 'selection') {
    docs = (selectedTestimonials || [])
      .map((t) => (typeof t === 'object' ? t : null))
      .filter((t): t is Testimonial => Boolean(t))
    if (type && type !== 'all') docs = docs.filter((t) => t.type === type)
  } else {
    const payload = await getPayload({ config: configPromise })
    const result = await payload.find({
      collection: 'testimonials',
      depth: 1,
      limit: limit && limit > 0 ? limit : 0,
      sort: 'author',
      ...(type && type !== 'all' ? { where: { type: { equals: type } } } : {}),
    })
    docs = result.docs
  }

  if (docs.length === 0) return null

  const hasHeader = eyebrow || heading || intro

  return (
    <section className="container py-20 md:py-28">
      {hasHeader && (
        <div className="mb-12 max-w-2xl">
          {eyebrow && <p className="mb-3 type-eyebrow text-primary">{eyebrow}</p>}
          {heading && <h2 className="type-h2">{heading}</h2>}
          {intro && <RichText className="mt-4" data={intro} enableGutter={false} />}
        </div>
      )}

      {/* One testimonial at a time: a left-aligned pull-quote advanced as an
          autoplaying slider with a left-aligned counter + controls. */}
      <Carousel
        ariaLabel={heading || 'Testimonials'}
        autoPlay
        controlsClassName="justify-start"
        interval={10000}
        showCounter
        slideClassName="w-full"
      >
        {docs.map((t) => (
          <Quote key={t.id} testimonial={t} />
        ))}
      </Carousel>
    </section>
  )
}
