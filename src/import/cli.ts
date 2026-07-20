import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

import { runImport } from './run'
import type { RunOptions } from './types'

/**
 * CLI entry, run via `npm run import -- <mapping> [flags]` (which dispatches to
 * `payload run`). `payload run` consumes `--`-flags itself and forwards only
 * positional words, so flags here are bare words: `dry-run`, `verbose`,
 * `strict`, `no-download`, and `limit=N`.
 *
 *   npm run import -- team-categories
 *   npm run import -- team dry-run
 *   npm run import -- team limit=5 verbose
 */
const main = async (): Promise<void> => {
  const argv = process.argv.slice(2)
  const name = argv[0]
  if (!name) {
    console.error('Usage: npm run import -- <mapping> [dry-run] [verbose] [strict] [no-download] [limit=N]')
    process.exitCode = 1
    return
  }

  const words = new Set(argv.slice(1).filter((a) => !a.includes('=')))
  const limitArg = argv.slice(1).find((a) => a.startsWith('limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : undefined

  const options: RunOptions = {
    dryRun: words.has('dry-run') || words.has('dry'),
    verbose: words.has('verbose'),
    strict: words.has('strict'),
    download: !words.has('no-download'),
    ...(limit && Number.isFinite(limit) ? { limit } : {}),
  }

  const payload = await getPayload({ config })
  try {
    const reports = await runImport(name, options, payload)

    let failed = false
    for (const r of reports) {
      console.log(
        `\n${r.collection}: created ${r.created}, updated ${r.updated}, skipped ${r.skipped}, ` +
          `errors ${r.errors.length}, warnings ${r.warnings.length}`,
      )
      for (const w of r.warnings) console.warn(`  warn  (csv line ${w.row}) ${w.message}`)
      for (const e of r.errors) console.error(`  ERROR (csv line ${e.row}) ${e.message}`)
      if (r.errors.length) failed = true
      if (options.strict && r.warnings.length) failed = true
    }
    process.exitCode = failed ? 1 : 0
  } finally {
    await payload.destroy()
  }
}

// Payload keeps handles open (DB pool, watchers) even after destroy(), so a
// standalone script won't exit on its own — force it once the work is done.
await main()
process.exit(process.exitCode ?? 0)
