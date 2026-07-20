'use client'

import NextImage from 'next/image'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/utilities/ui'

/** A category a video belongs to: stable value + display label. */
export type VideoTab = { value: string; label: string }

export type VideoCard = {
  id: string
  title: string
  /** Embeddable player URL (resolved server-side). */
  embedUrl: string
  description?: string
  thumbSrc?: string
  /** thumbSrc is a third-party URL (YouTube) — render with <img>, not next/image. */
  thumbRemote?: boolean
  thumbAlt?: string
  categories: VideoTab[]
}

/** Append an autoplay param, respecting any existing query string. */
const withAutoplay = (url: string): string => `${url}${url.includes('?') ? '&' : '?'}autoplay=1`

/**
 * Academy video grid — a category filter bar over a thumbnail grid; each card
 * opens a focus-managed lightbox that loads the player iframe only on play (Esc
 * / backdrop to close, focus restored to the opening card). Mirrors the Team /
 * MediaGallery client precedent.
 */
export const AcademyVideosClient: React.FC<{ videos: VideoCard[] }> = ({ videos }) => {
  const [active, setActive] = useState<string>('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const wasOpenRef = useRef(false)

  // Distinct categories present in the data, in first-appearance order.
  const tabs = useMemo(() => {
    const seen = new Map<string, string>()
    for (const v of videos) for (const c of v.categories) if (!seen.has(c.value)) seen.set(c.value, c.label)
    return Array.from(seen, ([value, label]) => ({ value, label }))
  }, [videos])

  const showTabs = tabs.length > 1

  const visible = useMemo(
    () =>
      active === 'all' ? videos : videos.filter((v) => v.categories.some((c) => c.value === active)),
    [active, videos],
  )

  const openVideo = useMemo(() => videos.find((v) => v.id === openId) ?? null, [videos, openId])

  const open = useCallback((id: string, el: HTMLElement) => {
    triggerRef.current = el
    setOpenId(id)
  }, [])
  const close = useCallback(() => setOpenId(null), [])

  useEffect(() => {
    const isOpen = openId !== null
    if (isOpen && !wasOpenRef.current) closeRef.current?.focus()
    else if (!isOpen && wasOpenRef.current) triggerRef.current?.focus()
    wasOpenRef.current = isOpen

    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [openId, close])

  return (
    <>
      {showTabs && (
        <div className="mb-10 flex flex-wrap justify-center gap-2" role="tablist">
          <FilterTab active={active === 'all'} label="All" onClick={() => setActive('all')} />
          {tabs.map((t) => (
            <FilterTab
              active={active === t.value}
              key={t.value}
              label={t.label}
              onClick={() => setActive(t.value)}
            />
          ))}
        </div>
      )}

      <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((v) => (
          <li key={v.id}>
            <VideoTile onOpen={open} video={v} />
          </li>
        ))}
      </ul>

      {openVideo && (
        <div
          aria-label={openVideo.title}
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close()
          }}
          role="dialog"
        >
          <div className="relative w-full max-w-4xl">
            <button
              aria-label="Close"
              className="absolute -top-10 right-0 rounded-md p-2 text-white/80 hover:text-white"
              onClick={close}
              ref={closeRef}
              type="button"
            >
              <CloseIcon />
            </button>
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black shadow-xl">
              <iframe
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="size-full"
                src={withAutoplay(openVideo.embedUrl)}
                title={openVideo.title}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const VideoTile: React.FC<{
  video: VideoCard
  onOpen: (id: string, el: HTMLElement) => void
}> = ({ video, onOpen }) => (
  <button
    aria-haspopup="dialog"
    className="group flex w-full flex-col text-left focus:outline-none"
    onClick={(e) => onOpen(video.id, e.currentTarget)}
    type="button"
  >
    <span className="relative block aspect-video w-full overflow-hidden rounded-lg bg-surface-secondary ring-1 ring-border/60 transition group-hover:ring-2 group-hover:ring-primary group-focus-visible:ring-2 group-focus-visible:ring-primary">
      {video.thumbSrc ? (
        video.thumbRemote ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={video.thumbAlt || video.title}
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
            src={video.thumbSrc}
          />
        ) : (
          <NextImage
            alt={video.thumbAlt || video.title}
            className="object-cover"
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            src={video.thumbSrc}
          />
        )
      ) : (
        <span className="absolute inset-0 bg-primary/10" aria-hidden="true" />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-black/55 text-white transition group-hover:bg-primary">
          <PlayIcon />
        </span>
      </span>
    </span>
    <span className="mt-4 font-serif text-lg font-medium leading-snug text-content transition-colors group-hover:text-primary">
      {video.title}
    </span>
    {video.description && (
      <span className="mt-1 line-clamp-2 text-sm text-content-secondary">{video.description}</span>
    )}
  </button>
)

const FilterTab: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({
  active,
  label,
  onClick,
}) => (
  <button
    aria-selected={active}
    className={cn(
      'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors',
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-border text-content-secondary hover:border-primary hover:text-primary',
    )}
    onClick={onClick}
    role="tab"
    type="button"
  >
    {label}
  </button>
)

const PlayIcon: React.FC = () => (
  <svg aria-hidden="true" className="size-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
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
