import type React from 'react'
import type { Page, Post } from '@/payload-types'

import { collectionHref } from '@/utilities/collectionHref'
import { getCachedDocument } from '@/utilities/getDocument'
import { getCachedRedirects } from '@/utilities/getRedirects'
import { notFound, permanentRedirect } from 'next/navigation'

interface Props {
  disableNotFound?: boolean
  url: string
}

/* This component helps us with SSR based dynamic redirects */
export const PayloadRedirects: React.FC<Props> = async ({ disableNotFound, url }) => {
  const redirects = await getCachedRedirects()()

  const redirectItem = redirects.find((redirect) => redirect.from === url)

  if (redirectItem) {
    if (redirectItem.to?.url) {
      permanentRedirect(redirectItem.to.url)
    }

    let redirectUrl: string

    if (typeof redirectItem.to?.reference?.value === 'string') {
      const collection = redirectItem.to?.reference?.relationTo
      const id = redirectItem.to?.reference?.value

      const document = (await getCachedDocument(collection, id)()) as Page | Post
      redirectUrl = collectionHref(
        redirectItem.to?.reference?.relationTo as 'pages' | 'posts',
        String(document?.slug ?? ''),
      )
    } else {
      redirectUrl = collectionHref(
        redirectItem.to?.reference?.relationTo as 'pages' | 'posts',
        typeof redirectItem.to?.reference?.value === 'object'
          ? String(redirectItem.to?.reference?.value?.slug ?? '')
          : '',
      )
    }

    if (redirectUrl) permanentRedirect(redirectUrl)
  }

  if (disableNotFound) return null

  notFound()
}
