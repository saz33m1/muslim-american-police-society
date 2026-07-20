#!/usr/bin/env node
//
// refresh-staging.mjs — copy a point-in-time snapshot of PROD down to STAGING.
//
// Content flows ONE WAY: prod -> staging (ADR 0002). This replaces staging's
// database and media bucket with a copy of prod's. It never writes to prod
// (dump + bucket-read only), and a direction lock refuses to run if the target
// ever resolves to prod.
//
// What moves, and why together:
//   1. Postgres  — pg_dump prod, restore into staging. A FULL dump preserves
//      document ids, so page blocks that reference media by id still resolve.
//      (Re-seeding would mint new ids and break the links.)
//   2. Media bucket — mirror prod's objects into staging's bucket, so the media
//      rows restored in step 1 point at files that actually exist.
//
// Written in Node (not bash) on purpose: `npm run` on Windows resolves `bash`
// to WSL, where the npm `railway` shim can't find node and every call dies.
// Node is always present, so this runs the same from cmd, Git Bash, or a Mac.
// It still shells out to the real `railway`, `docker`, and dockerized aws-cli —
// no local Postgres or aws-cli needed. Connection details are pulled live from
// Railway by environment NAME, so there's no hand-typed connection string.
//
// Usage:  npm run refresh:staging            (prompts to confirm)
//         npm run refresh:staging -- --yes   (no prompt, for scripting)
//
import { execSync, spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline'

import { assertRefreshDirection } from './refresh-lock.mjs'

const SRC_ENV = 'production'
const DST_ENV = 'staging'
// Pin the project id so we never depend on the CWD-based `railway link` (that
// match is case-sensitive on the directory path). Override via env for a fork;
// the literal below is the maps-website project.
const PROJECT_ID = process.env.RAILWAY_PROJECT_ID ?? 'aea720c6-7841-4e7a-955c-945a5ab210e7'
const YES = process.argv.includes('--yes') || process.argv.includes('-y')

const die = (msg) => {
  console.error(`!! ${msg}`)
  process.exit(1)
}

// Read all variables for a service+env as a { KEY: value } map. Uses --kv so
// there's nothing to JSON-parse. Runs `railway` through the platform shell
// (cmd on Windows, sh elsewhere), which is where the working railway lives.
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

// Run docker with an args array (no shell), so nested quotes in the SQL never
// get mangled by cmd/sh. Extra env is forwarded to `docker run -e NAME` pass-through.
function docker(args, { env = {}, quiet = false } = {}) {
  const res = spawnSync('docker', args, {
    stdio: quiet ? ['ignore', 'ignore', 'inherit'] : 'inherit',
    env: { ...process.env, ...env },
  })
  if (res.error) die(`could not run docker (${res.error.message}). Is Docker Desktop running?`)
  if (res.status !== 0) die(`docker step failed: docker ${args.join(' ')}`)
}

const host = (url) => (url.match(/@([^/?]+)/) || [, '?'])[1]
const withssl = (url) => (url.includes('?') ? `${url}&sslmode=require` : `${url}?sslmode=require`)

// --- prereqs -----------------------------------------------------------------
try {
  execSync('docker version', { stdio: 'ignore' })
} catch {
  die('docker is not available. Start Docker Desktop and retry.')
}

// --- resolve everything from Railway -----------------------------------------
console.log('>> resolving connection details from Railway...')
const prod = railwayVars('web', SRC_ENV)
const stage = railwayVars('web', DST_ENV)
const prodPg = railwayVars('Postgres', SRC_ENV)
const stagePg = railwayVars('Postgres', DST_ENV)

const PROD_DB = prodPg.DATABASE_PUBLIC_URL
const STAGE_DB = stagePg.DATABASE_PUBLIC_URL
const ENDPOINT = prod.S3_ENDPOINT
const REGION = prod.S3_REGION
const PROD_BUCKET = prod.S3_BUCKET
const STAGE_BUCKET = stage.S3_BUCKET

// --- direction lock (must pass before ANY write) -----------------------------
try {
  assertRefreshDirection({
    dstEnv: DST_ENV,
    prodDb: PROD_DB,
    stageDb: STAGE_DB,
    prodBucket: PROD_BUCKET,
    stageBucket: STAGE_BUCKET,
  })
} catch (e) {
  die(e.message)
}

console.log(`   source (prod):    db ${host(PROD_DB)}  bucket ${PROD_BUCKET}`)
console.log(`   target (staging): db ${host(STAGE_DB)}  bucket ${STAGE_BUCKET}`)

// --- confirm (destructive to staging) ----------------------------------------
if (!YES) {
  console.log('\nThis REPLACES all staging content (DB + media) with a prod snapshot.')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const ans = await new Promise((r) => rl.question("Type 'refresh staging' to continue: ", r))
  rl.close()
  if (ans.trim() !== 'refresh staging') die('aborted.')
}

// --- 1. media: prod bucket -> staging bucket ---------------------------------
// Different creds per bucket, so hop through a throwaway Docker volume (named,
// not a host mount, so it behaves the same on Windows). --delete mirrors exactly.
console.log(`>> syncing media bucket (${PROD_BUCKET} -> ${STAGE_BUCKET})...`)
const vol = `refresh-staging-media-${process.pid}`
docker(['volume', 'create', vol], { quiet: true })
try {
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
      ENDPOINT,
      '--region',
      REGION,
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
      ENDPOINT,
      '--region',
      REGION,
      's3',
      'sync',
      '/data',
      `s3://${STAGE_BUCKET}`,
      '--delete',
      '--only-show-errors',
    ],
    {
      env: {
        AWS_ACCESS_KEY_ID: stage.S3_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: stage.S3_SECRET_ACCESS_KEY,
      },
    },
  )
} finally {
  docker(['volume', 'rm', vol], { quiet: true })
}

// --- 2. database: prod -> staging --------------------------------------------
// Reset staging's schema, then load prod. Runs inside one postgres:18 container
// (matches the server major); URLs go in via env, never argv.
console.log('>> resetting staging schema and restoring prod dump...')
const sql =
  'set -e; ' +
  'psql "$DST" -v ON_ERROR_STOP=1 -q -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"; ' +
  'pg_dump --no-owner --no-privileges "$SRC" | psql "$DST" -v ON_ERROR_STOP=1 -q; ' +
  // If prod's payload_migrations still carries a "dev" row (from a push:true
  // build), the dump brings it to staging and staging's preDeploy `payload
  // migrate` then PROMPTS ("dev mode ... data loss, proceed? y/N"), hanging the
  // non-TTY deploy container. Drop it so migrate no-ops cleanly.
  'psql "$DST" -v ON_ERROR_STOP=1 -q -c "DELETE FROM payload_migrations WHERE name = \'dev\'"; ' +
  // Scrub contact-form PII: the dump carries prod form submissions (names,
  // emails, phones) into staging. CASCADE covers the child value table
  // (form_submissions_submission_data), which holds the actual field values.
  'psql "$DST" -v ON_ERROR_STOP=1 -q -c "TRUNCATE public.form_submissions CASCADE"'
docker(['run', '--rm', '-e', 'SRC', '-e', 'DST', 'postgres:18', 'sh', '-lc', sql], {
  env: { SRC: withssl(PROD_DB), DST: withssl(STAGE_DB) },
})

// --- 3. rebuild the search index (over HTTP, against DEPLOYED staging) --------
// The restore loaded prod's search index verbatim (built by prod's code). Rebuild
// it with STAGING's deployed code — which may index more than prod does — by
// calling the search plugin's reindex endpoint. /api is not behind the staging
// Basic gate (see proxy.ts matcher), so this needs only a Payload admin login:
// your PROD account, which came over in the dump. Best-effort: skipped with a
// hint when STAGING_ADMIN_EMAIL / STAGING_ADMIN_PASSWORD aren't set. Idempotent.
let STAGE_URL = stage.NEXT_PUBLIC_SERVER_URL || ''
if (!/^https?:\/\//.test(STAGE_URL) || STAGE_URL.includes('.railway.internal')) {
  STAGE_URL = 'https://stage.mapsnational.org' // internal host won't resolve off-platform
}
STAGE_URL = STAGE_URL.replace(/\/$/, '')
const S_ADMIN_EMAIL = process.env.STAGING_ADMIN_EMAIL
const S_ADMIN_PASSWORD = process.env.STAGING_ADMIN_PASSWORD

if (!S_ADMIN_EMAIL || !S_ADMIN_PASSWORD) {
  console.log(
    '\n>> skipping search reindex: set STAGING_ADMIN_EMAIL / STAGING_ADMIN_PASSWORD (your prod\n' +
      '   admin login) to auto-rebuild, or click Reindex on the Search collection in staging admin.',
  )
} else {
  console.log('>> rebuilding staging search index...')
  try {
    const login = await fetch(`${STAGE_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: S_ADMIN_EMAIL, password: S_ADMIN_PASSWORD }),
    })
    if (!login.ok) throw new Error(`login ${login.status}`)
    const { token } = await login.json()
    if (!token) throw new Error('no token in login response')
    const res = await fetch(`${STAGE_URL}/api/search/reindex`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
        Cookie: `payload-token=${token}`,
      },
      body: JSON.stringify({ collections: ['posts', 'pages'] }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`reindex ${res.status}: ${body?.message ?? ''}`)
    console.log(`   ${body?.message ?? 'reindexed.'}`)
  } catch (e) {
    console.warn(
      `!! search reindex failed (${e.message}). Click Reindex on the Search collection in\n` +
        `   staging admin (it is idempotent), or retry.`,
    )
  }
}

console.log('\nOK. Staging now mirrors prod as of now.')
console.log('   Log into staging admin with your PROD credentials (users came over in the dump;')
console.log('   password hashes are salt-based, independent of PAYLOAD_SECRET). Sessions stay')
console.log('   isolated because staging signs JWTs with its own secret.')
