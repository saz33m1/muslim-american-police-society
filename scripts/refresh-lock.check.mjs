//
// Self-check for the refresh direction lock + PII scrub. Pure, no infra needed.
//   node scripts/refresh-lock.check.mjs   (or: npm run refresh:staging:check)
//
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { assertRefreshDirection, assertLocalTarget } from './refresh-lock.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))

const ok = {
  dstEnv: 'staging',
  prodDb: 'postgresql://u:p@prod-host.proxy.rlwy.net:1111/railway',
  stageDb: 'postgresql://u:p@stage-host.proxy.rlwy.net:2222/railway',
  prodBucket: 'prod-media',
  stageBucket: 'stage-media',
}
const throws = (patch, re) => assert.throws(() => assertRefreshDirection({ ...ok, ...patch }), re)

// A valid prod->staging pair passes.
assert.doesNotThrow(() => assertRefreshDirection(ok))

// Every way a write could reach prod is refused.
throws({ dstEnv: 'production' }, /not 'staging'/)
throws({ stageDb: '' }, /both DB URLs/)
throws({ stageDb: ok.prodDb }, /identical/)
throws({ stageBucket: ok.prodBucket }, /buckets identical/)
throws({ stageBucket: '' }, /buckets identical/)
// staging URL that resolves to the prod host is caught (same host:port, other db).
throws({ stageDb: 'postgresql://u:p@prod-host.proxy.rlwy.net:1111/other' }, /prod host/)

// The PII scrub must stay wired in the restore SQL.
const src = readFileSync(path.join(here, 'refresh-staging.mjs'), 'utf8')
assert.match(src, /TRUNCATE public\.form_submissions CASCADE/, 'form-submission PII scrub missing')

// --- prod -> local target lock ----------------------------------------------
const okLocal = {
  prodDb: 'postgresql://u:p@prod-host.proxy.rlwy.net:1111/railway',
  localDb: 'postgresql://u:p@localhost:5432/payload-poc',
  prodBucket: 'prod-media',
  localBucket: 'payload-media',
}
const throwsLocal = (patch, re) =>
  assert.throws(() => assertLocalTarget({ ...okLocal, ...patch }), re)

// A valid prod->local pair passes, whether the local host is localhost or the
// host.docker.internal alias the containers actually use.
assert.doesNotThrow(() => assertLocalTarget(okLocal))
assert.doesNotThrow(() =>
  assertLocalTarget({
    ...okLocal,
    localDb: 'postgresql://u:p@host.docker.internal:5432/payload-poc',
  }),
)

// A remote target — prod OR staging, both on rlwy.net — is refused (not loopback).
throwsLocal({ localDb: okLocal.prodDb }, /not loopback/)
throwsLocal({ localDb: 'postgresql://u:p@stage-host.proxy.rlwy.net:2222/railway' }, /not loopback/)
throwsLocal({ localDb: '' }, /both DB URLs/)
throwsLocal({ localBucket: '' }, /local bucket empty/)
throwsLocal({ localBucket: okLocal.prodBucket }, /buckets identical/)

// The PII scrub must stay wired in the local restore SQL too.
const localSrc = readFileSync(path.join(here, 'refresh-local.mjs'), 'utf8')
assert.match(localSrc, /TRUNCATE public\.form_submissions CASCADE/, 'local PII scrub missing')

console.log('refresh-lock self-check: all assertions passed')
