import React from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

// Two-column split intro on a full-bleed lightest-neutral masthead band. The band
// pulls up under the transparent header (which keeps its own light theme) so the
// tint reads as an intentional hero zone running to the top of the viewport. Text
// (heading, copy, CTAs) sits left of a contained aspect-video image; stacks on mobile.
export const MediumImpactHero: React.FC<Page['hero']> = ({ links, media, richText }) => {
  const hasLinks = Array.isArray(links) && links.length > 0

  return (
    <div className="-mt-[calc(var(--header-height)+var(--page-top-pad))] bg-muted pb-16 pt-[calc(var(--header-height)+var(--page-top-pad))]">
      <div className="container grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          {richText && <RichText className="mb-6" data={richText} enableGutter={false} />}
          {hasLinks && (
            <ul className="flex flex-col gap-4 sm:flex-row sm:justify-center lg:justify-start">
              {links!.map(({ link }, i) => (
                <li key={i}>
                  {/* Outline buttons sit on the muted masthead band, whose color
                      matches the default outline hover (bg-accent). Keep the white
                      rest fill (distinct on the band) and darken the hover instead. */}
                  <CMSLink
                    {...link}
                    className={
                      link?.appearance === 'outline'
                        ? 'hover:bg-[var(--neutral-light)]'
                        : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        {media && typeof media === 'object' && (
          <figure>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border">
              <Media fill imgClassName="object-cover" priority resource={media} />
            </div>
            {media?.caption && (
              <figcaption className="mt-3">
                <RichText data={media.caption} enableGutter={false} />
              </figcaption>
            )}
          </figure>
        )}
      </div>
    </div>
  )
}
