import React from 'react'

import type { PricingTiersBlock as PricingTiersBlockProps } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import RichText from '@/components/RichText'
import { cn } from '@/utilities/ui'

const colsClasses: Record<string, string> = {
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-2 lg:grid-cols-3',
  '4': 'sm:grid-cols-2 lg:grid-cols-4',
}

const Check: React.FC = () => (
  <svg
    aria-hidden="true"
    className="mt-0.5 size-5 shrink-0 text-primary"
    fill="none"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M5 12.5L10 17.5L19 7" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

/**
 * Grid of membership / pricing plans. Each plan shows a name, optional price,
 * eligibility blurb, a checklist of features, and an optional call to action.
 * One plan can be highlighted as featured (accent border + ring).
 */
export const PricingTiersBlock: React.FC<PricingTiersBlockProps> = (props) => {
  const { columns, header, plans } = props

  const cols = colsClasses[columns ?? '3'] ?? colsClasses['3']
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

      <div className={cn('grid grid-cols-1 gap-6', cols)}>
        {(plans || []).map((plan, i) => (
          <div
            className={cn(
              'flex flex-col border bg-card p-6',
              plan.featured ? 'border-primary ring-1 ring-primary' : 'border-border',
            )}
            key={i}
          >
            <h3 className="type-h4">{plan.name}</h3>
            {plan.price && <p className="mt-2 text-2xl font-bold text-primary">{plan.price}</p>}
            {plan.description && (
              <p className="mt-3 text-sm text-content-secondary">{plan.description}</p>
            )}

            {Array.isArray(plan.features) && plan.features.length > 0 && (
              <ul className="mt-6 flex flex-col gap-3 border-t border-border pt-6">
                {plan.features.map((f, j) => (
                  <li className="flex items-start gap-3 text-sm" key={j}>
                    <Check />
                    <span>{f.feature}</span>
                  </li>
                ))}
              </ul>
            )}

            {Array.isArray(plan.links) && plan.links.length > 0 && (
              <div className="mt-auto flex flex-col gap-3 pt-8">
                {plan.links.map(({ link }, j) => (
                  <CMSLink key={j} {...link} className="w-full justify-center" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
