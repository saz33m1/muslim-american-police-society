import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { s3Storage } from '@payloadcms/storage-s3'
import sharp from 'sharp'
import path from 'path'
import { buildConfig, PayloadRequest } from 'payload'
import { fileURLToPath } from 'url'

import { AcademyVideos } from './collections/AcademyVideos'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Pages } from './collections/Pages'
import { Posts } from './collections/Posts'
import { Team } from './collections/Team'
import { TeamCategories } from './collections/TeamCategories'
import { Testimonials } from './collections/Testimonials'
import { Users } from './collections/Users'
import { VideoCategories } from './collections/VideoCategories'
import { Footer } from './Footer/config'
import { Header } from './Header/config'
import { plugins } from './plugins'
import { defaultLexical } from '@/fields/defaultLexical'
import { EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME } from '@/utilities/brand'
import { getServerSideURL } from './utilities/getURL'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Media storage: S3-compatible adapter (MinIO dev parity / R2 prod / AWS S3),
// gated on env. When S3_BUCKET + S3_ENDPOINT are unset the adapter stays
// inactive and Payload falls back to local-disk storage (public/media). The
// backend swap MinIO -> R2 -> S3 is a credentials-only change — one code path,
// no per-environment branching.
const s3Enabled = Boolean(process.env.S3_BUCKET && process.env.S3_ENDPOINT)

const storagePlugins = s3Enabled
  ? [
      s3Storage({
        collections: { media: true },
        bucket: process.env.S3_BUCKET as string,
        config: {
          endpoint: process.env.S3_ENDPOINT,
          region: process.env.S3_REGION || 'us-east-1',
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID as string,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY as string,
          },
          // Path-style addressing: required by MinIO, supported by R2. Railway
          // Buckets (and AWS S3) are virtual-hosted-style, so they set
          // S3_FORCE_PATH_STYLE=false. Default stays true for the local MinIO dev.
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
        },
      }),
    ]
  : []

// Transactional email: Resend adapter, gated on env (mirrors the S3 pattern).
// With RESEND_API_KEY unset the adapter stays inactive and Payload falls back to
// its console "email writer" — form submissions still persist to the
// form-submissions collection, they just aren't emailed (the dev/local default).
// Activate by setting RESEND_API_KEY and verifying the sending domain in Resend;
// the form-builder then delivers each form's notification emails. Backend swap is
// a credentials-only change, one code path — same philosophy as the S3 adapter.
// A comma-separated recipient string -> a trimmed array. The form-builder's
// cc/bcc/to are single text fields, but Resend rejects a comma-joined string
// (422 "Invalid cc field") — it wants one address per entry or an array.
const splitRecipients = (v: unknown) =>
  typeof v === 'string' && v.includes(',')
    ? v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : v

const resendBase = process.env.RESEND_API_KEY
  ? resendAdapter({
      defaultFromAddress: process.env.EMAIL_FROM_ADDRESS || EMAIL_FROM_ADDRESS,
      defaultFromName: process.env.EMAIL_FROM_NAME || EMAIL_FROM_NAME,
      apiKey: process.env.RESEND_API_KEY,
    })
  : undefined

// Wrap the adapter so multi-recipient text fields (e.g. a contact form CC-ing
// operations + cto) are normalized to arrays before they reach Resend.
const emailAdapter: typeof resendBase = resendBase
  ? (deps) => {
      const adapter = resendBase(deps)
      const sendEmail = adapter.sendEmail
      return {
        ...adapter,
        sendEmail: (message) =>
          sendEmail({
            ...message,
            to: splitRecipients(message.to) as typeof message.to,
            cc: splitRecipients(message.cc) as typeof message.cc,
            bcc: splitRecipients(message.bcc) as typeof message.bcc,
          }),
      }
    }
  : undefined

export default buildConfig({
  admin: {
    components: {
      // The `BeforeLogin` component renders a message that you see while logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeLogin: ['@/components/BeforeLogin'],
      // The `BeforeDashboard` component renders the 'welcome' block that you see after logging into your admin panel.
      // Feel free to delete this at any time. Simply remove the line below.
      beforeDashboard: ['@/components/BeforeDashboard'],
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    user: Users.slug,
    // Local dev convenience: prefill the admin login form so you don't retype
    // creds. Guarded to development — prod/staging run NODE_ENV=production, where
    // this is `false` and never renders. Override the creds via env; set
    // `prefillOnly: false` to skip the login screen and auto-authenticate.
    autoLogin:
      process.env.NODE_ENV === 'development'
        ? {
            email: process.env.PAYLOAD_AUTOLOGIN_EMAIL || 'dev@payloadcms.com',
            password: process.env.PAYLOAD_AUTOLOGIN_PASSWORD || 'test',
            prefillOnly: true,
          }
        : false,
    livePreview: {
      breakpoints: [
        {
          label: 'Mobile',
          name: 'mobile',
          width: 375,
          height: 667,
        },
        {
          label: 'Tablet',
          name: 'tablet',
          width: 768,
          height: 1024,
        },
        {
          label: 'Desktop',
          name: 'desktop',
          width: 1440,
          height: 900,
        },
      ],
    },
  },
  // This config helps us configure global or default features that the other editors can inherit
  editor: defaultLexical,
  email: emailAdapter,
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
      // Managed Postgres (e.g. DigitalOcean) serves a cert chained to the
      // provider's own CA, which Node does not trust by default, so verification
      // fails on the `sslmode=require` URLs they inject. When the provider supplies
      // that CA (DATABASE_CA_CERT), verify the connection against it. Local dev
      // sets no CA and stays plaintext, unaffected.
      ...(process.env.DATABASE_CA_CERT
        ? { ssl: { ca: process.env.DATABASE_CA_CERT.replace(/\\n/g, '\n') } }
        : {}),
    },
  }),
  collections: [
    Pages,
    Posts,
    Media,
    Categories,
    TeamCategories,
    Team,
    Testimonials,
    VideoCategories,
    AcademyVideos,
    Users,
  ],
  cors: [getServerSideURL()].filter(Boolean),
  globals: [Header, Footer],
  plugins: [...plugins, ...storagePlugins],
  secret: process.env.PAYLOAD_SECRET,
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  jobs: {
    access: {
      run: ({ req }: { req: PayloadRequest }): boolean => {
        // Allow logged in users to execute this endpoint (default)
        if (req.user) return true

        const secret = process.env.CRON_SECRET
        if (!secret) return false

        // If there is no logged in user, then check
        // for the Vercel Cron secret to be present as an
        // Authorization header:
        const authHeader = req.headers.get('authorization')
        return authHeader === `Bearer ${secret}`
      },
    },
    tasks: [],
  },
})
