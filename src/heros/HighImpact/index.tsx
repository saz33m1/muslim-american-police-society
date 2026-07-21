import React from 'react'

import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'
import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'

// Split-heading hero: a large serif headline on the left, supporting copy + CTAs
// on the right, over a light brand surface, with a full-width image band below.
// The solid navy header bar overlays the top strip, so the section pulls up under
// it (the shared --header-height/--page-top-pad offset) and re-pads its content
// down. Header theme is fixed navy site-wide, so this hero sets none.
export const HighImpactHero: React.FC<Page['hero']> = ({ links, media, richText }) => {
  // One richText field feeds both columns: heading nodes render on the left, the
  // rest (supporting copy) on the right beside it.
  const nodes = richText?.root?.children ?? []
  const split = (isHeading: boolean): DefaultTypedEditorState | undefined =>
    richText
      ? {
          ...richText,
          root: {
            ...richText.root,
            children: nodes.filter((n) => (n.type === 'heading') === isHeading),
          },
        }
      : undefined
  const headingData = split(true)
  const bodyData = split(false)
  const hasBody = (bodyData?.root?.children?.length ?? 0) > 0
  const hasLinks = Array.isArray(links) && links.length > 0

  return (
    <div className="-mt-[calc(var(--header-height)+var(--page-top-pad))] bg-background pb-16 pt-[calc(var(--header-height)+var(--page-top-pad))]">
      <div className="container">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start lg:gap-12">
          {headingData && <RichText data={headingData} enableGutter={false} />}
          {(hasBody || hasLinks) && (
            <div className="flex flex-col items-start gap-6 lg:pt-3">
              {hasBody && bodyData && <RichText data={bodyData} enableGutter={false} />}
              {hasLinks && (
                <ul className="flex flex-col gap-4 sm:flex-row">
                  {links!.map(({ link }, i) => (
                    <li key={i}>
                      <CMSLink {...link} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        {media && typeof media === 'object' && (
          <div className="relative mt-10 aspect-[16/9] w-full overflow-hidden rounded-lg lg:mt-14">
            <Media fill imgClassName="object-cover" priority resource={media} />
          </div>
        )}
      </div>
    </div>
  )
}
