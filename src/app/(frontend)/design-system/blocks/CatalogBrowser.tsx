'use client'

import React, { useId, useMemo, useState } from 'react'

import type { GalleryCategory } from '@/blocks/gallery-types'
import { cn } from '@/utilities/ui'

/** Serializable entry metadata the browser filters on (no render props). */
export type CatalogEntryMeta = {
  slug: string
  title: string
  description?: string
  category: GalleryCategory
}

/**
 * Client-side search + category filter for the catalog index. Receives entry
 * metadata and the pre-rendered cards as `children` (same order); it toggles
 * each card's visibility rather than rendering cards itself, so the live
 * previews stay server-rendered.
 *
 * Categories and counts are derived from the metadata, so a newly-registered
 * block updates the pills and counts with no edit here.
 */
export const CatalogBrowser: React.FC<{
  entries: CatalogEntryMeta[]
  children: React.ReactNode
}> = ({ entries, children }) => {
  const cards = useMemo(() => React.Children.toArray(children), [children])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<GalleryCategory | 'all'>('all')
  const searchId = useId()

  // Ordered unique categories with totals, derived from the entries.
  const categories = useMemo(() => {
    const counts = new Map<GalleryCategory, number>()
    for (const e of entries) counts.set(e.category, (counts.get(e.category) ?? 0) + 1)
    return [...counts.entries()].map(([value, count]) => ({ value, count }))
  }, [entries])

  const q = query.trim().toLowerCase()
  const matches = useMemo(
    () =>
      entries.map((e) => {
        const inCategory = category === 'all' || e.category === category
        const inText =
          q === '' ||
          e.title.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.description?.toLowerCase().includes(q) ?? false)
        return inCategory && inText
      }),
    [entries, category, q],
  )

  const visibleCount = matches.reduce((n, m) => n + (m ? 1 : 0), 0)

  const pill = (active: boolean) =>
    cn(
      'rounded-full border px-3 py-1 text-sm transition-colors',
      active
        ? 'border-foreground bg-foreground text-background'
        : 'border-border text-content-secondary hover:bg-surface-secondary hover:text-foreground',
    )

  return (
    <div className="flex flex-col gap-l">
      <div className="flex flex-col gap-s">
        <label className="sr-only" htmlFor={searchId}>
          Search blocks
        </label>
        <input
          className="w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-content-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          id={searchId}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, description, or category…"
          type="search"
          value={query}
        />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          <button
            aria-pressed={category === 'all'}
            className={pill(category === 'all')}
            onClick={() => setCategory('all')}
            type="button"
          >
            All <span className="text-xs opacity-70">{entries.length}</span>
          </button>
          {categories.map(({ value, count }) => (
            <button
              aria-pressed={category === value}
              className={pill(category === value)}
              key={value}
              onClick={() => setCategory(value)}
              type="button"
            >
              {value} <span className="text-xs opacity-70">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {visibleCount === 0 ? (
        <p className="text-sm text-content-secondary">
          No blocks match{query.trim() ? ` “${query.trim()}”` : ''}
          {category !== 'all' ? ` in ${category}` : ''}.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-l sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, i) => (
            <div hidden={!matches[i]} key={entries[i]?.slug ?? i}>
              {card}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
