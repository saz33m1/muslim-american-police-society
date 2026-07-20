import Link from 'next/link'
import React, { Fragment } from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import RichText from '@/components/RichText'

type LowImpactHeroType =
  | {
      breadcrumbs?: Page['hero']['breadcrumbs']
      children?: React.ReactNode
      eyebrow?: Page['hero']['eyebrow']
      links?: Page['hero']['links']
      richText?: never
    }
  | (Omit<Page['hero'], 'richText'> & {
      children?: never
      richText?: Page['hero']['richText']
    })

export const LowImpactHero: React.FC<LowImpactHeroType> = ({
  breadcrumbs,
  children,
  eyebrow,
  links,
  richText,
}) => {
  const hasBreadcrumbs = Array.isArray(breadcrumbs) && breadcrumbs.length > 0
  const hasLinks = Array.isArray(links) && links.length > 0

  return (
    <div className="container mt-16">
      <div className="max-w-[48rem]">
        {hasBreadcrumbs && (
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-content-secondary">
              {breadcrumbs.map(({ label, url }, i) => {
                const isLast = i === breadcrumbs.length - 1
                return (
                  <Fragment key={i}>
                    <li>
                      {url && !isLast ? (
                        <Link className="transition-colors hover:text-foreground" href={url}>
                          {label}
                        </Link>
                      ) : (
                        <span aria-current={isLast ? 'page' : undefined} className="text-foreground">
                          {label}
                        </span>
                      )}
                    </li>
                    {!isLast && (
                      <li aria-hidden="true" className="text-content-secondary/60">
                        /
                      </li>
                    )}
                  </Fragment>
                )
              })}
            </ol>
          </nav>
        )}

        {eyebrow && (
          <p className="mb-3 type-eyebrow text-primary">
            {eyebrow}
          </p>
        )}

        {children || (richText && <RichText data={richText} enableGutter={false} />)}

        {hasLinks && (
          <ul className="mt-6 flex flex-wrap gap-4">
            {links.map(({ link }, i) => (
              <li key={i}>
                <CMSLink {...link} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
