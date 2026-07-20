import { createLucideIcon } from 'lucide-react'

/**
 * `star-plus`, built from Lucide's own icon node with Lucide's own factory — so it is a
 * real Lucide icon (same stroke, sizing, and `lucide-star-plus` class), not a hand-drawn
 * lookalike.
 *
 * Why vendored instead of imported: the icon does not exist in the `lucide-react` version
 * this app pins (0.563 ships star / star-half / star-off / stars). It arrived in v1 — but
 * v1 also REMOVED the brand icons (Facebook / Instagram / Linkedin / Youtube) that
 * `src/Footer/Component.tsx` renders, so upgrading to get one card icon would break the
 * footer's social row. Vendoring the single glyph is the smaller, safer trade.
 *
 * Node data copied verbatim from lucide-react v1.24.0 (`dist/esm/icons/star-plus.mjs`),
 * which is ISC-licensed. Delete this file and import `StarPlus` from `lucide-react`
 * directly if the app ever moves to v1 and the footer icons are re-sourced.
 */
export const StarPlus = createLucideIcon('StarPlus', [
  [
    'path',
    {
      d: 'M11.013 18.582 6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.12 2.12 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.12 2.12 0 0 0 1.597-1.16l2.309-4.679a.53.53 0 0 1 .95 0l2.31 4.679a2.12 2.12 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904L20 11.5',
      key: '1hs8rk',
    },
  ],
  ['path', { d: 'M15 18h6', key: '3b3c90' }],
  ['path', { d: 'M18 15v6', key: '9wciyi' }],
])
