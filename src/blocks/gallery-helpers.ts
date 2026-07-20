import type { Media } from '@/payload-types'

/**
 * Shared sample-data helpers for block galleries (see `gallery-types.ts`).
 * Centralizes rich-text construction and placeholder media so every block's
 * `gallery.ts` reads uniformly. Render-side only — never imported into the
 * Payload config graph.
 */

type TextNode = {
  type: 'text'
  detail: number
  format: number
  mode: 'normal'
  style: string
  text: string
  version: number
}

type ElementNode = {
  type: string
  children: TextNode[]
  direction: 'ltr'
  format: ''
  indent: number
  version: number
  tag?: string
  textFormat?: number
}

/** Minimal serialized Lexical state, structurally compatible with block `richText` fields. */
export type RichTextValue = {
  root: {
    type: 'root'
    children: ElementNode[]
    direction: 'ltr'
    format: ''
    indent: number
    version: number
  }
}

const text = (t: string): TextNode => ({
  type: 'text',
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text: t,
  version: 1,
})

/** A paragraph node. */
export const paragraph = (t: string): ElementNode => ({
  type: 'paragraph',
  children: [text(t)],
  direction: 'ltr',
  format: '',
  indent: 0,
  textFormat: 0,
  version: 1,
})

/** A heading node (h1–h4). */
export const heading = (t: string, tag: 'h1' | 'h2' | 'h3' | 'h4' = 'h2'): ElementNode => ({
  type: 'heading',
  tag,
  children: [text(t)],
  direction: 'ltr',
  format: '',
  indent: 0,
  version: 1,
})

/** Wrap nodes into a serialized editor state. */
export const richText = (...nodes: ElementNode[]): RichTextValue => ({
  root: { type: 'root', children: nodes, direction: 'ltr', format: '', indent: 0, version: 1 },
})

/** Convenience: a single-paragraph rich-text value. */
export const prose = (t: string): RichTextValue => richText(paragraph(t))

/** Media resource backed by a tracked file in /public/gallery. */
const media = (file: string, width: number, height: number, alt: string): Media => ({
  id: 0,
  alt,
  url: `/gallery/${file}`,
  width,
  height,
  mimeType: 'image/webp',
  filename: file,
  // Doubles as the next/image cache tag — bump when the sample files change.
  updatedAt: '2026-06-22T00:00:00.000Z',
  createdAt: '2026-06-22T00:00:00.000Z',
})

// Real MAPS National event photography and partner logos from the Webflow
// export, copied into /public/gallery so they survive a clean checkout (see
// migration runbook). A varied set so each block/variant gets its own image.

// Landscape event photos — for full-bleed heros, media blocks, and card grids.
export const sampleCapitol = media(
  'event-capitol.webp',
  800,
  450,
  'MAPS members gathered on the steps of the U.S. Capitol',
)
export const sampleSenate = media(
  'event-senate.webp',
  800,
  534,
  'A large MAPS gathering in a U.S. Senate reception room',
)
export const sampleCityHall = media(
  'event-cityhall.webp',
  800,
  600,
  'MAPS members on the grand staircase of a city hall',
)
export const sampleEop = media(
  'event-eop.webp',
  800,
  600,
  'A MAPS panel seated before the Executive Office of the President seal',
)
export const sampleLibrary = media(
  'event-library.webp',
  800,
  600,
  'MAPS members gathered outside the Library of Congress',
)
export const sampleGeorgetown = media(
  'event-georgetown.webp',
  800,
  600,
  'A MAPS panel discussion at Georgetown Law',
)
export const sampleCia = media(
  'event-cia.webp',
  800,
  600,
  'MAPS members in the lobby of CIA headquarters',
)
export const sampleReception = media(
  'event-reception.webp',
  800,
  600,
  'MAPS members at an evening reception beside a MAPS banner',
)

// Square event photos — uniform thumbnails for post cards.
export const sampleSpeaker = media(
  'event-speaker.webp',
  800,
  800,
  'A MAPS member addressing attendees from a podium',
)
export const sampleSummit = media(
  'event-summit.webp',
  800,
  800,
  'Attendees seated at the MAPS National annual summit',
)
export const sampleNetworking = media(
  'event-networking.webp',
  800,
  800,
  'MAPS members networking at an evening reception',
)

// Partner logos — transparent square-ish marks for the icon/partner slots.
export const logoMlsa = media('logo-mlsa.webp', 500, 500, 'Muslim Law Students Association logo')
export const logoCmsa = media(
  'logo-cmsa.webp',
  1080,
  1080,
  'Congressional Muslim Staff Association logo',
)
export const logoAmt = media('logo-amt.webp', 185, 162, 'American Muslim Today logo')
export const logoMaemsa = media(
  'logo-maemsa.webp',
  1200,
  1500,
  'Muslim American EMS Association patch',
)
