import type { Metadata } from 'next'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import React from 'react'

import { galleryEntries, getGalleryEntry } from '@/blocks/gallery-entries'
import { getGalleryUsage, usageTotal } from '@/blocks/usage'

import { EntryPreview } from './EntryPreview'
import { VariantSwitcher } from './VariantSwitcher'
import { ThemeToggle } from '../../ThemeToggle'

// Only the entries known at build time are valid routes; anything else 404s.
export const dynamicParams = false

export function generateStaticParams() {
  return galleryEntries.map((entry) => ({ slug: entry.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const entry = getGalleryEntry(slug)
  return {
    title: entry ? `${entry.title} — Blocks Gallery` : 'Blocks Gallery',
    robots: { index: false, follow: false },
  }
}

export default async function GalleryEntryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const entry = getGalleryEntry(slug)
  if (!entry) notFound()

  const usage = await getGalleryUsage()
  const sites = [...(usage[entry.slug] ?? [])].sort((a, b) => b.count - a.count)
  const total = usageTotal(sites)

  return (
    <main className="container flex flex-col gap-xl py-xl">
      <div className="flex flex-col gap-s">
        <nav aria-label="Breadcrumb" className="text-sm text-content-secondary">
          <Link className="hover:text-foreground hover:underline" href="/design-system/blocks">
            Blocks Gallery
          </Link>
          <span className="px-2" aria-hidden="true">
            /
          </span>
          <span className="text-foreground">{entry.title}</span>
        </nav>

        <header className="flex flex-col gap-xs">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl">{entry.title}</h1>
            <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-content-secondary">
              {entry.category}
            </span>
          </div>
          {entry.description && (
            <p className="max-w-prose text-content-secondary">{entry.description}</p>
          )}
          <code className="text-xs text-content-secondary">slug: {entry.slug}</code>
        </header>

        <div>
          <ThemeToggle />
        </div>
      </div>

      {entry.variants.length === 0 ? (
        <p className="text-sm text-content-secondary">
          No example yet — add a <code className="px-1">gallery.ts</code> for this entry to document
          its variants.
        </p>
      ) : (
        <VariantSwitcher labels={entry.variants.map((v) => ({ name: v.name, description: v.description }))}>
          {entry.variants.map((variant, i) => (
            <EntryPreview entry={entry} key={i} props={variant.props} />
          ))}
        </VariantSwitcher>
      )}

      <section className="flex flex-col gap-s border-t border-border/40 pt-l">
        <h2 className="text-lg">
          Usage{' '}
          <span className="text-content-secondary">
            (
            {total === 0
              ? 'not used on any page'
              : `${total} time${total === 1 ? '' : 's'} on ${sites.length} page${sites.length === 1 ? '' : 's'}`}
            )
          </span>
        </h2>
        {sites.length > 0 && (
          <ul className="flex flex-col gap-xs text-sm">
            {sites.map((s) => (
              <li className="flex flex-wrap items-baseline gap-2" key={s.href}>
                <Link className="hover:text-foreground hover:underline" href={s.href}>
                  {s.title}
                </Link>
                <code className="text-xs text-content-secondary">{s.href}</code>
                {s.count > 1 && (
                  <span className="text-xs text-content-secondary">· {s.count}× on this page</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
