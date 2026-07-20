import React from 'react'

import type { TimelineBlock as TimelineBlockProps } from '@/payload-types'

import RichText from '@/components/RichText'

/**
 * Vertical timeline of dated milestones. Items run down a connector rail, each
 * marked with a dot and showing its date, an optional title, and an optional
 * body. Stacks cleanly on any width (no horizontal scrolling).
 */
export const TimelineBlock: React.FC<TimelineBlockProps> = (props) => {
  const { header, items } = props

  const showHeader = header?.enableHeader && (header.heading || header.body)

  return (
    <section className="container" id={header?.anchorId || undefined}>
      {showHeader && (
        <div className="mb-12 max-w-2xl">
          {header?.heading && (
            <h2 className="type-h2">{header.heading}</h2>
          )}
          {header?.body && <RichText className="mt-4" data={header.body} enableGutter={false} />}
        </div>
      )}

      <ol className="relative ml-3 border-l border-border">
        {(items || []).map((item, i) => (
          <li className="relative ml-8 pb-10 last:pb-0" key={i}>
            <span
              aria-hidden="true"
              className="absolute -left-[2.4rem] top-1 size-3.5 rounded-full border-2 border-background bg-primary"
            />
            <p className="type-eyebrow text-primary">
              {item.date}
            </p>
            {item.title && <h3 className="mt-1 type-h4">{item.title}</h3>}
            {item.body && (
              <RichText className="mt-2 text-content-secondary" data={item.body} enableGutter={false} />
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
