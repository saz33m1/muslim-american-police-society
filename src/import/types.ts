import type { CollectionSlug, Payload } from 'payload'

/** A parsed CSV row: every cell is a string keyed by its column header. */
export type CsvRow = Record<string, string>

/** Run-time switches set from the CLI. */
export interface RunOptions {
  /** Parse, transform, and download — but write nothing to the database. */
  dryRun: boolean
  /** Per-row field trace. */
  verbose: boolean
  /** Any warning fails the run (exit 1) — for CI. */
  strict: boolean
  /** Download missing images. When false, only already-downloaded files are used. */
  download: boolean
  /** Process only the first N rows. */
  limit?: number
}

/**
 * Shared per-run state handed to every transform. The `cache` lets an N-row
 * import avoid re-querying the same category or re-creating the same image,
 * and `addWarning` records a soft problem (a dangling reference, a missing
 * image) without failing the row.
 */
export interface TransformContext {
  payload: Payload
  row: CsvRow
  /** Zero-based index into the (possibly limited) row list. */
  rowIndex: number
  options: RunOptions
  cache: Map<string, unknown>
  addWarning: (message: string) => void
}

/** A raw CSV cell → a Payload-ready field value. Async for DB/disk transforms. */
export type Transform = (raw: string | undefined, ctx: TransformContext) => unknown | Promise<unknown>

/** Builds a transform from its options, so a mapping can configure it. */
export type TransformFactory = (options?: Record<string, unknown>) => Transform

/** One CSV column → one Payload field, via a named or inline transform. */
export interface FieldMapping {
  /** CSV header to read. Omit for a field produced entirely by `finalize`. */
  column?: string
  /** Payload field to write. */
  field: string
  /** A transform-registry key (e.g. 'slug', 'multiRef') or an inline transform. Default: passthrough. */
  transform?: string | Transform
  /** Options passed to the named transform factory. */
  options?: Record<string, unknown>
  /** If the value is empty after transforming, record an error and skip the row. */
  required?: boolean
}

/**
 * One collection's import: where its CSV is, how its columns map to fields,
 * what it depends on, and the idempotency key. Adding a new collection to the
 * importer means writing one of these — no new parsing or transform code.
 */
export interface CollectionImport {
  /** Target Payload collection. */
  collection: CollectionSlug
  /** Repo-root-relative path to the Webflow CSV (in the gitignored migration/). */
  csv: string
  /** Field used to find-or-create on re-run. Default 'legacyItemId'. */
  upsertKey?: string
  /** Imports (by registry name) that must run first — e.g. categories before members. */
  dependsOn?: string[]
  /** Column → field map. The Webflow envelope (Item ID, Draft/Archived) is handled automatically. */
  fields: FieldMapping[]
  /** Optional last-mile hook on the assembled doc (compose columns, set a discriminator). Pure, no I/O. */
  finalize?: (doc: Record<string, unknown>, row: CsvRow) => Record<string, unknown>
}

/** Outcome of importing one collection. */
export interface RunReport {
  collection: string
  created: number
  updated: number
  skipped: number
  /** Hard failures — the row was not imported. `row` is the 1-based CSV line (incl. header). */
  errors: { row: number; message: string }[]
  /** Soft problems — the row imported, but something was off. */
  warnings: { row: number; message: string }[]
}
