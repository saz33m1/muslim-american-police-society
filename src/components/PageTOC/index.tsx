'use client'

import React, { useEffect, useState } from 'react'

import { cn } from '@/utilities/ui'

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60) || 'section'

type Item = { id: string; text: string }

/**
 * Sticky left-rail table of contents for long content pages. On mount it scans
 * the page's content wrapper ([data-toc-content]) for section headings (h2),
 * scroll-spies them, and renders only when there are at least three — short
 * pages get nothing. It flags the wrapper active so globals.css reserves a left
 * rail at xl+ (content shifts right); below xl the rail is hidden and content
 * stays full-width. IDs are assigned to anchorless headings so the links work.
 */
export const PageTOC: React.FC = () => {
  const [items, setItems] = useState<Item[]>([])
  const [active, setActive] = useState('')

  useEffect(() => {
    const content = document.querySelector('[data-toc-content]')
    if (!content) return

    const headings = Array.from(content.querySelectorAll('h2')).filter((h) =>
      h.textContent?.trim(),
    ) as HTMLElement[]
    if (headings.length < 3) return

    const seen = new Set<string>()
    const list: Item[] = headings.map((h) => {
      let id = h.id || slugify(h.textContent || '')
      while (seen.has(id)) id = `${id}-x`
      seen.add(id)
      h.id = id
      h.style.scrollMarginTop = '6rem'
      return { id, text: (h.textContent || '').trim() }
    })
    // Derived from a post-render DOM scan (heading text/positions), so it can
    // only run in an effect — not during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(list)
    content.setAttribute('data-toc-active', 'true')

    // Active section = the last heading scrolled above the upper third of the
    // viewport. A throttled scroll listener keeps it current at every position
    // (an IntersectionObserver only fires on crossings, so it goes stale in the
    // gaps between headings).
    let raf = 0
    const recompute = () => {
      const line = window.innerHeight * 0.3
      let current = list[0].id
      for (const h of headings) if (h.getBoundingClientRect().top < line) current = h.id
      setActive(current)
    }
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(recompute)
    }
    recompute()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
      content.removeAttribute('data-toc-active')
    }
  }, [])

  if (items.length < 3) return null

  // Sit in the reserved left gutter of [data-toc-content] (absolute, so it
  // starts below the hero), with the nav itself sticky as the page scrolls.
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 hidden h-full w-60 xl:block"
      aria-hidden={false}
    >
      <nav
        aria-label="On this page"
        className="pointer-events-auto sticky top-28 px-6"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-content-secondary">
          On this page
        </p>
        <ul className="space-y-1 border-l border-border">
          {items.map((it) => (
            <li key={it.id}>
              <a
                className={cn(
                  '-ml-px block border-l-2 py-1 pl-4 text-sm leading-snug transition-colors',
                  active === it.id
                    ? 'border-primary font-medium text-primary'
                    : 'border-transparent text-content-secondary hover:border-content-secondary hover:text-content',
                )}
                href={`#${it.id}`}
              >
                {it.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
