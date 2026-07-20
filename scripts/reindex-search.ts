import 'dotenv/config'

import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'

/**
 * Rebuild the search index for every PUBLISHED page and post.
 *
 * A bulk DB restore (refresh:local) writes rows straight into Postgres, so the
 * search plugin's afterChange hook — which normally keeps the index current on
 * every save — never fires, and the restored index is prod's frozen copy. This
 * rebuilds it with THIS code's indexing rules (page content, team names, etc).
 *
 * It calls the search plugin's OWN `/reindex` endpoint handler in-process (the
 * same code the admin Reindex button runs), so it reads each published doc and
 * writes its search entry WITHOUT re-validating the source doc — a doc that no
 * longer passes current validation is still reindexed — and it clears orphans.
 * No config is duplicated; the handler closes over the real plugin config.
 *
 * In-process on purpose: it runs this repo's code against the local DB, which is
 * exactly what `npm run dev` serves. Only point DATABASE_URL at another env if
 * that env runs this same code — otherwise use the deployed app's Reindex button
 * (or refresh:staging, which reindexes over HTTP). Touches no S3.
 */
const payload = await getPayload({ config })
try {
  const endpoints = payload.collections['search']?.config.endpoints
  const endpoint = Array.isArray(endpoints)
    ? endpoints.find((e) => e.path === '/reindex' && e.method === 'post')
    : undefined
  if (!endpoint) throw new Error('search reindex endpoint not found — is plugin-search wired?')

  // The endpoint checks update+delete access on `search`, so authorize as an
  // admin (all users in this app are admins). After a refresh these are the
  // restored prod accounts; any one works.
  const { docs: users } = await payload.find({ collection: 'users', limit: 1, depth: 0 })
  const user = users[0]
  if (!user) throw new Error('no user found to authorize the reindex')

  const req = await createLocalReq({ user }, payload)
  req.json = async () => ({ collections: ['posts', 'pages'] })

  const res = await endpoint.handler(req)
  const body = (await res.json().catch(() => ({}))) as { message?: string }
  if (res.status !== 200) throw new Error(`reindex failed (${res.status}): ${body?.message ?? ''}`)
  console.log(`reindex-search: ${body?.message ?? 'done'}`)
} finally {
  await payload.destroy()
}
process.exit(0)
