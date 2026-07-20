import type { Payload } from 'payload'

import { readCsv } from './csv'
import { readEnvelope } from './envelope'
import { importsByName } from './registry'
import { resolveTransform } from './transforms'
import type { CollectionImport, RunOptions, RunReport, TransformContext } from './types'

/** Expand `dependsOn` into a topologically ordered list of import names, deduped. */
const resolveOrder = (
  name: string,
  seen: Set<string> = new Set(),
  stack: Set<string> = new Set(),
): string[] => {
  if (seen.has(name)) return []
  const imp = importsByName[name]
  if (!imp)
    throw new Error(`Unknown import "${name}". Known: ${Object.keys(importsByName).join(', ')}`)
  if (stack.has(name)) throw new Error(`Circular dependsOn at "${name}"`)
  stack.add(name)
  const order: string[] = []
  for (const dep of imp.dependsOn || []) order.push(...resolveOrder(dep, seen, stack))
  stack.delete(name)
  seen.add(name)
  order.push(name)
  return order
}

/** Import one collection from its CSV. */
const runOne = async (
  name: string,
  imp: CollectionImport,
  payload: Payload,
  options: RunOptions,
): Promise<RunReport> => {
  const report: RunReport = {
    collection: imp.collection,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  }
  const cache = new Map<string, unknown>()
  const upsertKey = imp.upsertKey || 'legacyItemId'

  const collectionConfig = payload.collections[imp.collection]?.config
  const supportsDrafts = Boolean(
    collectionConfig?.versions && typeof collectionConfig.versions === 'object'
      ? collectionConfig.versions.drafts
      : false,
  )

  const allRows = readCsv(imp.csv)
  const rows = options.limit ? allRows.slice(0, options.limit) : allRows

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const csvLine = i + 2 // 1-based, +1 for the header row
    const ctx: TransformContext = {
      payload,
      row,
      rowIndex: i,
      options,
      cache,
      addWarning: (message) => report.warnings.push({ row: csvLine, message }),
    }

    try {
      const env = readEnvelope(row)
      const doc: Record<string, unknown> = {}
      if (env.legacyItemId) doc.legacyItemId = env.legacyItemId
      if (supportsDrafts) doc._status = env.status

      let skip = false
      for (const fm of imp.fields) {
        const raw = fm.column ? row[fm.column] : undefined
        const value = await resolveTransform(fm.transform, fm.options)(raw, ctx)
        if (value === undefined || value === null || value === '') {
          if (fm.required) {
            report.errors.push({ row: csvLine, message: `required field "${fm.field}" is empty` })
            skip = true
            break
          }
          continue
        }
        doc[fm.field] = value
        if (options.verbose) console.log(`  row ${csvLine}  ${fm.field} =`, summarize(value))
      }
      if (skip) {
        report.skipped++
        continue
      }

      const finalDoc = imp.finalize ? imp.finalize(doc, row) : doc
      const keyValue = finalDoc[upsertKey]

      let existingId: string | number | undefined
      if (keyValue != null && keyValue !== '') {
        const found = await payload.find({
          collection: imp.collection,
          where: { [upsertKey]: { equals: keyValue } },
          limit: 1,
          depth: 0,
          overrideAccess: true,
        })
        existingId = found.docs[0]?.id
      }

      if (options.dryRun) {
        if (existingId != null) report.updated++
        else report.created++
        continue
      }

      // Collections like Posts/Pages run an afterChange revalidate hook that
      // calls Next's revalidatePath — which throws outside a request context
      // (we're a standalone CLI). The hooks honour context.disableRevalidate.
      const context = { disableRevalidate: true }
      if (existingId != null) {
         
        await payload.update({
          collection: imp.collection,
          id: existingId,
          data: finalDoc as any,
          overrideAccess: true,
          context,
        })
        report.updated++
      } else {
         
        await payload.create({
          collection: imp.collection,
          data: finalDoc as any,
          overrideAccess: true,
          context,
        })
        report.created++
      }
    } catch (err) {
      report.errors.push({ row: csvLine, message: (err as Error).message })
    }
  }

  return report
}

/** A one-line preview of a transformed value for `--verbose`. */
const summarize = (value: unknown): unknown => {
  if (value && typeof value === 'object') {
    if ('root' in (value as Record<string, unknown>)) return '[richText]'
    if (Array.isArray(value)) return `[${value.length} ref(s)]`
  }
  return value
}

/**
 * Import `name` and everything it depends on, in dependency order, against a
 * live Payload instance. Returns one report per collection imported.
 */
export const runImport = async (
  name: string,
  options: RunOptions,
  payload: Payload,
): Promise<RunReport[]> => {
  const order = resolveOrder(name)
  const reports: RunReport[] = []
  for (const step of order) {
    console.log(`\n→ importing "${step}"${options.dryRun ? ' (dry run)' : ''}…`)
    reports.push(await runOne(step, importsByName[step], payload, options))
  }
  return reports
}
