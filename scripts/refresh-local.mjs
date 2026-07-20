#!/usr/bin/env node
//
// refresh-local.mjs — copy a point-in-time snapshot of PROD down to your LOCAL
// dev stack (local Postgres + the MinIO media bucket).
//
// Same one-way contract as refresh-staging.mjs (ADR 0002): prod is read-only
// (dump + bucket read), and a direction lock refuses to run unless the target
// resolves to a loopback host — so a write can never reach prod or staging.
//
// What moves, and why together:
//   1. Media    — mirror prod's bucket into the local MinIO bucket, so the media
//      rows restored in step 2 point at files that actually exist.
//   2. Postgres — reset the local schema and restore a FULL pg_dump of prod. A
//      full dump preserves document ids, so page blocks that reference media by
//      id still resolve.
//
// Prod details are resolved live from Railway by env NAME; the LOCAL target is
// read from .env (DATABASE_URL + S3_*). Shells out to `railway`, `docker`, and
// dockerized postgres:18 / aws-cli — no local Postgres client or aws-cli needed.
// The containers reach your host's Postgres/MinIO via host.docker.internal, so
// this needs Docker Desktop (Windows/macOS).
//
// Usage:  npm run refresh:local            (prompts to confirm)
//         npm run refresh:local -- --yes   (no prompt, for scripting)
//
import { execSync, spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline'

import 'dotenv/config'

import { assertLocalTarget } from './refresh-lock.mjs'

const SRC_ENV = 'production'
// Pin the project id (see refresh-staging.mjs) so we never depend on `railway link`.
const PROJECT_ID = process.env.RAILWAY_PROJECT_ID ?? 'aea720c6-7841-4e7a-955c-945a5ab210e7'
const YES = process.argv.includes('--yes') || process.argv.includes('-y')

const die = (msg) => {
  console.error(`!! ${msg}`)
  process.exit(1)
}

// Read all variables for a service+env as a { KEY: value } map (--kv, nothing to
// JSON-parse). Runs `railway` through the platform shell where the shim lives.
function railwayVars(service, env) {
  let out
  try {
    out = execSync(
      `railway variables --project ${PROJECT_ID} --service ${service} --environment ${env} --kv`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
  } catch {
    die(
      "can't read from Railway. Run 'railway login' (once), confirm 'railway whoami', then retry.",
    )
  }
  const map = {}
  for (const line of out.split(/\r?\n/)) {
    const i = line.indexOf('=')
    if (i > 0) map[line.slice(0, i)] = line.slice(i + 1).replace(/^"|"$/g, '')
  }
  return map
}

// Run docker with an args array (no shell), so nested quotes never get mangled.
function docker(args, { env = {}, quiet = false } = {}) {
  const res = spawnSync('docker', args, {
    stdio: quiet ? ['ignore', 'ignore', 'inherit'] : 'inherit',
    env: { ...process.env, ...env },
  })
  if (res.error) die(`could not run docker (${res.error.message}). Is Docker Desktop running?`)
  if (res.status !== 0) die(`docker step failed: docker ${args.join(' ')}`)
}

const host = (url) => (String(url).match(/@([^/?]+)/) || [, '?'])[1]
// Only the prod (source) URL needs TLS; local Postgres/MinIO run without it.
const withssl = (url) => (url.includes('?') ? `${url}&sslmode=require` : `${url}?sslmode=require`)
// A container can't reach the host on `localhost`; Docker Desktop exposes the
// host as host.docker.internal. Rewrite loopback in any URL/endpoint we hand in.
const toDockerHost = (s) => s.replace(/(localhost|127\.0\.0\.1)/g, 'host.docker.internal')

// --- prereqs -----------------------------------------------------------------
try {
  execSync('docker version', { stdio: 'ignore' })
} catch {
  die('docker is not available. Start Docker Desktop and retry.')
}

// --- resolve source (prod) from Railway, target (local) from .env ------------
console.log('>> resolving prod connection details from Railway...')
const prod = railwayVars('web', SRC_ENV)
const prodPg = railwayVars('Postgres', SRC_ENV)

const PROD_DB = prodPg.DATABASE_PUBLIC_URL
const PROD_ENDPOINT = prod.S3_ENDPOINT
const PROD_REGION = prod.S3_REGION
const PROD_BUCKET = prod.S3_BUCKET

const LOCAL_DB = process.env.DATABASE_URL
const LOCAL_ENDPOINT = process.env.S3_ENDPOINT
const LOCAL_REGION = process.env.S3_REGION || 'us-east-1'
const LOCAL_BUCKET = process.env.S3_BUCKET
const LOCAL_KEY = process.env.S3_ACCESS_KEY_ID
const LOCAL_SECRET = process.env.S3_SECRET_ACCESS_KEY

if (!PROD_DB) die('no prod DATABASE_PUBLIC_URL from Railway.')
if (!PROD_BUCKET) die('no prod S3_BUCKET from Railway.')
if (!LOCAL_DB) die('no local DATABASE_URL in .env.')
if (!LOCAL_ENDPOINT || !LOCAL_BUCKET)
  die('no local S3_ENDPOINT / S3_BUCKET in .env — is MinIO configured? (see docker-compose.yml)')

// --- direction lock (must pass before ANY write) -----------------------------
try {
  assertLocalTarget({
    prodDb: PROD_DB,
    localDb: LOCAL_DB,
    prodBucket: PROD_BUCKET,
    localBucket: LOCAL_BUCKET,
  })
} catch (e) {
  die(e.message)
}

console.log(`   source (prod):  db ${host(PROD_DB)}  bucket ${PROD_BUCKET}`)
console.log(`   target (local): db ${host(LOCAL_DB)}  bucket ${LOCAL_BUCKET}`)

// --- confirm (destructive to local) ------------------------------------------
if (!YES) {
  console.log('\nThis REPLACES all local content (DB + media bucket) with a prod snapshot.')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ans = await new Promise((r) => rl.question("Type 'refresh local' to continue: ", r))
  rl.close()
  if (ans.trim() !== 'refresh local') die('aborted.')
}

// --- 1. media: prod bucket -> local MinIO bucket -----------------------------
// Two different S3 backends (Railway bucket -> MinIO), different creds, so hop
// through a throwaway Docker volume. MinIO has no bucket-subdomain host, so the
// local hop must address it path-style.
console.log(`>> syncing media bucket (${PROD_BUCKET} -> ${LOCAL_BUCKET})...`)
const vol = `refresh-local-media-${process.pid}`
docker(['volume', 'create', vol], { quiet: true })
try {
  // prod -> volume
  docker(
    [
      'run',
      '--rm',
      '-e',
      'AWS_ACCESS_KEY_ID',
      '-e',
      'AWS_SECRET_ACCESS_KEY',
      '-v',
      `${vol}:/data`,
      'amazon/aws-cli',
      '--endpoint-url',
      PROD_ENDPOINT,
      '--region',
      PROD_REGION,
      's3',
      'sync',
      `s3://${PROD_BUCKET}`,
      '/data',
      '--delete',
      '--only-show-errors',
    ],
    {
      env: {
        AWS_ACCESS_KEY_ID: prod.S3_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: prod.S3_SECRET_ACCESS_KEY,
      },
    },
  )
  // volume -> local MinIO (path-style, via host.docker.internal). Override the
  // entrypoint so we can set path-style addressing before syncing.
  docker(
    [
      'run',
      '--rm',
      '--add-host',
      'host.docker.internal:host-gateway',
      '-e',
      'AWS_ACCESS_KEY_ID',
      '-e',
      'AWS_SECRET_ACCESS_KEY',
      '-v',
      `${vol}:/data`,
      '--entrypoint',
      'sh',
      'amazon/aws-cli',
      '-c',
      `aws configure set default.s3.addressing_style path && ` +
        `aws --endpoint-url ${toDockerHost(LOCAL_ENDPOINT)} --region ${LOCAL_REGION} ` +
        `s3 sync /data s3://${LOCAL_BUCKET} --delete --only-show-errors`,
    ],
    { env: { AWS_ACCESS_KEY_ID: LOCAL_KEY, AWS_SECRET_ACCESS_KEY: LOCAL_SECRET } },
  )
} finally {
  docker(['volume', 'rm', vol], { quiet: true })
}

// --- 2. database: prod -> local ----------------------------------------------
// Reset the local schema, then load prod. One postgres:18 container connects to
// prod ($SRC, over TLS) and pipes into local ($DST, via host.docker.internal).
console.log('>> resetting local schema and restoring prod dump...')
const sql =
  'set -e; ' +
  'psql "$DST" -v ON_ERROR_STOP=1 -q -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"; ' +
  'pg_dump --no-owner --no-privileges "$SRC" | psql "$DST" -v ON_ERROR_STOP=1 -q; ' +
  // Keep prod contact-form PII (names, emails, phones) off the laptop. CASCADE
  // covers the child value table (form_submissions_submission_data).
  'psql "$DST" -v ON_ERROR_STOP=1 -q -c "TRUNCATE public.form_submissions CASCADE"'
docker(
  [
    'run',
    '--rm',
    '--add-host',
    'host.docker.internal:host-gateway',
    '-e',
    'SRC',
    '-e',
    'DST',
    'postgres:18',
    'sh',
    '-lc',
    sql,
  ],
  { env: { SRC: withssl(PROD_DB), DST: toDockerHost(LOCAL_DB) } },
)

// --- 3. re-seed the default local admin (so a refresh never locks you out) ----
// The prod dump replaced the users table, so any local-only admin is gone and the
// restored prod accounts carry their PROD passwords (which you may not have on the
// laptop). Re-create a known local admin via ensure-admin (Payload Local API, so
// the password is hashed correctly; idempotent — matches by email, resets the
// password). Defaults to the dev test login; override with LOCAL_ADMIN_EMAIL /
// LOCAL_ADMIN_PASSWORD. Best-effort: a failure here warns but doesn't fail the
// refresh (the prod accounts still work if you know their passwords).
const ADMIN_EMAIL = process.env.LOCAL_ADMIN_EMAIL || 'dev@payloadcms.com'
const ADMIN_PASSWORD = process.env.LOCAL_ADMIN_PASSWORD || 'test'
console.log(`>> re-seeding local admin (${ADMIN_EMAIL})...`)
const admin = spawnSync('npm', ['run', 'ensure:admin'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ADMIN_EMAIL, ADMIN_PASSWORD },
})
if (admin.status !== 0) {
  console.warn(
    `!! could not auto-seed the local admin. Set it yourself with:\n` +
      `   ADMIN_EMAIL=${ADMIN_EMAIL} ADMIN_PASSWORD=${ADMIN_PASSWORD} npm run ensure:admin`,
  )
}

// --- 4. rebuild the search index ---------------------------------------------
// The restore loaded prod's search index verbatim (built by prod's code). Re-run
// this code's indexing over every published doc so local search matches what
// `npm run dev` serves. In-process, same DB as .env — best-effort, warns only.
console.log('>> rebuilding search index...')
const reindex = spawnSync('npm', ['run', 'reindex:search'], { stdio: 'inherit', shell: true })
if (reindex.status !== 0) {
  console.warn('!! could not rebuild the search index. Run it yourself: npm run reindex:search')
}

console.log('\nOK. Local now mirrors prod as of now.')
console.log("   Run 'npm run dev' — the site serves prod content with media resolving.")
console.log(`   Log into local admin as ${ADMIN_EMAIL} (re-seeded above), or with a prod account.`)
