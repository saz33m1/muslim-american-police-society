import {
  ArrowRight,
  BadgeDollarSign,
  BadgePlus,
  Briefcase,
  CirclePlus,
  FileText,
  FolderOpen,
  Landmark,
  Megaphone,
  Mic,
  Network,
  Scale,
  Star,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react'
import React from 'react'

import type { CardGridBlock as CardGridBlockProps } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { cn } from '@/utilities/ui'

import { StarPlus } from './StarPlus'
import { type CardIconName } from './icons'

const colsClasses: Record<string, string> = {
  '2': 'sm:grid-cols-2',
  '3': 'sm:grid-cols-2 lg:grid-cols-3',
  '4': 'sm:grid-cols-2 lg:grid-cols-4',
}

// Curated Lucide set the `lucideIcon` card field can name. Kept explicit (not the
// full registry) so the bundle only ships the icons we use; extend as cards need them.
// Every name in `cardIconNames` must have an icon here (and vice versa): the Record's
// key type is the name union, so adding a name to icons.ts without adding it here is a
// type error rather than a card that silently renders no icon.
const cardIcons: Record<CardIconName, LucideIcon> = {
  'badge-dollar-sign': BadgeDollarSign,
  'badge-plus': BadgePlus,
  briefcase: Briefcase,
  'circle-plus': CirclePlus,
  'file-text': FileText,
  'folder-open': FolderOpen,
  landmark: Landmark,
  megaphone: Megaphone,
  mic: Mic,
  network: Network,
  scale: Scale,
  star: Star,
  // Not in lucide-react 0.563 — vendored from v1's icon node (see StarPlus.tsx).
  'star-plus': StarPlus,
  users: Users,
  video: Video,
}

export const CardGridBlock: React.FC<CardGridBlockProps> = (props) => {
  const { header, columns, mediaType, items } = props

  const cols = colsClasses[columns ?? '3'] ?? colsClasses['3']
  const showHeader = header?.enableHeader && (header.eyebrow || header.heading || header.body)

  return (
    <section className="container scroll-mt-24" id={header?.anchorId || undefined}>
      {showHeader && (
        <div className="mb-12 max-w-2xl">
          {header?.eyebrow && <p className="mb-3 type-eyebrow text-primary">{header.eyebrow}</p>}
          {header?.heading && <h2 className="type-h2">{header.heading}</h2>}
          {header?.body && <RichText className="mt-4" data={header.body} enableGutter={false} />}
        </div>
      )}

      <div className={cn('grid grid-cols-1 gap-x-8 gap-y-12', cols)}>
        {items?.map((item, index) => {
          const {
            icon,
            image,
            heading,
            badge,
            lucideIcon,
            body,
            links,
            enableCardLink,
            cardLink,
            requiredPlans,
            featured,
          } = item
          const media = mediaType === 'icon' ? icon : mediaType === 'image' ? image : null
          const hasImage = mediaType === 'image' && media && typeof media === 'object'
          const hasIcon = mediaType === 'icon' && media && typeof media === 'object'
          // Decorative topic icon for imageless cards: a tinted brand-navy chip that
          // anchors the eye per card. Aria-hidden — the heading carries the meaning.
          const DecoIcon =
            !hasImage && lucideIcon ? cardIcons[lucideIcon as CardIconName] : undefined
          // Whole-card link: an absolute overlay makes the entire surface (image
          // included) clickable; the button is suppressed when the card links.
          const isCardLink = Boolean(enableCardLink && cardLink)

          const textBody = (
            <>
              {/* Solid brand-navy tile with a reversed-out icon — a bold per-card
                  anchor. Inverted on featured (navy-filled) cards so it stays legible. */}
              {DecoIcon && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mb-4 inline-flex size-12 items-center justify-center rounded-xl',
                    featured
                      ? 'bg-primary-foreground text-primary'
                      : 'bg-primary text-primary-foreground',
                  )}
                >
                  <DecoIcon className="size-6" />
                </span>
              )}
              {badge && (
                <span className="mb-2 inline-flex w-fit items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {badge}
                </span>
              )}
              {heading && <h3 className="type-h4">{heading}</h3>}
              {body && (
                <RichText
                  className={cn(
                    'mt-3',
                    featured ? 'text-primary-foreground/80' : 'text-muted-foreground',
                  )}
                  data={body}
                  enableGutter={false}
                />
              )}
              {!isCardLink && Array.isArray(links) && links.length > 0 && (
                <div className="relative z-20 mt-auto flex flex-wrap gap-3 pt-6">
                  {links.map(({ link }, i) => (
                    // sr-only heading suffix disambiguates otherwise-identical CTA
                    // labels (e.g. eight "Get started" tiles) for screen-reader
                    // link navigation — WCAG 2.4.4. Visible text is unchanged.
                    <CMSLink key={i} {...link}>
                      {heading && <span className="sr-only">{`: ${heading}`}</span>}
                    </CMSLink>
                  ))}
                </div>
              )}
              {/* Whole-card link with no button/image/fill to signal it: a rest-state
                  arrow advertises the card as navigable on touch and at a glance.
                  Decorative — the overlay link already carries the heading as its name. */}
              {isCardLink && !featured && !hasImage && (
                <span
                  aria-hidden="true"
                  className="mt-auto inline-flex items-center pt-6 text-primary"
                >
                  <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
                </span>
              )}
            </>
          )

          return (
            <div
              className={cn(
                'group relative flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-colors',
                !hasImage && 'p-6',
                isCardLink && !featured && 'hover:border-primary',
                // Featured: filled navy accent (matches the portal quick-action tile)
                // so the active card stands out from neutral/placeholder siblings.
                featured && 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
              )}
              data-required-plans={
                Array.isArray(requiredPlans) && requiredPlans.length > 0
                  ? requiredPlans.join(',')
                  : undefined
              }
              key={index}
            >
              {isCardLink && (
                <CMSLink {...cardLink} className="absolute inset-0 z-10">
                  <span className="sr-only">{heading || 'View'}</span>
                </CMSLink>
              )}

              {hasImage && (
                <div className="relative aspect-[4/3] w-full overflow-hidden">
                  <Media
                    fill
                    imageSize="card"
                    imgClassName="object-cover transition-transform duration-300 group-hover:scale-105"
                    resource={media}
                    size="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
              )}
              {hasIcon && (
                <div className="relative mb-4 h-12 w-12">
                  <Media fill imgClassName="object-contain" resource={media} />
                </div>
              )}

              {hasImage ? (
                <div className="flex flex-1 flex-col px-6 pb-6 pt-5">{textBody}</div>
              ) : (
                textBody
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
