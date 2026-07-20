import React from 'react'

import type { GalleryEntry } from '@/blocks/gallery-types'
import type { Page } from '@/payload-types'

import { blockComponents } from '@/blocks/blockComponents'
import { RenderHero } from '@/heros/RenderHero'
import { HeaderThemeProvider } from '@/providers/HeaderTheme'
import { cn } from '@/utilities/ui'

/**
 * Renders one entry variant with its real component. A Server Component — it
 * touches the render registry (`blockComponents`) and `RenderHero`, both of
 * which are server-side. The client `VariantSwitcher` toggles visibility between
 * pre-rendered instances of this; it never renders blocks itself (an RSC can't
 * be handed to client code and re-rendered on state change).
 */
export const EntryPreview: React.FC<{ entry: GalleryEntry; props: Record<string, unknown> }> = ({
  entry,
  props,
}) => {
  if (entry.kind === 'hero') {
    return (
      // Local provider absorbs the hero's setHeaderTheme() call (High Impact sets
      // 'dark' on mount) so it doesn't flip the real page header.
      <HeaderThemeProvider>
        <div
          className={cn(
            // High Impact uses a negative top margin to underlap the fixed site
            // header; add matching padding so it isn't clipped in the frame.
            entry.renderKey === 'highImpact' && 'pt-[10.4rem]',
          )}
        >
          <RenderHero {...(props as Page['hero'])} />
        </div>
      </HeaderThemeProvider>
    )
  }

  const Component = blockComponents[entry.renderKey]
  if (!Component) return null

  // Blocks drop their own horizontal container here (disableInnerContainer); add
  // vertical padding so they don't sit flush against the frame edge. Heros are
  // full-bleed / self-padded, so they get none.
  return (
    <div className="py-10">
      <Component {...props} disableInnerContainer />
    </div>
  )
}
