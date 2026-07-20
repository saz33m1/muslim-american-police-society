'use client'

// reCAPTCHA v3 client helper. Env-gated: with NEXT_PUBLIC_RECAPTCHA_SITE_KEY
// unset, getRecaptchaToken() resolves undefined and the form submits without a
// token (the server hook is also a no-op when its secret is unset). Same
// "set the env to activate" pattern as the S3 / Resend integrations.

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void
      execute: (siteKey: string, opts: { action: string }) => Promise<string>
    }
  }
}

let loader: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (!SITE_KEY) return Promise.resolve()
  if (loader) return loader
  loader = new Promise<void>((resolve, reject) => {
    if (window.grecaptcha) return resolve()
    const s = document.createElement('script')
    s.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('reCAPTCHA failed to load'))
    document.head.appendChild(s)
  })
  return loader
}

/** Warm the script on mount so the first submit isn't delayed by the download. */
export function preloadRecaptcha(): void {
  if (SITE_KEY) void loadScript()
}

/** A reCAPTCHA v3 token for `action`, or undefined when reCAPTCHA isn't configured. */
export async function getRecaptchaToken(action: string): Promise<string | undefined> {
  if (!SITE_KEY) return undefined
  await loadScript()
  return new Promise<string>((resolve, reject) => {
    const g = window.grecaptcha
    if (!g) return reject(new Error('reCAPTCHA unavailable'))
    g.ready(() => {
      g.execute(SITE_KEY, { action }).then(resolve, reject)
    })
  })
}
