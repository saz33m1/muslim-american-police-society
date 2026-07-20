'use client'

import React from 'react'

import { Carousel } from '@/components/Carousel'
import { Card, type CardPostData } from '@/components/Card'

/**
 * Slider treatment for the Archive feed (home "Latest Updates"). Reuses the
 * shared Carousel primitive — a scroll-snap track with prev/next controls. No
 * autoplay here (news cards), unlike the testimonial/gallery sliders.
 */
export const CollectionArchiveSlider: React.FC<{
  posts: CardPostData[]
  showRegister?: boolean
}> = ({ posts, showRegister }) => {
  const items = posts?.filter((p): p is CardPostData => typeof p === 'object' && p !== null) ?? []
  if (items.length === 0) return null

  return (
    <div className="container">
      {/* 4-up from lg AND capped at the same 256px (max-w-64) as the Featured Galleries
          print, so the two blocks stay the same size at every width. A percentage alone
          isn't enough: the print is fixed-width, so any % slide keeps growing past it on
          a wide monitor (a 23% slide is 276px at 1280 but 302px at 1440). The wider gap
          matches that block's grid; it is passed rather than changed in the shared
          Carousel, whose other two consumers want the tighter default. */}
      <Carousel
        ariaLabel="Latest updates"
        gapClassName="gap-6"
        slideClassName="w-[78%] sm:w-[46%] lg:w-[23%] lg:max-w-64"
      >
        {items.map((result, index) => (
          <Card
            className="h-full"
            doc={result}
            key={index}
            relationTo="posts"
            showCategories
            showRegister={showRegister}
          />
        ))}
      </Carousel>
    </div>
  )
}
