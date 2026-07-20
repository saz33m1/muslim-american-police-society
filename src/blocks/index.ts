import type { Block } from 'payload'

import { AcademyVideos } from './AcademyVideos/config'
import { Archive } from './ArchiveBlock/config'
import { CallToAction } from './CallToAction/config'
import { CardGrid } from './CardGrid/config'
import { ComparisonTable } from './ComparisonTable/config'
import { ContactDetails } from './ContactDetails/config'
import { Content } from './Content/config'
import { FAQ } from './FAQ/config'
import { FeatureSplit } from './FeatureSplit/config'
import { FormBlock } from './Form/config'
import { GalleryHighlights } from './GalleryHighlights/config'
import { LogoStrip } from './LogoStrip/config'
import { MapLocationCards } from './MapLocationCards/config'
import { MediaBlock } from './MediaBlock/config'
import { MemberPortalHero } from './MemberPortalHero/config'
import { MediaGrid } from './MediaGrid/config'
import { MediaSlider } from './MediaSlider/config'
import { PricingTiers } from './PricingTiers/config'
import { Team } from './Team/config'
import { Testimonials } from './Testimonials/config'
import { Timeline } from './Timeline/config'

/**
 * Single source of truth for layout-block FIELD CONFIGS. Collections consume
 * this for their `blocks` field (e.g. `Pages.layout`).
 *
 * Renderer components are registered alongside in `blockComponents.ts`. The two
 * are kept in separate modules on purpose: importing React components here would
 * pull client-only dependencies (next/image, `@payloadcms/ui` styles) into the
 * Payload config graph and break `payload generate:types`. To add a block,
 * register its config here and its component in `blockComponents.ts`.
 */
export const layoutBlocks: Block[] = [
  CallToAction,
  Content,
  MediaBlock,
  Archive,
  FormBlock,
  CardGrid,
  GalleryHighlights,
  FAQ,
  FeatureSplit,
  LogoStrip,
  MediaGrid,
  MediaSlider,
  PricingTiers,
  Timeline,
  ComparisonTable,
  ContactDetails,
  Team,
  Testimonials,
  AcademyVideos,
  MapLocationCards,
  MemberPortalHero,
]
