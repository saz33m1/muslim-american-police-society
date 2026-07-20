'use client'

import NextImage from 'next/image'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { Carousel } from '@/components/Carousel'
import { cn } from '@/utilities/ui'

export type GalleryImage = {
  alt: string
  caption?: string
  height: number
  src: string
  width: number
}

const gridCols: Record<string, string> = {
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-2 lg:grid-cols-4',
}

// Compact: a dense photo wall, tight gaps, 4:3 tiles. Honors `columns` as the
// max column count (2/3/4); defaults to a four-up wall.
const compactCols: Record<string, string> = {
  '2': 'grid-cols-2',
  '3': 'grid-cols-2 sm:grid-cols-3',
  '4': 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}

/**
 * Shared interactive surface for the MediaGrid and MediaSlider blocks: a tiled
 * grid or a swipeable horizontal slider, plus an optional click-to-zoom
 * lightbox. The lightbox is a modal overlay with keyboard support (Esc to
 * close, arrows to navigate), focus sent to the close button on open and
 * restored to the trigger on close. `columns`/`density` apply to the grid only;
 * the slider ignores them.
 */
export const MediaGalleryClient: React.FC<{
  columns?: string
  density?: string
  images: GalleryImage[]
  layout: string
  lightbox: boolean
}> = ({ columns = '3', density = 'comfortable', images, layout, lightbox }) => {
  const compact = density === 'compact'
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)

  const isSlider = layout === 'slider'

  const open = useCallback(
    (i: number, el: HTMLElement) => {
      if (!lightbox) return
      triggerRef.current = el
      setOpenIndex(i)
    },
    [lightbox],
  )

  const close = useCallback(() => setOpenIndex(null), [])

  const step = useCallback(
    (delta: number) =>
      setOpenIndex((i) => (i === null ? i : (i + delta + images.length) % images.length)),
    [images.length],
  )

  // Manage focus across open/close transitions. Restoring focus to the trigger
  // must happen in an effect (after the dialog has unmounted): doing it in the
  // close handler runs before React removes the dialog, so the browser resets
  // focus to <body> instead.
  useEffect(() => {
    const isOpen = openIndex !== null
    if (isOpen && !wasOpenRef.current) closeRef.current?.focus()
    else if (!isOpen && wasOpenRef.current) triggerRef.current?.focus()
    wasOpenRef.current = isOpen

    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openIndex, close, step])

  return (
    <>
      {isSlider ? (
        <Carousel ariaLabel="Image gallery" autoPlay slideClassName="w-[78%] sm:w-[46%] lg:w-[31%]">
          {images.map((image, i) => (
            <Thumb image={image} index={i} key={i} lightbox={lightbox} onOpen={open} />
          ))}
        </Carousel>
      ) : (
        <ul
          className={cn(
            'grid grid-cols-1',
            compact
              ? cn('gap-2', compactCols[columns] ?? compactCols['4'])
              : cn('gap-4', gridCols[columns] ?? gridCols['3']),
          )}
        >
          {images.map((image, i) => (
            <li key={i}>
              <Thumb compact={compact} image={image} index={i} lightbox={lightbox} onOpen={open} />
            </li>
          ))}
        </ul>
      )}

      {openIndex !== null && (
        <div
          aria-label="Image viewer"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close()
          }}
          role="dialog"
        >
          <button
            aria-label="Close"
            className="absolute right-4 top-4 rounded-md p-2 text-white/90 hover:text-white"
            onClick={close}
            ref={closeRef}
            type="button"
          >
            <CloseIcon />
          </button>

          {images.length > 1 && (
            <>
              <button
                aria-label="Previous image"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-white/80 hover:text-white sm:left-4"
                onClick={() => step(-1)}
                type="button"
              >
                <Chevron dir="left" large />
              </button>
              <button
                aria-label="Next image"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-white/80 hover:text-white sm:right-4"
                onClick={() => step(1)}
                type="button"
              >
                <Chevron dir="right" large />
              </button>
            </>
          )}

          <figure className="flex max-h-full max-w-[75vw] flex-col items-center">
            <NextImage
              alt={images[openIndex].alt}
              className="h-auto max-h-[75vh] w-auto max-w-full object-contain"
              height={images[openIndex].height}
              priority
              // Lightbox is a deliberate click-to-zoom: serve the full original
              // file, not a viewport-sized srcset candidate (the browser otherwise
              // settles on a downscale even though the original is available).
              unoptimized
              src={images[openIndex].src}
              width={images[openIndex].width}
            />
            {images[openIndex].caption && (
              <figcaption className="mt-3 text-center text-sm text-white/80">
                {images[openIndex].caption}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </>
  )
}

/**
 * A single gallery tile. Hoisted to module scope (not nested in the parent) so
 * its component identity is stable across the parent's re-renders, otherwise
 * every lightbox open/close would remount all tiles, detaching the button the
 * lightbox captured for focus restoration.
 */
const Thumb: React.FC<{
  compact?: boolean
  image: GalleryImage
  index: number
  lightbox: boolean
  onOpen: (index: number, el: HTMLElement) => void
}> = ({ compact, image, index, lightbox, onOpen }) => {
  const inner = (
    <NextImage
      alt={image.alt}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      fill
      sizes={
        compact
          ? '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw'
          : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
      }
      src={image.src}
    />
  )
  // 4:3 tiles for both densities, a uniform grid that crops far less than a
  // square would, so landscape (and portrait) photos keep their subject.
  const wrapperCls = cn(
    'group relative block w-full overflow-hidden bg-surface-secondary aspect-[4/3]',
  )

  return lightbox ? (
    <button
      aria-label={`View image ${index + 1}${image.caption ? `: ${image.caption}` : ''}`}
      className={cn(wrapperCls, 'cursor-zoom-in')}
      onClick={(e) => onOpen(index, e.currentTarget)}
      type="button"
    >
      {inner}
    </button>
  ) : (
    <div className={wrapperCls}>{inner}</div>
  )
}

const Chevron: React.FC<{ dir: 'left' | 'right'; large?: boolean }> = ({ dir, large }) => (
  <svg
    aria-hidden="true"
    className={large ? 'size-8' : 'size-5'}
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d={dir === 'left' ? 'M15 6L9 12L15 18' : 'M9 6L15 12L9 18'}
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
)

const CloseIcon: React.FC = () => (
  <svg
    aria-hidden="true"
    className="size-7"
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)
