import Link from 'next/link'
import React from 'react'

import type { GalleryEntry } from '@/blocks/gallery-types'

import { CardPreview } from './CardPreview'
import { EntryPreview } from './[slug]/EntryPreview'

/**
 * One catalog card: a clipped, non-interactive live preview of the entry's first
 * variant, its name, and a category tag. The whole card links to the entry's
 * detail route via a stretched overlay link.
 *
 * The preview renders the real component at full width inside a scaled-down,
 * `inert` canvas — `inert` removes the preview's own links/buttons from the tab
 * order and pointer interaction, so the card reads as a single link and the
 * nested interactive elements never trap focus.
 */
export const GalleryCard: React.FC<{ entry: GalleryEntry; uses?: number }> = ({ entry, uses }) => {
  const first = entry.variants[0]

  return (
    <div className="group relative flex flex-col overflow-hidden border border-border/40 bg-background transition-colors hover:border-border">
      <div className="relative h-48 overflow-hidden border-b border-border/40 bg-background">
        {first ? (
          <CardPreview>
            <EntryPreview entry={entry} props={first.props} />
          </CardPreview>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-content-secondary">
            No preview yet
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 p-4">
        <span className="font-medium group-hover:underline">{entry.title}</span>
        <div className="flex shrink-0 items-center gap-2">
          {uses !== undefined && (
            <span
              className="border border-border/40 px-2 py-0.5 text-xs text-content-secondary"
              title="Times used across pages"
            >
              {uses === 0 ? 'Unused' : `${uses} use${uses === 1 ? '' : 's'}`}
            </span>
          )}
          <span className="border border-border/40 px-2 py-0.5 text-xs text-content-secondary">
            {entry.category}
          </span>
        </div>
      </div>

      <Link
        aria-label={`${entry.title} — view variants`}
        className="absolute inset-0 z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        href={`/design-system/blocks/${entry.slug}`}
      />
    </div>
  )
}
