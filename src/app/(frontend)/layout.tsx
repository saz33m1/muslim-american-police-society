import type { Metadata } from 'next'

import { cn } from '@/utilities/ui'
import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { Lato, Fraunces } from 'next/font/google'
import React from 'react'

// Brand fonts — the one place a fork picks its typefaces. next/font needs
// statically-analyzable imports, so the font NAME can't come from env/config;
// swap the two imports above and the `weight` lists below. The CSS vars are
// role-named on purpose, so tokens.css never names a specific typeface.
// Lato ships 100/300/400/700/900 only (no 500/600) — body copy is 400, so the
// gap doesn't bite; the browser rounds any stray 500/600 to 700.
const bodyFont = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-body-family',
  display: 'swap',
})

// Fraunces is a variable serif; headings land at 600 (see the type scale).
const headingFont = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading-family',
  display: 'swap',
})

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { Providers } from '@/providers'
import { InitTheme } from '@/providers/Theme/InitTheme'
import { OutsetaScript } from '@/components/OutsetaScript'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME } from '@/utilities/brand'
import { resolveHeaderTheme } from '@/utilities/resolveHeaderTheme'
import { draftMode, headers } from 'next/headers'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()

  // Resolve the per-page header theme server-side (from the path proxy
  // forwards) so the overlay header paints in the right theme immediately,
  // instead of flipping in a post-mount effect. (#134)
  const initialHeaderTheme = await resolveHeaderTheme((await headers()).get('x-pathname'))

  return (
    <html
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        bodyFont.variable,
        headingFont.variable,
      )}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <InitTheme />
        <OutsetaScript />
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body>
        <Providers initialHeaderTheme={initialHeaderTheme}>
          <AdminBar
            adminBarProps={{
              preview: isEnabled,
            }}
          />

          <Header />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  metadataBase: new URL(getServerSideURL()),
  // Plain default, not a template: generateMeta + the search page already append
  // "| SITE_NAME" themselves, so a template here would double the suffix.
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: mergeOpenGraph(),
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    images: [OG_IMAGE],
  },
}
