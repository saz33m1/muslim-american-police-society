import Script from 'next/script'
import React from 'react'

/**
 * Outseta auth / membership SDK. Ported from the Webflow site's end-of-<head>
 * snippet, with `tokenStorage: 'cookie'` added so the JWT access token is written
 * to a cookie the server can read — that cookie is what the /members gate
 * (`src/proxy.ts`) verifies. The SDK still powers the login / profile /
 * signup widgets and the join-page plan modals.
 *
 * One script, not two: it sets `window.o_options` and THEN injects outseta.min.js
 * itself, so the config is guaranteed to exist before the SDK initializes. (Two
 * separate next/script tags raced — `beforeInteractive` is only reliable in the
 * root layout, not this route-group layout, so the SDK could load first and throw
 * "[domain] is a required option".)
 */
// Same var name/default as src/proxy.ts's OUTSETA_DOMAIN — keep in sync.
const OUTSETA_DOMAIN = process.env.OUTSETA_DOMAIN ?? 'mapsnational.outseta.com'

export const OutsetaScript: React.FC = () => {
  return (
    <Script
      id="outseta"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
  window.o_options = {
    domain: '${OUTSETA_DOMAIN}',
    load: 'auth,customForm,emailList,leadCapture,nocode,profile,support',
    monitorDom: true,
    tokenStorage: 'cookie',
    auth: {
      // Always land on the ungated /members/portal after hosted login (#115). Leaving
      // this null on prod fell back to the Outseta dashboard default, which could send
      // members to a gated page and redirect-loop against the /members proxy gate
      // (the cookie is written client-side only after the redirect-back).
      authenticationCallbackUrl: window.location.origin + "/members/portal"
    }
  };
  (function () {
    if (document.getElementById('outseta-sdk')) return;
    var s = document.createElement('script');
    s.id = 'outseta-sdk';
    s.src = 'https://cdn.outseta.com/outseta.min.js';
    s.async = true;
    document.head.appendChild(s);
  })();
  `,
      }}
    />
  )
}
