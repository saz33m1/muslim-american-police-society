// Outseta SDK surface (loaded client-side by OutsetaScript). Single source of
// truth for the `window.Outseta` type used by the header auth control (NavMenu)
// and the member portal hero. Visibility of o-anonymous / o-authenticated
// elements is handled by Outseta's nocode module; these methods drive the click
// actions and the personalized greeting.
interface Window {
  Outseta?: {
    auth?: { open: (opts: { widgetMode: 'login' | 'register' }) => void; close?: () => void }
    profile?: { open: (opts?: { tab?: string }) => void; close?: () => void }
    logout?: () => void
    getUser?: () => Promise<Record<string, unknown>> | Record<string, unknown>
  }
}
