import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import { createRequire } from 'module'
import path from 'path'

import { redirects } from './redirects'

// Workspace root = the directory whose node_modules actually hosts `next`.
// In the main checkout that is this dir (unchanged); in a git worktree (no own
// node_modules) resolution walks up to the repo root, which Turbopack needs as
// its root or it refuses to compile ("couldn't find next/package.json").
const workspaceRoot = path.dirname(
  path.dirname(path.dirname(createRequire(import.meta.url).resolve('next/package.json'))),
)

const NEXT_PUBLIC_SERVER_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.__NEXT_PRIVATE_ORIGIN || 'http://localhost:3000'

const nextConfig: NextConfig = {
  // Temporarily required on Windows until Next.js fixes Turbopack Sass resolution.
  // See: https://github.com/vercel/next.js/issues/86431
  sassOptions: {
    // Absolute so it also resolves from a git worktree (cwd has no node_modules).
    loadPaths: [path.join(workspaceRoot, 'node_modules/@payloadcms/ui/dist/scss/')],
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
      {
        // Static placeholder images used by the internal blocks gallery
        // (/design-system/blocks). See src/blocks/gallery-helpers.ts.
        pathname: '/gallery/**',
      },
      {
        // Real team portraits (importer staging) used as Team Grid gallery samples.
        pathname: '/import/team/**',
      },
    ],
    qualities: [100],
    remotePatterns: [
      ...[NEXT_PUBLIC_SERVER_URL /* 'https://example.com' */].map((item) => {
        const url = new URL(item)

        return {
          hostname: url.hostname,
          protocol: url.protocol.replace(':', '') as 'http' | 'https',
        }
      }),
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  reactStrictMode: true,
  redirects,
  turbopack: {
    root: workspaceRoot,
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
