//
// refresh-lock.mjs — the direction lock for prod -> staging refreshes.
//
// Pure (no side effects, no I/O), so it can be exercised by a self-check
// without touching Railway or Docker. refresh-staging.mjs imports this and
// runs it before ANY write; if it throws, that run aborts.
//
const host = (url) => (String(url).match(/@([^/?]+)/) || [, '?'])[1]

/**
 * Throw if the resolved source/target pair could let a write reach prod.
 * @param {{ dstEnv: string, prodDb: string, stageDb: string, prodBucket: string, stageBucket: string }} r
 */
export function assertRefreshDirection(r) {
  if (r.dstEnv !== 'staging') throw new Error("LOCK: target env is not 'staging'.")
  if (!r.prodDb || !r.stageDb) throw new Error('LOCK: could not resolve both DB URLs.')
  if (r.prodDb === r.stageDb) throw new Error('LOCK: prod and staging DB URLs are identical.')
  if (!r.stageBucket || r.prodBucket === r.stageBucket)
    throw new Error('LOCK: buckets identical or empty.')
  if (host(r.stageDb).includes(host(r.prodDb)))
    throw new Error('LOCK: staging DB URL points at the prod host.')
}

// A local target host must be loopback. Because prod and staging both live on
// rlwy.net, requiring loopback here inherently refuses either as the target —
// there's no way a write reaches a remote env.
const LOOPBACK = /^(localhost|127\.0\.0\.1|host\.docker\.internal)(:\d+)?$/

/**
 * Throw if the prod -> LOCAL refresh could write anywhere but the local stack.
 * @param {{ prodDb: string, localDb: string, prodBucket: string, localBucket: string }} r
 */
export function assertLocalTarget(r) {
  if (!r.prodDb || !r.localDb) throw new Error('LOCK: could not resolve both DB URLs.')
  if (!LOOPBACK.test(host(r.localDb)))
    throw new Error(`LOCK: local DB host is not loopback (${host(r.localDb)}).`)
  if (r.prodDb === r.localDb) throw new Error('LOCK: prod and local DB URLs are identical.')
  if (!r.localBucket) throw new Error('LOCK: local bucket empty.')
  if (r.prodBucket === r.localBucket) throw new Error('LOCK: prod and local buckets identical.')
}
