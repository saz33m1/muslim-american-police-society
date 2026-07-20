import type React from 'react'

import { AcademyVideos } from './AcademyVideos/config'
import { AcademyVideosBlock } from './AcademyVideos/Component'
import { Archive } from './ArchiveBlock/config'
import { ArchiveBlock } from './ArchiveBlock/Component'
import { CallToAction } from './CallToAction/config'
import { CallToActionBlock } from './CallToAction/Component'
import { CardGrid } from './CardGrid/config'
import { CardGridBlock } from './CardGrid/Component'
import { ComparisonTable } from './ComparisonTable/config'
import { ComparisonTableBlock } from './ComparisonTable/Component'
import { ContactDetails } from './ContactDetails/config'
import { ContactDetailsBlock } from './ContactDetails/Component'
import { Content } from './Content/config'
import { ContentBlock } from './Content/Component'
import { FAQ } from './FAQ/config'
import { FAQBlock } from './FAQ/Component'
import { FeatureSplit } from './FeatureSplit/config'
import { FeatureSplitBlock } from './FeatureSplit/Component'
import { FormBlock as FormConfig } from './Form/config'
import { FormBlock } from './Form/Component'
import { GalleryHighlights } from './GalleryHighlights/config'
import { GalleryHighlightsBlock } from './GalleryHighlights/Component'
import { LogoStrip } from './LogoStrip/config'
import { LogoStripBlock } from './LogoStrip/Component'
import { MapLocationCards } from './MapLocationCards/config'
import { MapLocationCardsBlock } from './MapLocationCards/Component'
import { MediaBlock as MediaConfig } from './MediaBlock/config'
import { MediaBlock } from './MediaBlock/Component'
import { MemberPortalHero as MemberPortalHeroConfig } from './MemberPortalHero/config'
import { MemberPortalHeroBlock } from './MemberPortalHero/Component'
import { MediaGrid as MediaGridConfig } from './MediaGrid/config'
import { MediaGridBlock } from './MediaGrid/Component'
import { MediaSlider as MediaSliderConfig } from './MediaSlider/config'
import { MediaSliderBlock } from './MediaSlider/Component'
import { PricingTiers } from './PricingTiers/config'
import { PricingTiersBlock } from './PricingTiers/Component'
import { Team } from './Team/config'
import { TeamBlock } from './Team/Component'
import { Testimonials } from './Testimonials/config'
import { TestimonialsBlock } from './Testimonials/Component'
import { Timeline } from './Timeline/config'
import { TimelineBlock } from './Timeline/Component'

// Layout-block components have heterogeneous props; RenderBlocks spreads the
// matching block data into each, so a loose component type is intentional.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BlockComponent = React.FC<any>

/**
 * Block slug → renderer component, consumed by RenderBlocks. Register a block's
 * component here and its field config in `index.ts`. Keyed off each config's
 * `slug` so the slug string lives in exactly one place (the config).
 *
 * This module is render-side only (it imports React components) — never import
 * it into the Payload config graph. See `index.ts` for why.
 */
export const blockComponents: Record<string, BlockComponent> = {
  [CallToAction.slug]: CallToActionBlock,
  [Content.slug]: ContentBlock,
  [MediaConfig.slug]: MediaBlock,
  [Archive.slug]: ArchiveBlock,
  [FormConfig.slug]: FormBlock,
  [CardGrid.slug]: CardGridBlock,
  [GalleryHighlights.slug]: GalleryHighlightsBlock,
  [FAQ.slug]: FAQBlock,
  [FeatureSplit.slug]: FeatureSplitBlock,
  [LogoStrip.slug]: LogoStripBlock,
  [MediaGridConfig.slug]: MediaGridBlock,
  [MediaSliderConfig.slug]: MediaSliderBlock,
  [PricingTiers.slug]: PricingTiersBlock,
  [Timeline.slug]: TimelineBlock,
  [ComparisonTable.slug]: ComparisonTableBlock,
  [ContactDetails.slug]: ContactDetailsBlock,
  [Team.slug]: TeamBlock,
  [Testimonials.slug]: TestimonialsBlock,
  [AcademyVideos.slug]: AcademyVideosBlock,
  [MapLocationCards.slug]: MapLocationCardsBlock,
  [MemberPortalHeroConfig.slug]: MemberPortalHeroBlock,
}
