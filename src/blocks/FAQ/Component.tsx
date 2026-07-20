import React from 'react'

import type { FAQBlock as FAQBlockProps } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import RichText from '@/components/RichText'
import { cn } from '@/utilities/ui'

/**
 * Intro-fused FAQ accordion. Each question is a native `<details>`/`<summary>`
 * disclosure — accessible and keyboard-operable with no client JavaScript, the
 * native rebuild of the source site's Webflow IX2 toggle. The chevron rotates
 * via the Tailwind `open:` variant. Questions are independent (multiple may be
 * open at once).
 */
export const FAQBlock: React.FC<FAQBlockProps> = (props) => {
  const { header, items, layout } = props

  const showHeader = header?.enableHeader && (header.eyebrow || header.heading || header.body)
  const sideBySide = layout === 'sideBySide'

  const intro = showHeader ? (
    <div className={cn('max-w-2xl', sideBySide && 'md:sticky md:top-24')}>
      {header?.eyebrow && <p className="mb-3 type-eyebrow text-primary">{header.eyebrow}</p>}
      {header?.heading && <h2 className="type-h2">{header.heading}</h2>}
      {header?.body && <RichText className="mt-4" data={header.body} enableGutter={false} />}
      {Array.isArray(header?.links) && header.links.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-4">
          {header.links.map(({ link }, i) => (
            <li key={i}>
              <CMSLink {...link} />
            </li>
          ))}
        </ul>
      )}
    </div>
  ) : null

  const list = (
    <div>
      {(items || []).map((item, i) => {
        const showGroupHeading = item.group && item.group !== items?.[i - 1]?.group
        return (
          <React.Fragment key={i}>
            {showGroupHeading && (
              <h3 className={cn('type-h4', i === 0 ? 'mb-3' : 'mb-3 mt-10')}>{item.group}</h3>
            )}
            {i === 0 && !showGroupHeading && <div className="border-t border-border" />}
            <details className="group border-b border-border" open={item.defaultOpen ?? undefined}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-medium [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <svg
                  aria-hidden="true"
                  className="size-5 shrink-0 text-content-secondary transition-transform duration-200 group-open:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </summary>
              {item.answer && (
                <div className="pb-5 pr-9 text-content-secondary">
                  <RichText data={item.answer} enableGutter={false} />
                </div>
              )}
            </details>
          </React.Fragment>
        )
      })}
    </div>
  )

  return (
    <section className="container" id={header?.anchorId || undefined}>
      {sideBySide ? (
        <div className="grid gap-10 md:grid-cols-2 md:gap-16">
          {intro}
          <div>{list}</div>
        </div>
      ) : (
        <>
          {intro && <div className="mb-12">{intro}</div>}
          {list}
        </>
      )}
    </section>
  )
}
