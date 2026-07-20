'use client'
import type { LogoStripBlock } from '@/payload-types'

import { type RowLabelProps, useRowLabel } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

type LogoRow = NonNullable<LogoStripBlock['items']>[number]

// Fallback only, for logos with no alt text yet: aafen-1.webp -> aafen.
// Drop the extension and the storage-plugin's `-N` collision suffix.
const nameFromFilename = (filename?: string | null): string =>
  filename ? filename.replace(/\.[^.]+$/, '').replace(/-\d+$/, '') : ''

type MediaLike = { alt?: string | null; filename?: string | null }
const nameFromDoc = (doc?: MediaLike | null): string => doc?.alt || nameFromFilename(doc?.filename)

/**
 * Array row label for LogoStrip logos: shows the logo's name (Alt text —
 * editable via the pencil icon on the Logo field, so "renaming" a logo in
 * the UI is just editing Alt) instead of the generic "Logo 01", so a 30+
 * logo list is scannable. Falls back to a filename-derived name for any
 * logo that hasn't had Alt text set. The upload value in form state is
 * usually just the media id, so fall back to a lookup when the row data
 * isn't already the populated doc.
 */
export const LogoRowLabel: React.FC<RowLabelProps> = () => {
  const { data, rowNumber } = useRowLabel<LogoRow>()
  const num = rowNumber !== undefined ? rowNumber + 1 : ''
  const logo = data?.logo

  // When the row already carries the populated media doc, derive synchronously.
  const inlineName = logo && typeof logo === 'object' && 'filename' in logo ? nameFromDoc(logo) : ''

  // Otherwise the value is just the media id — look it up (async, so no
  // synchronous setState in the effect).
  const logoId = typeof logo === 'number' || typeof logo === 'string' ? logo : null
  const [fetchedName, setFetchedName] = useState('')

  useEffect(() => {
    if (logoId == null) return
    let cancelled = false
    fetch(`/api/media/${logoId}?depth=0`)
      .then((r) => r.json())
      .then((doc) => {
        if (!cancelled) setFetchedName(nameFromDoc(doc))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [logoId])

  const name = inlineName || fetchedName
  return <div>{name ? `${num}: ${name}` : `Logo ${num}`}</div>
}
