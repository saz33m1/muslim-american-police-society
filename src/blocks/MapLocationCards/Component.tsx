import React from 'react'

import type { MapLocationCardsBlock as MapLocationCardsBlockProps } from '@/payload-types'

import RichText from '@/components/RichText'

import { MapView, type MapPin } from './MapView'

type Location = NonNullable<MapLocationCardsBlockProps['locations']>[number]

const LocationCard: React.FC<{ location: Location }> = ({ location }) => (
  <li className="flex flex-col rounded-lg border border-border bg-card p-6 shadow-sm">
    <h3 className="type-h4 text-content">{location.name}</h3>
    {location.address && (
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-content-secondary">
        {location.address}
      </p>
    )}
    <dl className="mt-4 space-y-1 text-sm">
      {location.phone && (
        <div>
          <dt className="sr-only">Phone</dt>
          <dd>
            <a className="text-content-secondary hover:text-primary" href={`tel:${location.phone}`}>
              {location.phone}
            </a>
          </dd>
        </div>
      )}
      {location.email && (
        <div>
          <dt className="sr-only">Email</dt>
          <dd>
            <a
              className="text-content-secondary hover:text-primary"
              href={`mailto:${location.email}`}
            >
              {location.email}
            </a>
          </dd>
        </div>
      )}
    </dl>
    {location.linkUrl && (
      <a
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        href={location.linkUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        {location.linkLabel || 'View details'}
        <span aria-hidden="true">→</span>
      </a>
    )}
  </li>
)

/**
 * Map + Location Cards — location cards beside an optional Google map. The map
 * is env-gated on NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (the #70 decision, revised for
 * JU1): with a key and geocoded locations it renders a client map with one
 * marker per location; without a key (or with no coordinates) the block degrades
 * to cards-only. Only the map itself is client-side; the cards stay server-only.
 */
export const MapLocationCardsBlock: React.FC<MapLocationCardsBlockProps & { id?: string }> = (
  props,
) => {
  const { enableMap, eyebrow, heading, intro, locations } = props

  const items = (locations || []).filter(Boolean)
  if (items.length === 0) return null

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const pins: MapPin[] = items
    .filter((l): l is Location & { lat: number; lng: number } =>
      typeof l.lat === 'number' && typeof l.lng === 'number',
    )
    .map((l) => ({
      lat: l.lat,
      lng: l.lng,
      name: l.name,
      ...(l.address ? { address: l.address } : {}),
      ...(l.phone ? { phone: l.phone } : {}),
      ...(l.email ? { email: l.email } : {}),
      ...(l.linkLabel ? { linkLabel: l.linkLabel } : {}),
      ...(l.linkUrl ? { linkUrl: l.linkUrl } : {}),
    }))
  const showMap = Boolean(enableMap && apiKey && pins.length > 0)

  const hasHeader = eyebrow || heading || intro

  return (
    <section className="container py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        {hasHeader && (
          <div className="mb-12 max-w-2xl">
            {eyebrow && (
              <p className="mb-2 type-eyebrow text-primary">
                {eyebrow}
              </p>
            )}
            {heading && (
              <h2 className="type-h2">{heading}</h2>
            )}
            {intro && <RichText className="mt-4" data={intro} enableGutter={false} />}
          </div>
        )}

        <div className={showMap ? 'grid gap-10 lg:grid-cols-2' : ''}>
          {showMap && (
            <MapView
              apiKey={apiKey!}
              className="aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-surface-secondary lg:sticky lg:top-24 lg:aspect-auto lg:h-[28rem]"
              pins={pins}
            />
          )}
          <ul
            className={
              showMap
                ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1'
                : 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3'
            }
          >
            {items.map((loc, i) => (
              <LocationCard key={loc.id || i} location={loc} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
