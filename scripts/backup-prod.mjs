#!/usr/bin/env node
//
// backup-prod.mjs — pull a point-in-time OFFSITE backup of PROD to local disk.
//
// Read-only against prod (pg_dump + bucket read; never writes to prod). Produces,
// under --out (default ./backups):
//   db/prod-<UTC-stamp>.sql.gz   a gzipped full pg_dump (+ .sha256 sidecar)
//   media/                       a mirror of the prod media bucket (incremental)
//
// Point --out at a synced cloud folder (e.g. Google Drive Desktop) and the files
// land offsite automatically. Schedule it (Task Scheduler / cron) for AC #162.
//
// Connection details are pulled live from Railway by environment NAME, same as
// refresh-staging.mjs — no hand-typed connection strings, no committed creds.
// Shells out to `railway`, `docker`, and dockerized postgres:18 / aws-cli, so no
// local Postgres or aws-cli needed.
//
// Usage:  npm run backup:prod                 (-> ./backups)
//         npm run backup:prod -- --out "D:\path\to\Google Drive\maps-backups"
//
import { execSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SRC_ENV = 'production'
const PROJECT_ID = process.env.RAILWAY_PROJECT_ID ?? 'aea720c6-7841-4e7a-955c-945a5ab210e7' // maps-website (see refresh-staging.mjs)

const argOut = (() => {
  const i = process.argv.indexOf('--out')
  return i > 0 ? process.argv[i + 1] : null
})()
const OUT = resolve(argOut || 'backups')

const die = (msg) => {
  console.error(`!! ${msg}`)
  process.exit(1)
}

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
// Docker bind mounts want forward slashes even on Windows.
const mount = (p) => p.replace(/\\/g, '/')

function sha256(file) {
  return new Promise((ok, no) => {
    const h = createHash('sha256')
    createReadStream(file)
      .on('error', no)
      .on('data', (d) => h.update(d))
      .on('end', () => ok(h.digest('hex')))
  })
}

// --- prereqs -----------------------------------------------------------------
try {
  execSync('docker version', { stdio: 'ignore' })
} catch {
  die('docker is not available. Start Docker Desktop and retry.')
}

// UTC stamp, colon-free so it's a legal filename on every OS.
const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', 'Z')
mkdirSync(`${OUT}/db`, { recursive: true })
mkdirSync(`${OUT}/media`, { recursive: true })

console.log('>> resolving connection details from Railway...')
const prod = railwayVars('web', SRC_ENV)
const prodPg = railwayVars('Postgres', SRC_ENV)

const PROD_DB = prodPg.DATABASE_PUBLIC_URL
const ENDPOINT = prod.S3_ENDPOINT
const REGION = prod.S3_REGION
const PROD_BUCKET = prod.S3_BUCKET

if (!PROD_DB) die('no prod DATABASE_PUBLIC_URL from Railway.')
if (!PROD_BUCKET) die('no prod S3_BUCKET from Railway.')

console.log(`   source (prod): db ${host(PROD_DB)}  bucket ${PROD_BUCKET}`)
console.log(`   out:           ${OUT}`)

// --- 1. database: gzipped full dump to disk ----------------------------------
const dumpName = `prod-${stamp}.sql.gz`
console.log(`>> dumping prod database -> db/${dumpName} ...`)
docker(
  [
    'run',
    '--rm',
    '-e',
    'SRC',
    '-v',
    `${mount(OUT)}/db:/out`,
    'postgres:18',
    'sh',
    '-lc',
    `pg_dump --no-owner --no-privileges "$SRC" | gzip > /out/${dumpName}`,
  ],
  { env: { SRC: withssl(PROD_DB) } },
)
const digest = await sha256(`${OUT}/db/${dumpName}`)
writeFileSync(`${OUT}/db/${dumpName}.sha256`, `${digest}  ${dumpName}\n`)
const mb = (statSync(`${OUT}/db/${dumpName}`).size / 1024 / 1024).toFixed(1)
console.log(`   ${mb} MB  sha256 ${digest.slice(0, 16)}...`)

// --- 2. media: mirror prod bucket to disk (incremental) ----------------------
console.log(`>> syncing media bucket (${PROD_BUCKET}) -> media/ ...`)
docker(
  [
    'run',
    '--rm',
    '-e',
    'AWS_ACCESS_KEY_ID',
    '-e',
    'AWS_SECRET_ACCESS_KEY',
    '-v',
    `${mount(OUT)}/media:/data`,
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
const mediaCount = readdirSync(`${OUT}/media`).length
console.log(`   ${mediaCount} top-level media entries mirrored`)

console.log(`\nOK. Offsite backup written to ${OUT}`)
console.log('   Restore drill: gunzip the .sql.gz into a scratch Postgres, point S3_* at a scratch')
console.log('   bucket seeded from media/, and confirm /api/media/file/* URLs resolve.')
