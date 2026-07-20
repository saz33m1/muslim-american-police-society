import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LOGIN_URL, proxy } from '@/proxy'

// Server-side members gate branch logic (src/proxy.ts). No server/DB: proxy() is a
// pure function of the request. Anonymous requests never call jwtVerify (no cookie),
// so these run offline. Covers the #202 fix the e2e suite can't reach — e2e runs in
// dev (home bounce), so the production LOGIN_URL branch has no other coverage.
// LOGIN_URL is imported (not re-typed here) so a tenant-domain env change can't
// silently desync the test's expectation from proxy.ts's actual redirect target.
const anon = (path: string) => new NextRequest(new URL(`http://localhost:3000${path}`))

describe('members gate (proxy)', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('sends an anonymous gated request to the Outseta login in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const res = await proxy(anon('/members/resources'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(LOGIN_URL)
  })

  it('bounces an anonymous gated request to home in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const res = await proxy(anon('/members/resources'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('forwards /members/login to the Outseta login in production', async () => {
    // Not a real page: the Outseta content group's "Access Denied URL" points here,
    // and the gate forwards it to the hosted login (that field only accepts same-site
    // paths). If this stops redirecting, the portal-bounce flow silently breaks.
    vi.stubEnv('NODE_ENV', 'production')
    const res = await proxy(anon('/members/login'))
    expect(res.headers.get('location')).toBe(LOGIN_URL)
  })

  it('keeps the portal landing public (post-login lands here cookie-less)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const res = await proxy(anon('/members/portal'))
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })
})
