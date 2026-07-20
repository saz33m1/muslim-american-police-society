import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import { APIError, Plugin, type CollectionBeforeValidateHook } from 'payload'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import {
  GenerateDescription,
  GenerateImage,
  GenerateTitle,
  GenerateURL,
} from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'

import { Page, Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'
import { SITE_NAME } from '@/utilities/brand'

const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | ${SITE_NAME}` : SITE_NAME
}

const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

// Only Posts have `heroImage`/`content`; Pages fall through to '' (no change).
const generateImage: GenerateImage<Post | Page> = ({ doc }) => {
  const hero = (doc as Post)?.heroImage
  if (!hero) return ''
  return typeof hero === 'object' ? hero.id : hero
}

const generateDescription: GenerateDescription<Post | Page> = ({ doc }) => {
  const content = (doc as Post)?.content
  if (!content) return ''
  const text = convertLexicalToPlaintext({ data: content }).replace(/\s+/g, ' ').trim()
  return text.slice(0, 150)
}

// Server-side reCAPTCHA v3 verification for public form submissions. Env-gated:
// with RECAPTCHA_SECRET_KEY unset this is a no-op (dev/local default). Reads the
// token the FormBlock posts alongside the submission, verifies it with Google,
// and rejects missing-token or low-score requests before the submission is
// stored or emailed. The token is stripped so it never reaches submission
// validation. Same "set the env to activate" pattern as the S3 / Resend adapters.
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET_KEY
const RECAPTCHA_MIN_SCORE = Number(process.env.RECAPTCHA_MIN_SCORE ?? '0.5')

const verifyRecaptcha: CollectionBeforeValidateHook = async ({ data, operation, req }) => {
  // Only guard new public submissions; skip when unconfigured or admin-created.
  if (!RECAPTCHA_SECRET || operation !== 'create' || req.user) return data

  const raw = data as Record<string, unknown> | undefined
  const token = typeof raw?.recaptchaToken === 'string' ? raw.recaptchaToken : undefined
  if (raw && 'recaptchaToken' in raw) delete raw.recaptchaToken

  const reject = () => new APIError('Spam check failed. Please reload the page and try again.', 403)
  if (!token) throw reject()

  const params = new URLSearchParams({ secret: RECAPTCHA_SECRET, response: token })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (ip) params.set('remoteip', ip)

  let result: { success?: boolean; score?: number } = {}
  try {
    const resp = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })
    result = await resp.json()
  } catch {
    throw reject()
  }

  if (!result.success || (typeof result.score === 'number' && result.score < RECAPTCHA_MIN_SCORE)) {
    // Keep visibility on blocks so a legit user reporting "can't submit" (a v3
    // false positive / low score) is diagnosable; tune RECAPTCHA_MIN_SCORE if so.
    req.payload.logger.warn({ msg: 'reCAPTCHA rejected a form submission', result })
    throw reject()
  }
  return data
}

export const plugins: Plugin[] = [
  redirectsPlugin({
    collections: ['pages', 'posts'],
    overrides: {
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
    generateImage,
    generateDescription,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    formSubmissionOverrides: {
      hooks: {
        beforeValidate: [verifyRecaptcha],
      },
    },
    formOverrides: {
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
    },
  }),
  searchPlugin({
    collections: ['posts', 'pages'],
    // Rank posts above pages so news/updates surface first. Only takes effect
    // because the /search query sorts by `-priority`.
    defaultPriorities: { posts: 20, pages: 10 },
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
    },
  }),
]
