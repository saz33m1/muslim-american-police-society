import type { FAQBlock as FAQBlockProps } from '@/payload-types'
import type { GalleryBlock } from '@/blocks/gallery-types'

import { prose } from '@/blocks/gallery-helpers'

type FAQItem = NonNullable<FAQBlockProps['items']>[number]

const qa = (question: string, answer: string, defaultOpen = false): FAQItem => ({
  question,
  answer: prose(answer),
  defaultOpen,
})

const membershipItems: FAQItem[] = [
  qa(
    'Where do you get members from?',
    'MAPS’ membership can only be accessed through the form on our website. Our membership policy is 100% opt-in to ensure consent is affirmatively established and that member information and preferences are self-selected.',
    true,
  ),
  qa(
    'Membership is free? What’s the catch?',
    'There is no catch. MAPS is a grassroots effort to build and support the national community of Muslim Americans in public service and government, run by Muslim American public servants ourselves.',
  ),
  qa(
    'How does MAPS define “Muslim”?',
    'MAPS does not define or characterize Muslim American communities along theological or sectarian lines. Anyone who self-identifies as Muslim is accepted as such.',
  ),
]

export const faqGallery: GalleryBlock<FAQBlockProps> = {
  slug: 'faq',
  title: 'FAQ',
  category: 'content',
  description:
    'Intro-fused accordion of questions and answers. Native disclosure (keyboard-accessible, no client JavaScript); optional section header with intro and buttons; stacked or side-by-side layout.',
  variants: [
    {
      name: 'Stacked, with header',
      description: 'Header above the accordion — the default for a standalone FAQ section.',
      props: {
        blockType: 'faq',
        layout: 'stacked',
        header: {
          enableHeader: true,
          eyebrow: 'Support',
          heading: 'Frequently asked questions',
          body: prose(
            'Answers to common questions about MAPS — our organization, membership, funding, and programming.',
          ),
          links: [
            { link: { type: 'custom', url: '#', label: 'Contact the team', newTab: false } },
          ],
        },
        items: membershipItems,
      },
    },
    {
      name: 'Side by side',
      description: 'Header in a sticky left column, questions on the right. Good for longer lists.',
      props: {
        blockType: 'faq',
        layout: 'sideBySide',
        header: {
          enableHeader: true,
          heading: 'Membership',
          body: prose('Everything you need to know about joining the MAPS network.'),
        },
        items: membershipItems,
      },
    },
    {
      name: 'Questions only',
      description: 'Header disabled — drop the accordion straight into a page that already has a heading.',
      props: {
        blockType: 'faq',
        layout: 'stacked',
        header: { enableHeader: false },
        items: membershipItems,
      },
    },
  ],
}
