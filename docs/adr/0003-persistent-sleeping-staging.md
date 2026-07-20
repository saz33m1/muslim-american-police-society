# ADR 0003: Staging is a persistent Railway environment with App Sleeping, not ephemeral

- **Status:** Accepted
- **Date:** 2026-07-04
- **Issues:** #160 (create staging), #161 (refresh from prod)
- **Decision:** Keep the staging environment **alive permanently** with **App Sleeping** enabled on its web service, reached at the stable custom domain `stage.mapsnational.org`. Do not tear it down between uses.

## Context

Staging exists to rehearse prod deploys (migrations run with `push: false`, exactly like prod) and to let a second person preview changes against production-shaped data. It is used occasionally, not continuously, so idle cost matters.

## Options considered

### A. Ephemeral: delete the environment when idle, rebuild on demand
- **Pros:** near-zero idle cost (~$0.015/hour only while up); staging data is disposable and reproducible from prod via the refresh script, so nothing is lost.
- **Cons:** the custom domain must be re-attached on every rebuild (Railway can hand back a different CNAME target, so DNS gets re-edited and SSL re-provisions with minutes of invalid cert); the auto-generated `*.up.railway.app` URL changes every rebuild, so no stable link to share.

### B. Always on
- **Pros:** stable URL, instant response.
- **Cons:** ~$12 to $15/month for a box that is idle almost all the time.

### C. Persistent environment, App Sleeping on the web service (chosen)
- **Pros:** the environment (and its domain attachment and cert) never dies, so `stage.mapsnational.org` is configured once and stays valid forever; idle web compute scales to zero; total idle cost is roughly the Postgres floor (~$3 to $6/month, the DB cannot sleep).
- **Cons:** first request after sleep cold-starts the Next + Payload container, roughly 15 to 45 seconds; the idle DB still bills.

## Decision

Option C. The users of staging are the two maintainers and the occasional editor preview; a one-time cold start per session is acceptable there, and a stable shareable URL with permanent SSL is worth the small DB floor cost. Fully-ephemeral fights the stable custom domain, always-on pays for idle RAM.

## Consequences

- `stage.mapsnational.org` is wired once (CNAME plus auto-provisioned cert) and never re-plumbed.
- No keep-warm pinger; for a scheduled demo, hit the URL a minute beforehand.
- Staging must not be publicly indexable (site-wide noindex plus an access gate), since it is a permanently reachable copy of prod content.
- Staging data is still disposable: it is refreshed from prod (#161) and never promoted back (see ADR 0002).
- Revisit if staging usage becomes daily (drop sleeping) or truly stops (delete the environment and fall back to ephemeral).
