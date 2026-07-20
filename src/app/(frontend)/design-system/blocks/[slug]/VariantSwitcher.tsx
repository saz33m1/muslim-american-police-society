'use client'

import React, { useState } from 'react'

import { cn } from '@/utilities/ui'

export type VariantLabel = { name: string; description?: string }

/**
 * Client-side variant toggle for an entry's detail page. Receives pre-rendered
 * variant previews as `children` (one node per label, same order) and shows one
 * at a time — the others stay mounted but `hidden`, so server-rendered blocks
 * never need to re-render on the client.
 *
 * Deliberately knows nothing about blocks, heros, or the render registry: it
 * only sequences opaque children, keeping the server/client boundary clean.
 */
export const VariantSwitcher: React.FC<{
  labels: VariantLabel[]
  children: React.ReactNode[]
}> = ({ labels, children }) => {
  const [selected, setSelected] = useState(0)
  const active = labels[selected]

  return (
    <div className="flex flex-col gap-s">
      {labels.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Variant">
          {labels.map((label, i) => {
            const isActive = i === selected
            return (
              <button
                aria-pressed={isActive}
                className={cn(
                  'rounded-md border px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-content-secondary hover:bg-surface-secondary hover:text-foreground',
                )}
                key={i}
                onClick={() => setSelected(i)}
                type="button"
              >
                {label.name}
              </button>
            )
          })}
        </div>
      )}

      {active?.description && (
        <p className="text-sm text-content-secondary">{active.description}</p>
      )}

      <div className="overflow-hidden border border-border/40 bg-background">
        {children.map((child, i) => (
          <div hidden={i !== selected} key={i}>
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}
