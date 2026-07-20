import { readFileSync } from 'node:fs'
import path from 'node:path'

import { parse } from 'csv-parse/sync'

import type { CsvRow } from './types'

/**
 * Read a Webflow CSV export into row objects keyed by column header. Uses a real
 * RFC-4180 parser (not line-splitting) because the exports embed quoted,
 * multi-line HTML in the bio/content columns. BOM is stripped; cell whitespace
 * is preserved (individual transforms trim what they need — HTML keeps its own).
 */
export const readCsv = (repoRelOrAbsPath: string): CsvRow[] => {
  const abs = path.isAbsolute(repoRelOrAbsPath)
    ? repoRelOrAbsPath
    : path.resolve(process.cwd(), repoRelOrAbsPath)

  return parse(readFileSync(abs), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: false,
  }) as CsvRow[]
}
