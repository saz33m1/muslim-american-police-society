// Regenerates public/og.webp (1200×630 social share cover).
// Header-inspired: navy brand surface + the white full lockup + a gold accent
// rule. Rasterized from the committed logo SVG so it re-derives if the mark or
// brand navy changes — rerun `node scripts/make-og.mjs` after either.
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const W = 1200
const H = 630
const NAVY = '#162245'
const GOLD = '#c9a227'

// White lockup, sized to a comfortable share-card width.
const logoW = 860
const logoBuf = await sharp(readFileSync(join(root, 'public/logo-primary-dark.svg')))
  .resize({ width: logoW })
  .png()
  .toBuffer()
const logoH = (await sharp(logoBuf).metadata()).height

// Gold accent rule below the lockup (brand secondary).
const ruleW = 120
const ruleH = 5
const gap = 44
const ruleBuf = await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ruleW}" height="${ruleH}"><rect width="${ruleW}" height="${ruleH}" rx="2.5" fill="${GOLD}"/></svg>`,
  ),
)
  .png()
  .toBuffer()

// Vertically center the logo + rule block.
const blockH = logoH + gap + ruleH
const top = Math.round((H - blockH) / 2)

await sharp({ create: { width: W, height: H, channels: 4, background: NAVY } })
  .composite([
    { input: logoBuf, top, left: Math.round((W - logoW) / 2) },
    { input: ruleBuf, top: top + logoH + gap, left: Math.round((W - ruleW) / 2) },
  ])
  .webp({ quality: 90 })
  .toFile(join(root, 'public/og.webp'))

console.log(`og.webp written ${W}x${H} (logo ${logoW}x${logoH})`)
