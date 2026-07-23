# Plan — `/contact` page with form (Resend delivery)

Spec: `SPEC.md`. Branch: `feat/contact-form` (off `staging`). One task, RED→GREEN→build→commit.

Resend adapter is already wired in `payload.config.ts` (gated on `RESEND_API_KEY`,
console fallback). No adapter work — the form just needs an `emails` entry to
deliver once the key is set.

## Task 1 — Rebuild /contact with a Resend-delivered form ✅ done

**Goal:** replace the placeholder `contactSlice` with a LowImpact hero + a
`FormBlock` bound to a seeded Contact form (Full Name*, Email*, Phone, Message*),
whose notification `emails` entry delivers to `CONTACT_INBOX_EMAIL || ADMIN_EMAIL`
from `EMAIL*FROM\*\*` via the existing Resend adapter.

**Changes**

- `scripts/seed-pages.ts`:
  - import `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` from `../src/utilities/brand`.
  - `ensureForm(payload, data)` — upsert a `forms` doc by `title`; return its id.
  - `CONTACT_FORM` data (4 fields, `submitButtonLabel: 'Submit'`,
    `confirmationMessage`, one env-driven notification `emails` entry).
  - `contactSlice` → `async (payload)`: resolve `formId` via `ensureForm`, return
    LowImpact hero + `formBlock { form: formId }`. Replaces the `simplePage`.
  - update `META_BY_SLUG.contact` to a real one-liner.
- `.env.example`: document optional `CONTACT_INBOX_EMAIL` (falls back to `ADMIN_EMAIL`).

**RED:** `tests/int/contact.int.spec.ts` (node env, mirror `committees.int.spec.ts`):

- `contact` page seeded, `_status === 'published'`, hero `lowImpact`, layout has `formBlock`.
- referenced form: `submitButtonLabel === 'Submit'`; exactly 4 fields with correct
  `blockType`/`required`; one `emails` entry whose `subject` contains `{{name}}`
  and `emailFrom` includes `EMAIL_FROM_ADDRESS`.

**GREEN:** implement the slice + helper so the test passes against the seeded DB.

**Verify:** `seed:pages` → full `test:int` → `generate:types` no-op → `build`.
Preview `/contact`: hero + form render; submitting valid data shows the
confirmation and logs the notification email to the console (key unset).

**Done when:** test green, suite green, build compiles, `/contact` renders the
form and a submission is stored + logged.
