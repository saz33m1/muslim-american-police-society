import React from 'react'

import type { FeatureSplitBlock as FeatureSplitBlockProps } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { cn } from '@/utilities/ui'

/**
 * Alternating image + text section. Text (eyebrow, heading, body, up to two
 * CTAs) sits in one column, the image in the other. `imageSide` swaps the
 * columns on desktop; stack several blocks and alternate it for the classic
 * zig-zag feature layout. Columns stack vertically on mobile, image last.
 */
export const FeatureSplitBlock: React.FC<FeatureSplitBlockProps> = (props) => {
  const { anchorId, body, eyebrow, heading, image, imageSide, links } = props

  const imageLeft = imageSide === 'left'

  return (
    <section className="container" id={anchorId || undefined}>
      <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
        <div className={cn(imageLeft && 'md:order-2')}>
          {eyebrow && (
            <p className="mb-3 type-eyebrow text-primary">
              {eyebrow}
            </p>
          )}
          {heading && <h2 className="type-h2">{heading}</h2>}
          {body && <RichText className="mt-4" data={body} enableGutter={false} />}
          {Array.isArray(links) && links.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-4">
              {links.map(({ link }, i) => (
                <li key={i}>
                  <CMSLink {...link} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cn(imageLeft && 'md:order-1')}>
          {image && typeof image === 'object' && (
            <Media
              className="relative aspect-video overflow-hidden rounded"
              fill
              imgClassName="object-cover"
              resource={image}
            />
          )}
        </div>
      </div>
    </section>
  )
}
