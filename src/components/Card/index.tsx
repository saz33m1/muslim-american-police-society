'use client'
import { cn } from '@/utilities/ui'
import useClickableCard from '@/utilities/useClickableCard'
import Link from 'next/link'
import React, { Fragment } from 'react'

import type { Post } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import { collectionHref } from '@/utilities/collectionHref'

export type CardPostData = Pick<Post, 'slug' | 'categories' | 'meta' | 'title' | 'membersOnlyUrl'> &
  Partial<Pick<Post, 'heroImage'>>

export const Card: React.FC<{
  alignItems?: 'center'
  className?: string
  doc?: CardPostData
  relationTo?: 'pages' | 'posts'
  showCategories?: boolean
  showRegister?: boolean
  title?: string
}> = (props) => {
  const { card, link } = useClickableCard({})
  const { className, doc, relationTo, showCategories, showRegister, title: titleFromProps } = props

  const { slug, categories, heroImage, meta, title, membersOnlyUrl } = doc || {}
  const { image: metaImage } = meta || {}
  // Prefer the square-enforced heroImage; meta.image (also the OG image, often
  // wide) is the fallback for docs without one (e.g. search results).
  const cardImage =
    (heroImage && typeof heroImage === 'object' ? heroImage : null) ??
    (metaImage && typeof metaImage === 'object' ? metaImage : null)

  const hasCategories = categories && Array.isArray(categories) && categories.length > 0
  const titleToUse = titleFromProps || title
  const href = collectionHref(relationTo ?? 'posts', slug ?? '')

  return (
    <article
      className={cn(
        'border border-border rounded-lg overflow-hidden bg-card hover:cursor-pointer',
        className,
      )}
      // useClickableCard's refs are read only in its event handlers/effects, never during render.
      // eslint-disable-next-line react-hooks/refs
      ref={card.ref}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {!cardImage && (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No image
          </div>
        )}
        {cardImage && (
          <Media
            resource={cardImage}
            size="33vw"
            fill
            imgClassName="object-cover"
            pictureClassName="absolute inset-0 block h-full w-full"
          />
        )}
      </div>
      <div className="p-3">
        {showCategories && hasCategories && (
          <div className="uppercase text-xs mb-2">
            {categories?.map((category, index) => {
              if (typeof category === 'object') {
                const { title: titleFromCategory } = category

                const categoryTitle = titleFromCategory || 'Untitled category'

                const isLast = index === categories.length - 1

                return (
                  <Fragment key={index}>
                    {categoryTitle}
                    {!isLast && <Fragment>, &nbsp;</Fragment>}
                  </Fragment>
                )
              }

              return null
            })}
          </div>
        )}
        {/* type-h5 off the canonical ramp, not a prose h3: this card sits beside the
            Featured Galleries prints on the home page, and the prose treatment gave it a
            heavier title than theirs. Same ramp = one card system across both blocks. */}
        {titleToUse && (
          <h3 className="type-h5">
            {/* eslint-disable-next-line react-hooks/refs */}
            <Link href={href} ref={link.ref}>
              {titleToUse}
            </Link>
          </h3>
        )}
        {/* Event sign-up: an inner <a> so useClickableCard defers to it (clicks
            here open the form; the rest of the card still opens the post). */}
        {showRegister && membersOnlyUrl && (
          <CMSLink
            className="mt-4"
            type="custom"
            url={membersOnlyUrl}
            label="Register"
            newTab
            appearance="outline"
            size="sm"
          />
        )}
      </div>
    </article>
  )
}
