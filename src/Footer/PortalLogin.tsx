'use client'

import React from 'react'

// Footer member-portal call-out. Mirrors the header Login control (NavMenu): the
// Outseta nocode module (monitorDom) shows this only to anonymous visitors via
// data-o-anonymous, and the click opens the login modal in-page through the SDK.
// A button rather than an <a href="/members…"> on purpose: Outseta injects
// `a[href^="/members"]{display:none!important}`, which would hide a member link
// from exactly the logged-out users this targets, and /members/portal is public
// (the post-login landing) so it never prompts login. The SDK call does.
export function PortalLogin() {
  return (
    <a
      className="mt-4 inline-block text-sm font-semibold text-[var(--neutral-lightest)] underline-offset-4 hover:underline"
      data-o-anonymous="true"
      href="#"
      onClick={(e) => {
        e.preventDefault()
        window.Outseta?.auth?.open({ widgetMode: 'login' })
      }}
      role="button"
    >
      Already a member? Log in to the portal
    </a>
  )
}
