import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { convertHTMLToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import { JSDOM } from 'jsdom'
import type { CollectionSlug } from 'payload'

import type { Transform, TransformContext, TransformFactory } from './types'

const str = (raw: string | undefined): string => (raw ?? '').trim()

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
}

/** Extension off a URL, ignoring any query string. Defaults to jpg. */
const extFromUrl = (url: string): string => {
  const clean = url.split('?')[0].split('#')[0]
  const ext = clean.split('.').pop()?.toLowerCase() || ''
  return MIME[ext] ? ext : 'jpg'
}

/** Build (once per run) the Lexical editor config used to convert HTML. Cached on ctx. */
const getEditorConfig = async (ctx: TransformContext): Promise<unknown> => {
  const key = '__editorConfig'
  if (!ctx.cache.has(key)) {
    ctx.cache.set(key, await editorConfigFactory.default({ config: ctx.payload.config }))
  }
  return ctx.cache.get(key)
}

/** Strip Webflow's empty `id=""` attributes and whitespace-only sentinel paragraphs. */
const cleanWebflowHtml = (raw: string): string =>
  raw
    .replace(/\s+id=""/g, '')
    .replace(/<p[^>]*>(?:\s|&nbsp;|‍|​| )*<\/p>/gi, '')
    .trim()

/**
 * The named transform library. A field mapping references one of these by key
 * (e.g. `transform: 'multiRef'`) and passes `options`. Every transform turns a
 * raw CSV cell into a Payload-ready value, returning `undefined` for "no value"
 * so the runner can drop or flag it.
 */
export const transforms: Record<string, TransformFactory> = {
  /** Text/email/url straight across; empty → undefined. */
  passthrough: () => (raw) => str(raw) || undefined,

  /** Use the slug column if present, else slugify another column's value. */
  slug:
    (options) =>
    (raw, ctx) => {
      const v = str(raw)
      if (v) return v
      const from = options?.from as string | undefined
      const src = from ? str(ctx.row[from]) : ''
      return src ? slugify(src) : undefined
    },

  /** Numeric cell → number; empty → undefined. */
  number: () => (raw) => {
    const v = str(raw)
    if (!v) return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  },

  /** 'true'/'false' → boolean. */
  bool: () => (raw) => {
    const v = str(raw).toLowerCase()
    if (!v) return undefined
    return v === 'true'
  },

  /** Webflow's `Date.toString()` format → ISO string; empty → undefined. */
  date: () => (raw) => {
    const v = str(raw)
    if (!v) return undefined
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
  },

  /**
   * `; `-separated reference list → resolved relationship IDs. Each token is
   * looked up in the target collection (by slug by default) and cached. An
   * unresolved token is a warning, not a failure — the good references still
   * import.
   */
  multiRef: (options) => {
    const relationTo = options?.relationTo as CollectionSlug
    const by = (options?.by as string) || 'slug'
    const sep = (options?.sep as string) || ';'
    return async (raw, ctx) => {
      const tokens = str(raw)
        .split(sep)
        .map((t) => t.trim())
        .filter(Boolean)
      if (!tokens.length) return undefined
      const ids: (string | number)[] = []
      for (const token of tokens) {
        const cacheKey = `ref:${relationTo}:${by}:${token}`
        if (!ctx.cache.has(cacheKey)) {
          const res = await ctx.payload.find({
            collection: relationTo,
            where: { [by]: { equals: token } },
            limit: 1,
            depth: 0,
            overrideAccess: true,
          })
          ctx.cache.set(cacheKey, res.docs[0]?.id ?? null)
        }
        const id = ctx.cache.get(cacheKey) as string | number | null
        if (id == null) ctx.addWarning(`unresolved ${relationTo} reference "${token}"`)
        else ids.push(id)
      }
      return ids.length ? ids : undefined
    }
  },

  /**
   * Single external image URL → a Media upload, returning its id. The original
   * is downloaded into a tracked `public/` dir (so it survives a clean checkout,
   * independent of the storage backend) and re-hosted into Payload Media. Dedupes
   * by URL; skips the download if the file is already on disk. In a dry run the
   * file is fetched but no Media doc is created.
   */
  externalImage: (options) => {
    const publicDir = (options?.publicDir as string) || 'public/import/misc'
    return async (raw, ctx) => {
      const url = str(raw)
      if (!url) return undefined
      const cacheKey = `img:${url}`
      if (ctx.cache.has(cacheKey)) return ctx.cache.get(cacheKey) ?? undefined

      // The row slug names the file (readable, stable). A gallery has many
      // images per row, so mediaGallery passes a per-image `nameSuffix`
      // (e.g. "-2") to keep each one distinct — without it they'd all collide
      // on "{slug}.{ext}" and dedupe down to a single Media.
      const suffix = (options?.nameSuffix as string) || ''
      const baseName = (str(ctx.row['Slug']) || `row-${ctx.rowIndex + 1}`) + suffix
      const ext = extFromUrl(url)
      const filename = `${baseName}.${ext}`
      const absDir = path.resolve(process.cwd(), publicDir)
      const absFile = path.join(absDir, filename)

      let buffer: Buffer
      if (existsSync(absFile)) {
        buffer = await readFile(absFile)
      } else if (!ctx.options.download) {
        ctx.addWarning(`image not downloaded (--no-download) and missing on disk: ${filename}`)
        return undefined
      } else {
        try {
          const res = await fetch(url)
          if (!res.ok) {
            ctx.addWarning(`image ${url} → HTTP ${res.status}`)
            return undefined
          }
          buffer = Buffer.from(await res.arrayBuffer())
          await mkdir(absDir, { recursive: true })
          await writeFile(absFile, buffer)
        } catch (err) {
          ctx.addWarning(`image ${url} download failed: ${(err as Error).message}`)
          return undefined
        }
      }

      if (ctx.options.dryRun) return undefined

      // Reuse an existing Media with this filename so re-runs don't pile up
      // duplicate uploads — filenames are derived from the (unique) row slug.
      const existing = await ctx.payload.find({
        collection: 'media',
        where: { filename: { equals: filename } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
      })
      let id = existing.docs[0]?.id
      if (id == null) {
        const alt = (options?.alt as string) || str(ctx.row['Name']) || baseName
        const media = await ctx.payload.create({
          collection: 'media',
          data: { alt },
          file: { name: filename, data: buffer, mimetype: MIME[ext] || 'image/jpeg', size: buffer.length },
          overrideAccess: true,
        })
        id = media.id
      }
      ctx.cache.set(cacheKey, id)
      return id
    }
  },

  /**
   * `; `-separated image URLs → ordered Media ids. Each image is re-hosted via
   * externalImage with a `-N` filename suffix so the row's photos don't collide
   * with each other (or the hero) on a single `{slug}` filename.
   */
  mediaGallery: (options) => {
    const sep = (options?.sep as string) || ';'
    return async (raw, ctx) => {
      const urls = str(raw)
        .split(sep)
        .map((u) => u.trim())
        .filter(Boolean)
      if (!urls.length) return undefined
      const ids: unknown[] = []
      for (let i = 0; i < urls.length; i++) {
        const single = transforms.externalImage({ ...options, nameSuffix: `-${i + 1}` })
        const id = await single(urls[i], ctx)
        if (id != null) ids.push(id)
      }
      return ids.length ? ids : undefined
    }
  },

  /** A video URL (YouTube etc.) stored as-is — never fetched. */
  videoEmbed: () => (raw, ctx) => {
    const v = str(raw)
    if (!v) return undefined
    if (!/^https?:\/\//i.test(v)) {
      ctx.addWarning(`video value is not a URL: "${v}"`)
      return undefined
    }
    return v
  },

  /** Webflow HTML → Lexical richText, via the destination field's own editor. */
  html: () => async (raw, ctx) => {
    const cleaned = cleanWebflowHtml(raw || '')
    if (!cleaned) return undefined
    const editorConfig = (await getEditorConfig(ctx)) as Parameters<
      typeof convertHTMLToLexical
    >[0]['editorConfig']
    return convertHTMLToLexical({ editorConfig, html: cleaned, JSDOM })
  },
}

/** Resolve a field mapping's transform (named key, inline fn, or default passthrough). */
export const resolveTransform = (
  transform: string | Transform | undefined,
  options: Record<string, unknown> | undefined,
): Transform => {
  if (typeof transform === 'function') return transform
  if (typeof transform === 'string') {
    const factory = transforms[transform]
    if (!factory) throw new Error(`Unknown transform "${transform}"`)
    return factory(options)
  }
  return transforms.passthrough(options)
}
