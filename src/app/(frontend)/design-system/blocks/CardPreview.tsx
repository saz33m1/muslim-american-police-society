'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'

/** Width the block is rendered at before scaling — a desktop viewport. */
const DESIGN_WIDTH = 1280

/**
 * Frames a clipped, non-interactive preview of a block. The block (passed as
 * `children`, server-rendered) renders at a fixed desktop width and is scaled
 * down to exactly fill the card's width — measured at runtime so the preview
 * fits whatever column width the responsive grid hands it, with no horizontal
 * clipping. The scaled canvas is centered both axes, so short blocks sit in the
 * middle of the frame rather than the top-left.
 */
export const CardPreview: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(DESIGN_WIDTH ? 286 / DESIGN_WIDTH : 0.22)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(el.clientWidth / DESIGN_WIDTH)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div
        // `inert` keeps the preview's own links/buttons out of tab and pointer
        // order, so the card reads as a single link (React 19).
        inert
        aria-hidden="true"
        className="pointer-events-none shrink-0"
        style={{ width: DESIGN_WIDTH, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  )
}
