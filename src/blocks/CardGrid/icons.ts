/**
 * The icon names a CardGrid card's `lucideIcon` field may take.
 *
 * Deliberately a curated set, not the full Lucide registry: `Component.tsx` maps each
 * name to an imported icon, so the bundle only ships the ones we actually use.
 *
 * This module is the single source of truth, and it is React-free on purpose — the
 * block's `config.ts` imports it to build the select options, and config-side code must
 * never pull `lucide-react` (a client dep) into the Payload config graph or
 * `generate:types` breaks. `Component.tsx` types its icon map as
 * `Record<CardIconName, LucideIcon>`, so the list and the map cannot drift: a name here
 * with no icon there is a type error.
 *
 * To add an icon: add the kebab-case name here, then the matching import + map entry in
 * `Component.tsx`, then run `generate:types`.
 */
export const cardIconNames = [
  'badge-dollar-sign',
  'badge-plus',
  'briefcase',
  'circle-plus',
  'file-text',
  'folder-open',
  'landmark',
  'megaphone',
  'mic',
  'network',
  'scale',
  'star',
  'star-plus',
  'users',
  'video',
] as const

export type CardIconName = (typeof cardIconNames)[number]
