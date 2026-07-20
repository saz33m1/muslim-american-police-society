'use client'

import React, { useEffect, useRef, useState } from 'react'

export type MapPin = {
  lat: number
  lng: number
  name: string
  address?: string
  phone?: string
  email?: string
  linkLabel?: string
  linkUrl?: string
}

const esc = (s: string) =>
  s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string,
  )

/** InfoWindow HTML mirroring the location card (name, address, contacts, link). */
const pinContent = (p: MapPin): string => {
  const rows = [`<p style="margin:0 0 4px;font-weight:600;font-size:15px">${esc(p.name)}</p>`]
  if (p.address)
    rows.push(
      `<p style="margin:0 0 6px;white-space:pre-line;font-size:13px;line-height:1.4;color:#444">${esc(p.address)}</p>`,
    )
  if (p.phone)
    rows.push(`<p style="margin:0;font-size:13px"><a href="tel:${esc(p.phone)}">${esc(p.phone)}</a></p>`)
  if (p.email)
    rows.push(
      `<p style="margin:0;font-size:13px"><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></p>`,
    )
  if (p.linkUrl)
    rows.push(
      `<p style="margin:6px 0 0;font-size:13px"><a href="${esc(p.linkUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.linkLabel || 'View details')} →</a></p>`,
    )
  return `<div style="max-width:240px;font-family:inherit">${rows.join('')}</div>`
}

// Load the Maps JS API once per page; later callers await the same promise.
let mapsPromise: Promise<void> | null = null
const loadMaps = (apiKey: string): Promise<void> => {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  // @ts-expect-error google is injected by the script at runtime
  if (window.google?.maps) return Promise.resolve()
  if (mapsPromise) return mapsPromise
  mapsPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      // Don't cache the failure — let a later mount retry the load.
      mapsPromise = null
      s.remove()
      reject(new Error('Google Maps failed to load'))
    }
    document.head.appendChild(s)
  })
  return mapsPromise
}

/**
 * Client-side Google Map that drops one marker per location and fits the
 * viewport to them. Self-contained: loads the JS API on mount and renders
 * nothing if it fails (the parent already shows the location cards). Pins are
 * server-provided and effectively static, so the effect keys on a serialized
 * copy rather than the array identity.
 */
export const MapView: React.FC<{ apiKey: string; pins: MapPin[]; className?: string }> = ({
  apiKey,
  pins,
  className,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const pinsKey = JSON.stringify(pins)

  useEffect(() => {
    let cancelled = false
    // Reset before each (re)load so a prior failure doesn't stick.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFailed(false)
    loadMaps(apiKey)
      .then(() => {
        if (cancelled || !ref.current) return
        // @ts-expect-error google is injected by the script at runtime
        const g = window.google.maps
        const map = new g.Map(ref.current, {
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        })
        // One shared InfoWindow, repositioned on each marker click (Google's
        // recommended pattern — avoids leaving multiple popups open).
        const info = new g.InfoWindow()
        const bounds = new g.LatLngBounds()
        for (const p of pins) {
          const pos = { lat: p.lat, lng: p.lng }
          // ponytail: classic Marker — deprecated but functional; AdvancedMarker
          // would need a mapId + the 'marker' library for no visible gain here.
          const marker = new g.Marker({ map, position: pos, title: p.name })
          marker.addListener('click', () => {
            info.setContent(pinContent(p))
            info.open({ map, anchor: marker })
          })
          bounds.extend(pos)
        }
        if (pins.length === 1) {
          map.setCenter(pins[0])
          map.setZoom(14)
        } else if (pins.length > 1) {
          map.fitBounds(bounds, 48)
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, pinsKey])

  if (failed) return null
  return <div aria-label="Map of locations" className={className} ref={ref} role="img" />
}
