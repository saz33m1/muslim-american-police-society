import { ExternalLink } from 'lucide-react'

import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/utilities/ui'
import Link from 'next/link'
import React from 'react'

import type { Page, Post } from '@/payload-types'

import { collectionHref } from '@/utilities/collectionHref'

type CMSLinkType = {
  appearance?: 'inline' | ButtonProps['variant']
  children?: React.ReactNode
  className?: string
  label?: string | null
  newTab?: boolean | null
  reference?: {
    relationTo: 'pages' | 'posts'
    value: Page | Post | string | number
  } | null
  size?: ButtonProps['size'] | null
  type?: 'custom' | 'reference' | null
  url?: string | null
}

export const CMSLink: React.FC<CMSLinkType> = (props) => {
  const {
    type,
    appearance = 'inline',
    children,
    className,
    label,
    newTab,
    reference,
    size: sizeFromProps,
    url,
  } = props

  const href =
    type === 'reference' && typeof reference?.value === 'object' && reference.value.slug
      ? collectionHref(reference.relationTo, reference.value.slug)
      : url

  if (!href) return null

  const size = appearance === 'link' ? 'clear' : sizeFromProps
  const newTabProps = newTab ? { rel: 'noopener noreferrer', target: '_blank' } : {}

  // New-tab links warn the user before the context change (WCAG 3.2.5 / G201):
  // a visually-hidden cue for assistive tech (both styles), plus a visible
  // external-link glyph on button-style links for sighted users.
  const newTabSrOnly = newTab ? <span className="sr-only"> (opens in new tab)</span> : null

  /* Ensure we don't break any styles set by richText */
  if (appearance === 'inline') {
    return (
      <Link className={cn(className)} href={href || url || ''} {...newTabProps}>
        {label && label}
        {children && children}
        {newTabSrOnly}
      </Link>
    )
  }

  return (
    <Button asChild className={className} size={size} variant={appearance}>
      <Link className={cn(className)} href={href || url || ''} {...newTabProps}>
        {label && label}
        {children && children}
        {newTab && (
          <span className="inline-flex items-center">
            <ExternalLink aria-hidden="true" className="size-4" />
            {newTabSrOnly}
          </span>
        )}
      </Link>
    </Button>
  )
}
