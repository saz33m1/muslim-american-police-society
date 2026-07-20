import type { GalleryBlock } from '@/blocks/gallery-types'

import { prose } from '@/blocks/gallery-helpers'

import type { FormBlockType } from './Component'

type FormDoc = FormBlockType['form']

// The form-builder Form type is large and plugin-owned; build only the fields
// the renderer reads and present them as a Form. Submission is inert here.
const sampleForm = {
  id: 'sample-contact-form',
  title: 'Contact',
  submitButtonLabel: 'Send message',
  confirmationType: 'message',
  confirmationMessage: prose('Thanks — we will be in touch shortly.'),
  fields: [
    { blockType: 'text', name: 'name', label: 'Full name', width: 50, required: true },
    { blockType: 'email', name: 'email', label: 'Email', width: 50, required: true },
    {
      blockType: 'select',
      name: 'topic',
      label: 'Topic',
      width: 100,
      required: false,
      defaultValue: 'general',
      options: [
        { label: 'General enquiry', value: 'general' },
        { label: 'Partnership', value: 'partnership' },
        { label: 'Support', value: 'support' },
      ],
    },
    { blockType: 'textarea', name: 'message', label: 'Message', width: 100, required: true },
    { blockType: 'checkbox', name: 'consent', label: 'I agree to be contacted', width: 100, required: true },
  ],
} as unknown as FormDoc

export const formGallery: GalleryBlock<FormBlockType> = {
  slug: 'formBlock',
  title: 'Form',
  category: 'form',
  description:
    'Renders a form from the form-builder. Fields, labels, widths and the submit label all come from the form definition.',
  variants: [
    {
      name: 'Contact form',
      description: 'Intro plus name, email, topic, message and a consent checkbox. Submission is inert in the gallery.',
      props: {
        enableIntro: true,
        introContent: prose('Get in touch with the MAPS team.') as unknown as FormBlockType['introContent'],
        form: sampleForm,
      },
    },
  ],
}
