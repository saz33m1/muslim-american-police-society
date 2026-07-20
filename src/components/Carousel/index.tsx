'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/utilities/ui'

/**
 * Shared scroll-snap carousel with optional autoplay. One primitive backing the
 * Testimonials slider, the home Latest Updates slider and the MediaGallery
 * community slider — no carousel dependency, just a horizontal snap track plus
 * prev/next controls.
 *
 * Each child becomes a slide (`shrink-0 snap-start` + the caller's
 * `slideClassName` for width). Autoplay advances one slide every `interval`ms,
 * loops at the end, and pauses on hover / keyboard focus; it is disabled when the
 * user prefers reduced motion.
 */
export const Carousel: React.FC<{
  children: React.ReactNode
  /** Width (and any extra) classes for each slide, e.g. 'w-[78%] sm:w-[46%] lg:w-[31%]'. */
  slideClassName?: string
  /** Track gap between slides (default 'gap-4'). */
  gapClassName?: string
  className?: string
  ariaLabel?: string
  autoPlay?: boolean
  /** Autoplay interval in ms (default 5000). */
  interval?: number
  showArrows?: boolean
  /** Extra classes for the controls row, e.g. 'justify-start' to left-align it. */
  controlsClassName?: string
  /** Show an "NN / NN" position counter in the controls row. */
  showCounter?: boolean
}> = ({
  children,
  slideClassName,
  gapClassName = 'gap-4',
  className,
  ariaLabel = 'Carousel',
  autoPlay = false,
  interval = 5000,
  showArrows = true,
  controlsClassName,
  showCounter = false,
}) => {
  const slides = React.Children.toArray(children)
  const count = slides.length
  const trackRef = useRef<HTMLUListElement>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(autoPlay)
  const paused = useRef(false)

  const goTo = useCallback(
    (i: number, behavior: ScrollBehavior = 'smooth') => {
      const track = trackRef.current
      if (!track || count === 0) return
      const next = ((i % count) + count) % count
      const el = track.children[next] as HTMLElement | undefined
      if (el) track.scrollTo({ left: el.offsetLeft, behavior })
      setIndex(next)
    },
    [count],
  )

  // Reduced-motion users don't get an auto-start, but keep the play control so
  // they can opt in.
  useEffect(() => {
    if (
      autoPlay &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlaying(false)
    }
  }, [autoPlay])

  // Autoplay: advance on a timer while playing, paused on hover/focus.
  useEffect(() => {
    if (!playing || count <= 1) return
    const id = window.setInterval(() => {
      if (!paused.current) goTo(index + 1)
    }, interval)
    return () => window.clearInterval(id)
  }, [playing, count, index, interval, goTo])

  if (count === 0) return null

  const pause = () => {
    paused.current = true
  }
  const resume = () => {
    paused.current = false
  }

  return (
    <div
      className={cn('relative', className)}
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={resume}
      role="group"
    >
      <ul
        ref={trackRef}
        // Keyboard-focusable scrollable region (axe scrollable-region-focusable):
        // some slides (e.g. the testimonials pull-quotes) carry no focusable child,
        // so the track itself must be tabbable to be reachable/scrollable by keyboard.
        aria-label={ariaLabel}
        className={cn(
          'relative flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          gapClassName,
        )}
        tabIndex={0}
      >
        {slides.map((slide, i) => (
          <li key={i} className={cn('shrink-0 snap-start', slideClassName)}>
            {slide}
          </li>
        ))}
      </ul>

      {/* Announce the active slide to assistive tech (axe: no live region before). */}
      <div aria-live="polite" className="sr-only">
        {`${ariaLabel}: ${index + 1} of ${count}`}
      </div>

      {count > 1 && (showArrows || autoPlay || showCounter) && (
        <div className={cn('mt-4 flex items-center justify-end gap-3', controlsClassName)}>
          {showCounter && (
            <span aria-hidden="true" className="type-small tabular-nums text-content-secondary">
              {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </span>
          )}
          {autoPlay && (
            <button
              aria-label={playing ? 'Pause' : 'Play'}
              aria-pressed={!playing}
              className="flex size-11 items-center justify-center rounded-full border border-border-strong text-content transition-colors hover:bg-surface-secondary"
              onClick={() => setPlaying((p) => !p)}
              type="button"
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
          )}
          {showArrows && (
            <>
              <button
                aria-label="Previous"
                className="flex size-11 items-center justify-center rounded-full border border-border-strong text-content transition-colors hover:bg-surface-secondary"
                onClick={() => goTo(index - 1)}
                type="button"
              >
                <Arrow dir="left" />
              </button>
              <button
                aria-label="Next"
                className="flex size-11 items-center justify-center rounded-full border border-border-strong text-content transition-colors hover:bg-surface-secondary"
                onClick={() => goTo(index + 1)}
                type="button"
              >
                <Arrow dir="right" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const PauseIcon: React.FC = () => (
  <svg aria-hidden="true" className="size-5" fill="currentColor" viewBox="0 0 24 24">
    <rect height="14" rx="1" width="4" x="6" y="5" />
    <rect height="14" rx="1" width="4" x="14" y="5" />
  </svg>
)

const PlayIcon: React.FC = () => (
  <svg aria-hidden="true" className="size-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.29-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
  </svg>
)

const Arrow: React.FC<{ dir: 'left' | 'right' }> = ({ dir }) => (
  <svg
    aria-hidden="true"
    className={cn('size-5', dir === 'left' && 'rotate-180')}
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 12h14M13 6l6 6-6 6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
)
