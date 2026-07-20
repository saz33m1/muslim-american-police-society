import type { Post, ArchiveBlock as ArchiveBlockProps } from '@/payload-types'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import RichText from '@/components/RichText'

import { CollectionArchive } from '@/components/CollectionArchive'

export const ArchiveBlock: React.FC<
  ArchiveBlockProps & {
    id?: string
  }
> = async (props) => {
  const {
    id,
    anchorId,
    categories,
    display,
    introContent,
    limit: limitFromProps,
    populateBy,
    selectedDocs,
    showRegisterLinks,
  } = props

  // ponytail: `|| 3` would coerce an intentional `limit: 0` ("no limit", a
  // real Payload query convention) to a hardcoded 3, silently hiding most
  // posts on pages like /latest-updates that seed limit:0 on purpose.
  const limit = limitFromProps ?? 10

  let posts: Post[] = []

  if (populateBy === 'collection') {
    const payload = await getPayload({ config: configPromise })

    const flattenedCategories = categories?.map((category) => {
      if (typeof category === 'object') return category.id
      else return category
    })

    const fetchedPosts = await payload.find({
      collection: 'posts',
      depth: 1,
      limit,
      // Sticky posts pinned to the top, then newest-first. Without an explicit
      // sort Payload falls back to creation order, which surfaced stale 2022
      // posts in "Latest Updates". `sticky` is boolean DEFAULT false, so the
      // descending sort floats pinned posts above the rest (no NULLS-first trap);
      // it isn't in `select` because cards don't render it — sort reads the column
      // regardless. Only affects the limited window, so a pinned post beats a
      // newer one for the top slots even when the list is capped.
      sort: ['-sticky', '-publishedAt'],
      // Fetch only what the cards render. membersOnlyUrl (the gated event
      // sign-up link) is pulled in solely when this listing shows Register
      // buttons, so it never ends up in public archive HTML otherwise.
      select: {
        slug: true,
        categories: true,
        heroImage: true,
        meta: true,
        title: true,
        ...(showRegisterLinks ? { membersOnlyUrl: true } : {}),
      },
      // Published-only. The Local API runs with overrideAccess (so membersOnlyUrl
      // stays readable), which also bypasses authenticatedOrPublished — so drafts
      // would otherwise leak in as empty cards. Filter them out explicitly.
      where: {
        _status: { equals: 'published' },
        ...(flattenedCategories && flattenedCategories.length > 0
          ? { categories: { in: flattenedCategories } }
          : {}),
      },
    })

    posts = fetchedPosts.docs as Post[]
  } else {
    if (selectedDocs?.length) {
      const filteredSelectedPosts = selectedDocs.map((post) => {
        if (typeof post.value === 'object') return post.value
      }) as Post[]

      posts = filteredSelectedPosts
    }
  }

  return (
    <div className="my-16 scroll-mt-24" id={anchorId || `block-${id}`}>
      {introContent && (
        <div className="container mb-16">
          <RichText className="ms-0 max-w-[48rem]" data={introContent} enableGutter={false} />
        </div>
      )}
      <CollectionArchive
        display={display ?? 'grid'}
        posts={posts}
        showRegister={Boolean(showRegisterLinks)}
      />
    </div>
  )
}
