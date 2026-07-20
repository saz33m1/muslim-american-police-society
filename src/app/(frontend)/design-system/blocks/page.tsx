import type { Metadata } from 'next'
import React from 'react'

import { galleryEntries } from '@/blocks/gallery-entries'
import { getGalleryUsage, usageTotal } from '@/blocks/usage'

import { CatalogBrowser } from './CatalogBrowser'
import { GalleryCard } from './GalleryCard'
import { ThemeToggle } from '../ThemeToggle'

export default async function BlocksGalleryPage() {
  const usage = await getGalleryUsage()
  return (
    <main className="container flex flex-col gap-xl py-xl">
      <header className="flex flex-col gap-s">
        <div className="flex flex-col gap-xs">
          <h1 className="text-4xl">Blocks Gallery</h1>
          <p className="max-w-prose text-content-secondary">
            Every layout block and hero, rendered with sample data. Open one to switch between its
            variants in light or dark.
          </p>
        </div>
        <div>
          <ThemeToggle />
        </div>
      </header>

      <CatalogBrowser
        entries={galleryEntries.map(({ slug, title, description, category }) => ({
          slug,
          title,
          description,
          category,
        }))}
      >
        {galleryEntries.map((entry) => (
          <GalleryCard entry={entry} key={entry.slug} uses={usageTotal(usage[entry.slug])} />
        ))}
      </CatalogBrowser>
    </main>
  )
}

export const metadata: Metadata = {
  title: 'Blocks Gallery',
  robots: { index: false, follow: false },
}
