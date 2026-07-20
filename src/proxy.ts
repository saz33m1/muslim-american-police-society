import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { createRemoteJWKSet, jwtVerify } from 'jose'

/**
 * Server-side gate for the members area (Outseta auth).
 *
 * The Webflow site protected /members/* client-side (the Outseta `nocode` module
 * redirected after load) — content was still delivered to logged-out visitors.
 * This enforces it server-side: read the Outseta JWT (written to a cookie by the
 * SDK; see OutsetaScript with tokenStorage:'cookie'), verify it against Outseta's
 * JWKS, and redirect anyone without a valid token to the hosted login. Logged-out
 * visitors never receive the HTML.
 *
 * `/members/portal` stays public: it is the post-login landing (the SDK writes the
 * cookie client-side *after* the redirect back, so the landing must be reachable
 * without a cookie or the gate would loop) and carries no member-only content.
 */

// Server component/module — reads at request time, so a plain (unprefixed) env
// var works; no NEXT_PUBLIC_ build-time inlining needed. Same var name and
// default as OutsetaScript/index.tsx (the client-side SDK init) — keep in sync.
const OUTSETA_DOMAIN = process.env.OUTSETA_DOMAIN ?? 'mapsnational.outseta.com'
export const LOGIN_URL = `https://${OUTSETA_DOMAIN}/auth?widgetMode=login#o-anonymous`

// Lazily fetched + cached at module scope (Edge runtime). Verifies token signatures.
const JWKS = createRemoteJWKSet(new URL(`https://${OUTSETA_DOMAIN}/.well-known/jwks`))

// Members-area paths that must remain public (login landing / login embed).
const PUBLIC_MEMBER_PATHS = new Set(['/members/portal'])

const looksLikeJwt = (value: string) => value.split('.').length === 3

/**
 * Staging access gate (#160). When STAGING_GATE_USER + STAGING_GATE_PASSWORD are
 * both set — staging only; prod and local leave them unset, so this is inert
 * there — every route requires HTTP Basic auth and the whole site is marked
 * noindex. Keeps the permanently-reachable staging copy of prod content from
 * being crawled or browsed anonymously. /api is not matched (see config below);
 * that's fine — staging content mirrors prod content, which is already public.
 */
const GATE_USER = process.env.STAGING_GATE_USER
const GATE_PASS = process.env.STAGING_GATE_PASSWORD
const GATE_ON = Boolean(GATE_USER && GATE_PASS)

function gatePasses(req: NextRequest): boolean {
  // Railway's platform health check pings the healthcheck path and can't send
  // credentials; let it through (it only pings, never browses).
  // ponytail: UA match — if Railway changes the agent, point healthcheckPath at
  // an unmatched /api route instead.
  if (req.headers.get('user-agent')?.includes('RailwayHealthCheck')) return true
  const [scheme, encoded] = (req.headers.get('authorization') || '').split(' ')
  if (scheme !== 'Basic' || !encoded) return false
  let decoded = ''
  try {
    decoded = atob(encoded)
  } catch {
    return false
  }
  const sep = decoded.indexOf(':')
  return sep > 0 && decoded.slice(0, sep) === GATE_USER && decoded.slice(sep + 1) === GATE_PASS
}

/**
 * True if the request carries a cookie holding a valid Outseta-signed JWT. We
 * prefer the documented cookie name but fall back to verifying any JWT-shaped
 * cookie, so a forged/expired token never passes and a cookie-name change can't
 * silently break the gate.
 */
async function hasValidToken(req: NextRequest): Promise<boolean> {
  const all = req.cookies.getAll()
  const ordered = [
    ...all.filter((c) => c.name === 'Outseta.nocode.accessToken'),
    ...all.filter((c) => c.name !== 'Outseta.nocode.accessToken' && /outseta|token/i.test(c.name)),
  ]
  for (const cookie of ordered) {
    if (!cookie.value || !looksLikeJwt(cookie.value)) continue
    try {
      await jwtVerify(cookie.value, JWKS)
      return true
    } catch {
      // Try the next candidate; fail closed if none verify.
    }
  }
  return false
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Expose the current path to server components (the root layout reads it to
  // resolve the per-page header theme before first paint — #134). Forwarded on
  // the request headers so `headers()` can read it downstream.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', pathname)
  const pass = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    if (GATE_ON) res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return res
  }

  // Staging gate: every route needs Basic auth before anything else runs.
  if (GATE_ON && !gatePasses(req)) {
    return new NextResponse('Staging: authentication required.', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="staging", charset="UTF-8"',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  }

  // The auth gate only guards the members area; every other route just passes
  // through (now that the matcher is site-wide for the x-pathname header).
  if (!pathname.startsWith('/members')) return pass()
  if (PUBLIC_MEMBER_PATHS.has(pathname)) return pass()
  if (await hasValidToken(req)) return pass()

  // In dev the hosted Outseta login can't redirect back (its post-login URL is the
  // prod domain), so sending devs there sets the cookie on the wrong origin and
  // loops. Bounce to home instead — log in via the embedded top-bar widget, which
  // writes the cookie same-origin on localhost. Prod keeps the hosted gate.
  // Decided by NODE_ENV, not hostname: behind Railway's proxy the container sees a
  // localhost hostname, so a host sniff sent prod/staging visitors home too.
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.redirect(new URL('/', req.url))
  }
  return NextResponse.redirect(new URL(LOGIN_URL))
}

export const config = {
  // Run on all page routes (so x-pathname is set for the header theme), but skip
  // Next internals, the API, and static files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)'],
}
