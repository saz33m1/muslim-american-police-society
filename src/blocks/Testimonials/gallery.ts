import type { Testimonial, TestimonialsBlock as TestimonialsBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { prose } from '@/blocks/gallery-helpers'

// Quotes mirror the Webflow Testimonials CMS (career + programs). No headshots
// here — the block falls back to initials avatars, so the showroom needs no
// extra media files.
const testimonial = (
  author: string,
  role: string,
  type: 'career' | 'programs',
  quote: string,
): Testimonial =>
  ({
    id: author,
    author,
    role,
    type,
    quote: prose(quote),
  }) as unknown as Testimonial

const all: Testimonial[] = [
  testimonial(
    'Amina R.',
    'Program graduate',
    'programs',
    'The MAPS Academy gave me a roadmap into public service I didn’t know existed, and the network to act on it.',
  ),
  testimonial(
    'Yusuf K.',
    'Federal fellow',
    'career',
    'Ahmad’s help reconstructing my resume was the difference between an interview and a rejection. I start at the agency next month.',
  ),
  testimonial(
    'Layla H.',
    'Policy analyst',
    'career',
    'I came in unsure how to translate my background into a government role. I left with a plan and three referrals.',
  ),
  testimonial(
    'Omar S.',
    'Workshop attendee',
    'programs',
    'Every session was practical. No filler, just the steps, the people, and the follow-through.',
  ),
  testimonial(
    'Sara M.',
    'Mentee',
    'programs',
    'Having a mentor who had walked the same path made the whole process feel possible.',
  ),
  testimonial(
    'Bilal A.',
    'Career switcher',
    'career',
    'They treated my transition seriously and matched me with people who actually do the work I wanted.',
  ),
]

export const testimonialsGallery: GalleryBlock<TestimonialsBlockProps> = {
  slug: 'testimonials',
  title: 'Testimonials',
  category: 'content',
  description:
    'Quotes from the Testimonials collection, rendered as an autoplaying pull-quote slider and scopeable to a type (career / programs). On a real page it queries the collection; here it renders a fixed selection.',
  variants: [
    {
      name: 'All types',
      description: 'Default. The slider across both career and programs quotes.',
      props: {
        blockType: 'testimonials',
        populateBy: 'selection',
        type: 'all',
        eyebrow: 'In their words',
        heading: 'What our community says',
        intro: prose('Voices from across the career and programs tracks.'),
        selectedTestimonials: all,
      },
    },
    {
      name: 'Career only',
      description: 'Same slider scoped to a single type via the filter.',
      props: {
        blockType: 'testimonials',
        populateBy: 'selection',
        type: 'career',
        heading: 'Career outcomes',
        selectedTestimonials: all,
      },
    },
  ],
}
