import 'dotenv/config'

import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * Ensure a Payload admin `User` exists, from ADMIN_EMAIL / ADMIN_PASSWORD.
 * Idempotent: matches by email, creates when absent, resets the password when
 * present. Point DATABASE_URL (and S3_* if the config needs them to boot) at
 * any environment to run it there. Creating a user touches no S3, so it is
 * safe against a remote env unlike the media-heavy seed/import CLIs.
 *
 *   ADMIN_EMAIL=you@x.org ADMIN_PASSWORD=... node --import tsx/esm scripts/ensure-admin.ts
 */
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
if (!email || !password) {
  console.error('!! set ADMIN_EMAIL and ADMIN_PASSWORD')
  process.exit(1)
}

const payload = await getPayload({ config })
try {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    limit: 1,
  })
  if (docs[0]) {
    await payload.update({ collection: 'users', id: docs[0].id, data: { password } })
    console.log(`ensure-admin: reset password for ${email}`)
  } else {
    await payload.create({ collection: 'users', data: { email, password, name: 'Admin' } })
    console.log(`ensure-admin: created ${email}`)
  }
} finally {
  await payload.destroy()
}
process.exit(0)
