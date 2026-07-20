/**
 * Re-host an explicit list of export images as Media docs (issue #66, Phase 6).
 *
 * Some assembled pages reference content images that live only in the gitignored
 * full Webflow export (or on the live Webflow CDN) and were never picked up by
 * the prose import. This copies/downloads each into the tracked dir and upserts a
 * Media doc (idempotent by filename) so the page slices can resolve them by
 * filename.
 *
 *   npm run rehost:images
 *
 * Two sources:
 *   - IMAGES        — files already in the local export images dir (copied in).
 *   - REMOTE_LOGOS  — partner logos served from the live Webflow CDN (downloaded
 *                     to the tracked dir under the filename the seed expects).
 *
 * Raster only — SVG logos/icons can't go through the WebP Media pipeline, so
 * they're skipped (rasterize to PNG first if one is needed, e.g. paypal.png).
 */

import 'dotenv/config'

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

import configPromise from '@payload-config'
import { getPayload, type Payload } from 'payload'

const ROOT = process.cwd()
const EXPORT_IMAGES = path.join(ROOT, 'migration/mapsnational.webflow/images')
const TRACKED_IMG = path.join(ROOT, 'public/import/prose')

const MIME: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
}

// { file: basename in the export images dir, alt: required Media alt text }
const IMAGES: Array<{ file: string; alt: string }> = [
  // members/new-york-state — feature sections + lightbox gallery
  { file: '6.webp', alt: 'Explore NYC government jobs' },
  { file: '34.webp', alt: 'Apply for MAPS endorsement to vacant NYC government jobs' },
  { file: '43.webp', alt: 'Apply for MAPS endorsement to NYC board and commission roles' },
  { file: '21.webp', alt: 'Professional networking and community building with MAPS New York' },
  { file: '22.webp', alt: 'MAPS New York community' },
  { file: '11.webp', alt: 'MAPS New York event' },
  { file: '1.webp', alt: 'MAPS New York members' },
  { file: '4_3.webp', alt: 'MAPS New York gathering' },
  { file: '8.webp', alt: 'MAPS New York networking' },
  { file: '26.webp', alt: 'MAPS New York community event' },
  { file: '16.webp', alt: 'MAPS New York in the community' },
  // home — HighImpact hero background (#91)
  {
    file: '10-23-0814-1600.webp',
    alt: 'Muslim American public servants at a MAPS National gathering',
  },
  // home — MAPS Programs cards (full-bleed linked image cards)
  { file: '4_1.webp', alt: 'MAPS career support' },
  { file: '5_1.webp', alt: 'MAPS community building' },
  { file: 'policy.webp', alt: 'MAPS policy and advocacy' },
  // partner logos present in the export under their friendly names (about-us/partners, #85)
  { file: 'aafen.webp', alt: 'AAFEN' },
  { file: 'minaret.webp', alt: 'Minaret Foundation' },
  { file: 'uscmo.webp', alt: 'US Council of Muslim Organizations (USCMO)' },
  // donate — payment-method logos + QR codes (#DN1). PayPal logo rasterized from
  // the export's paypal.svg to paypal.png (Media is raster only).
  { file: 'paypal.png', alt: 'PayPal' },
  { file: 'zelle.png', alt: 'Zelle' },
  { file: 'paypal-qr.png', alt: 'PayPal donation QR code' },
  { file: 'zelle-qr.webp', alt: 'Zelle donation QR code' },
]

// Partner logos served from the live Webflow CDN (#P1). `file` is the filename
// the partners seed (scripts/seed-pages.ts LOGO_FILENAMES) expects. The export
// only carried aafen/minaret/uscmo; these backfill the rest. guidance.svg is
// intentionally omitted (SVG can't go through the WebP pipeline).
const CDN = 'https://cdn.prod.website-files.com/673eb098113577e4174b4922'
const REMOTE_LOGOS: Array<{ url: string; file: string; alt: string }> = [
  {
    file: 'hops.webp',
    alt: 'HOPS',
    url: `${CDN}/68ade68708097a8dd7270b04_HOPS-log-final-UPDATED.webp`,
  },
  {
    file: 'mpac.webp',
    alt: 'MPAC',
    url: `${CDN}/68ade6885ad51e253d4a6098_MPAC-Short-BlueBlack2.webp`,
  },
  {
    file: 'isf.webp',
    alt: 'ISF',
    url: `${CDN}/68ade68ae865abf4ebb35152_ISF_LOGO_OFFICIAL%20(7).webp`,
  },
  { file: 'ai.png', alt: 'AI', url: `${CDN}/68ade686c8e19135fcd76b6b_AI_logo-secondary-a.png` },
  {
    file: 'ispu.png',
    alt: 'ISPU',
    url: `${CDN}/68ade688c6e312fc7d475cdf_ISPU%20logo%20full%20color%20copy2.png`,
  },
  {
    file: 'naml.webp',
    alt: 'NAML',
    url: `${CDN}/68ca25e82015b116e7efba18_NAML%20Logo%20PVC%20(1)%20(1).webp`,
  },
  { file: 'cmsa.webp', alt: 'CMSA', url: `${CDN}/68ade6871d197d91efe3283b_CMSA%20Logo.webp` },
  { file: 'amt.webp', alt: 'AMT', url: `${CDN}/68ade6872e34c11e7d9d01b5_AMT%20Small%20Logo.webp` },
  {
    file: 'mlsa.webp',
    alt: 'MLSA',
    url: `${CDN}/68ade687fdd517c8e2c7056b_MLSA%20Logo%20Transparent%20Color%20(1).webp`,
  },
  {
    file: 'ia.webp',
    alt: 'IA',
    url: `${CDN}/68ade97313ab52118ab5b9e3_IA%20Logo-Final%20RGB_updated.webp`,
  },
  {
    file: 'mcn.png',
    alt: 'MCN',
    url: `${CDN}/68ade99dfdd517c8e2c7e2b7_MCN%20NEW%20LOGO_In%20Blue.png`,
  },
  {
    file: 'coalition.png',
    alt: 'BoxY Coalition',
    url: `${CDN}/68ade9b338869487e28d1df9_61a713c0de24af21c0cec7ed2d01e7a6_boxycoalitionlogowhitelarge.png`,
  },
  { file: 'elgl.png', alt: 'ELGL', url: `${CDN}/68ade6878025b84ba448cfc2_elgl-logo-url-green.png` },
  {
    file: 'equally-able.webp',
    alt: 'EquallyAble',
    url: `${CDN}/68ade686c5f674c5709148b0_17-EquallyAble-Logo.webp`,
  },
  { file: 'mwpn.png', alt: 'MWPN', url: `${CDN}/68ade9fa36e5795b0d519701_MWPN%20Logo5.png` },
  {
    file: 'logo-600px.png',
    alt: 'Partner organization',
    url: `${CDN}/68adeae6178baa4e2eeb8eac_logo_600px.png`,
  },
  {
    file: 'amana.jpg',
    alt: 'Amana',
    url: `${CDN}/68adeae697774505c5f2beeb_Amana_Logo-FullText.jpg`,
  },
  {
    file: 'amba.png',
    alt: 'AMBA',
    url: `${CDN}/68ade6894e4ca90c41a29bb3_AMBA_abridged-color3.png`,
  },
  {
    file: 'maemsa.webp',
    alt: 'MAEMSA',
    url: `${CDN}/68ade68a5ad51e253d4a6125_MAEMSA%20Patch%20(Clear%20Background).webp`,
  },
  { file: 'saldef.webp', alt: 'SALDEF', url: `${CDN}/68ade68a832a3a5093b20462_SALDEF%20LOGO.webp` },
  { file: 'hhrd.png', alt: 'HHRD', url: `${CDN}/68adeb47778f52c60db4c012_HHRD%20LOGO.png` },
  {
    file: 'gr.jpg',
    alt: 'Partner organization',
    url: `${CDN}/69f89f19c6b4102cb127dcf2_08a8cb70d101b360e11f5723ceb23be9_GR_LOGO.jpg`,
  },
  { file: 'umma.png', alt: 'UMMA', url: `${CDN}/68adebf9e2e195414c2ba96b_umma2-07.png` },
  {
    file: 'cair.png',
    alt: 'CAIR',
    url: `${CDN}/68adec3ca846a46a9d70ea8d_8751c5c7f1514cb7d2f5e20881ed7bae_CAIRLogo2Color.png`,
  },
  {
    file: 'wcaps.webp',
    alt: 'WCAPS',
    url: `${CDN}/68b76cb50cad2cadb8ad72d8_OFFICIAL%20Horizontal%20WCAPS%20Main%20Logo.webp`,
  },
  {
    file: 'amhp.png',
    alt: 'AMHP',
    url: `${CDN}/68aded903e7e2dcd1b9f90c8_AMHP%20Official%20Logo2.PNG`,
  },
  {
    file: 'muppies.png',
    alt: 'Muppies',
    url: `${CDN}/68ade687f3e06c8e3ba3a968_032d4a07ba3dca701ca3e5409f18961d_Muppies%20Logo.png`,
  },
  {
    file: 'poligon.png',
    alt: 'Poligon',
    url: `${CDN}/68ade68a13ab52118ab4b523_Poligon%20Logo%20(1).png`,
  },
  // Launch-readiness audit follow-up (LR2, issue #102) — 3 partners present on
  // the live grid but missed by the original P1 backfill.
  {
    file: 'sahara.png',
    alt: 'Sahara',
    url: `${CDN}/6a3d2d6e61b346ab29a2aa8d_cropped-Sahara-Logo.png`,
  },
  {
    file: 'de-lune.jpg',
    alt: 'De Lune Corp',
    url: `${CDN}/6a3d2e9e587adab0cd4c81c4_De-Lune-Corp-Logo%20-%20Copy.jpg`,
  },
  { file: 'myna.webp', alt: 'Myna', url: `${CDN}/6a3d3040ba45c599eefd4cd1_MynaLogoGreen.webp` },
]

/** Find-or-create a Media doc from a tracked file. Returns true if created. */
const ensureMedia = async (payload: Payload, file: string, alt: string): Promise<boolean> => {
  const ext = file.split('.').pop()?.toLowerCase() || ''
  if (!MIME[ext]) {
    payload.logger.warn(`rehost: skipping non-raster ${file}`)
    return false
  }
  const tracked = path.join(TRACKED_IMG, file)
  if (!existsSync(tracked)) {
    payload.logger.warn(`rehost: tracked file missing ${tracked}`)
    return false
  }
  // The Media pipeline converts every upload to WebP, so the stored filename is
  // always `<name>.webp`. Check existence by that name (not the source ext) or
  // each run would fail to find the original and create a duplicate.
  const storedName = file.replace(/\.(png|jpe?g|gif|webp)$/i, '.webp')
  const found = await payload.find({
    collection: 'media',
    where: { filename: { equals: storedName } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  if (found.docs[0]) {
    // Refresh alt if a prior run (or import) stored a different/stale value.
    if (found.docs[0].alt !== alt) {
      await payload.update({
        collection: 'media',
        id: found.docs[0].id,
        data: { alt },
        overrideAccess: true,
      })
      payload.logger.info(`rehost: updated alt ${file}`)
    }
    return false
  }

  const buffer = await readFile(tracked)
  await payload.create({
    collection: 'media',
    data: { alt },
    file: { name: file, data: buffer, mimetype: MIME[ext], size: buffer.length },
    overrideAccess: true,
  })
  payload.logger.info(`rehost: created Media ${file}`)
  return true
}

const run = async () => {
  const payload = await getPayload({ config: configPromise })
  await mkdir(TRACKED_IMG, { recursive: true })

  let created = 0
  let skipped = 0

  // Local export files — copy into the tracked dir, then host.
  for (const { file, alt } of IMAGES) {
    const ext = file.split('.').pop()?.toLowerCase() || ''
    if (!MIME[ext]) {
      payload.logger.warn(`rehost: skipping non-raster ${file}`)
      continue
    }
    const source = path.join(EXPORT_IMAGES, file)
    const tracked = path.join(TRACKED_IMG, file)
    if (!existsSync(tracked)) {
      if (!existsSync(source)) {
        payload.logger.warn(`rehost: source missing ${source}`)
        continue
      }
      await copyFile(source, tracked)
    }
    if (await ensureMedia(payload, file, alt)) created++
    else skipped++
  }

  // Remote CDN logos — download into the tracked dir, then host.
  for (const { url, file, alt } of REMOTE_LOGOS) {
    const ext = file.split('.').pop()?.toLowerCase() || ''
    if (!MIME[ext]) {
      payload.logger.warn(`rehost: skipping non-raster ${file}`)
      continue
    }
    const tracked = path.join(TRACKED_IMG, file)
    if (!existsSync(tracked)) {
      try {
        const res = await fetch(url)
        if (!res.ok) {
          payload.logger.warn(`rehost: download failed ${res.status} ${file} (${url})`)
          continue
        }
        await writeFile(tracked, Buffer.from(await res.arrayBuffer()))
      } catch (err) {
        payload.logger.warn(`rehost: download error ${file}: ${(err as Error).message}`)
        continue
      }
    }
    if (await ensureMedia(payload, file, alt)) created++
    else skipped++
  }

  payload.logger.info(`Re-host complete: ${created} created, ${skipped} already present.`)
  process.exit(0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
