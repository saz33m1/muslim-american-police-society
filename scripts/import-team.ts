import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * One-off import of the NJMOS Executive Board directory into the `team`
 * collection (scraped from /organization-structure/). Idempotent: matches
 * members and the category by name, updating in place, so it is safe to re-run.
 *
 *   node --import tsx/esm scripts/import-team.ts
 *
 * Placeholder headshots (profile-sample1.png) are intentionally skipped — those
 * members import without a photo. Per docs/scripts.md + CLAUDE.md media notes,
 * this awaits payload.destroy() before exit so in-flight S3 uploads flush.
 */
type Member = {
  name: string
  jobTitle: string // Position
  jobTitleSecondary: string // Rank, Department
  photo?: string // real headshot URL, omitted for placeholders
}

const CATEGORY = 'Executive Board'

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const members: Member[] = [
  {
    name: 'Mudduser H. Malik',
    jobTitle: 'President',
    jobTitleSecondary: 'Trooper, New Jersey State Police',
    photo: 'https://mudduserhm1.sg-host.com/wp-content/uploads/2024/04/Mudduser-Malik.png',
  },
  {
    name: 'Fasil A. Khan',
    jobTitle: 'First Vice President',
    jobTitleSecondary: 'Officer, Paterson Police Department (retired)',
    photo: 'https://mudduserhm1.sg-host.com/wp-content/uploads/2024/04/Fasil-Profile-Picture.png',
  },
  {
    name: 'Kellie Muhammad',
    jobTitle: 'Second Vice President',
    jobTitleSecondary: 'Detective, Newark Police Department',
  },
  {
    name: 'Huda Shalabi',
    jobTitle: 'Treasurer',
    jobTitleSecondary: "Sheriff's Officer, Passaic County Sheriff's Department",
    photo: 'https://mudduserhm1.sg-host.com/wp-content/uploads/2024/04/Huda-Shalabi.png',
  },
  {
    name: 'Ayaz Mahmoud',
    jobTitle: 'Secretary',
    jobTitleSecondary: 'Detective Sergeant, Edison Police Department',
  },
  {
    name: 'Ali Huda',
    jobTitle: 'Sergeant At Arms',
    jobTitleSecondary: "Detective, Bergen County Prosecutor's Office",
  },
  {
    name: 'Ahmad Awawdeh',
    jobTitle: 'Trustee',
    jobTitleSecondary: 'Police Officer, Edison Police Department',
    photo: 'https://mudduserhm1.sg-host.com/wp-content/uploads/2024/04/Ahmad-Awawdeh.png',
  },
  {
    name: 'Rafiq Munir',
    jobTitle: 'Trustee',
    jobTitleSecondary: 'Deportation Officer, Immigration & Customs Enforcement',
  },
  {
    name: 'Asad Sheikh',
    jobTitle: 'Trustee',
    jobTitleSecondary: 'Correctional Police Officer, New Jersey Department of Corrections',
  },
  {
    name: 'Ihsan Abdul Rassoul',
    jobTitle: 'Trustee',
    jobTitleSecondary: "Captain, Essex County Sheriff's Department",
    photo:
      'https://mudduserhm1.sg-host.com/wp-content/uploads/2024/04/Ihsan-Rassoul-EssexCounty.png',
  },
  {
    name: 'Syed Shah',
    jobTitle: 'Trustee',
    jobTitleSecondary: 'Police Officer, Atlantic City Police Department',
  },
]

const payload = await getPayload({ config })

try {
  // Find-or-create the category.
  const existingCat = await payload.find({
    collection: 'team-categories',
    where: { title: { equals: CATEGORY } },
    limit: 1,
  })
  const category =
    existingCat.docs[0] ??
    (await payload.create({
      collection: 'team-categories',
      data: { title: CATEGORY, order: 0, slug: slugify(CATEGORY) },
    }))

  for (let i = 0; i < members.length; i++) {
    const m = members[i]

    // Upload the headshot (fresh per member — never share a file/context object).
    let photoId: number | undefined
    if (m.photo) {
      const res = await fetch(m.photo)
      if (!res.ok) throw new Error(`fetch ${m.photo} -> ${res.status}`)
      const buffer = Buffer.from(await res.arrayBuffer())
      const filename = m.photo.split('/').pop()!
      const media = await payload.create({
        collection: 'media',
        data: { alt: `${m.name} headshot` },
        file: { data: buffer, name: filename, mimetype: 'image/png', size: buffer.length },
      })
      photoId = media.id as number
    }

    const data = {
      name: m.name,
      jobTitle: m.jobTitle,
      jobTitleSecondary: m.jobTitleSecondary,
      categories: [category.id],
      order: i + 1,
      slug: slugify(m.name),
      ...(photoId ? { photo: photoId } : {}),
    }

    const existing = await payload.find({
      collection: 'team',
      where: { name: { equals: m.name } },
      limit: 1,
    })
    if (existing.docs[0]) {
      await payload.update({ collection: 'team', id: existing.docs[0].id, data })
      console.log(`import-team: updated ${m.name}`)
    } else {
      await payload.create({ collection: 'team', data })
      console.log(`import-team: created ${m.name}${photoId ? ' (+photo)' : ''}`)
    }
  }
} finally {
  await payload.destroy() // flush in-flight S3 uploads before exit
}
process.exit(0)
