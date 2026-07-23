# SPEC — /contact page with form (Resend delivery)

## 1. Objective

Replace the placeholder `/contact` page with a real contact page — a short intro
hero plus a working contact form that emails submissions via **Resend** — based
on the source site's contact page (`https://mudduserhm1.sg-host.com/contact/`).

- **Slug:** `contact` (exists as a `simplePage` placeholder; rebuilt in place).
- **Framing:** national **Muslim American Police Society** (MAPS).
- **Reuse, don't build:** the form-builder plugin, the `forms` collection, the
  `FormBlock`, **and the Resend email adapter** are all already wired. Only the
  contact page + the Contact form doc (with its notification email) are new.

## 2. Email is already wired (Resend)

`src/payload.config.ts` already configures `@payloadcms/email-resend`, gated on
`RESEND_API_KEY`:

- Key **unset** (local/CI, and now until the user provides it) → Payload's
  console "email writer"; submissions still persist to `form-submissions`, they
  just aren't delivered.
- Key **set** → Resend delivers each form's `emails`. Sender defaults to
  `EMAIL_FROM_NAME <EMAIL_FROM_ADDRESS>` (env, falling back to the `brand.ts`
  constants: `Muslim American Police Society <no-reply@muslimamericanpolicesociety.org>`).

So "use Resend" needs **no adapter code** — it needs the Contact form to carry an
`emails` entry so there is something to deliver once the key is added. The user
will provide `RESEND_API_KEY` (and verify the sending domain) later; nothing here
blocks on it.

## 3. Page composition

Rebuild `contactSlice` (currently a bare `simplePage`) as:

1. **LowImpact hero** (no media)
   - eyebrow: `Get in touch`
   - h1: `Contact Us`
   - lede: "We'd love to hear from you. Send us a message and we'll be in touch."

2. **FormBlock** (`blockType: 'formBlock'`)
   - `form`: the seeded Contact form's id (§4).
   - `enableIntro: false` (hero carries the heading).

Form-only (contact email / social already live in the footer).

## 4. The Contact form (`forms` collection)

Seed idempotently from `scripts/seed-pages.ts` (the `FormBlock.form` relationship
needs a `forms` id before the page can reference it).

**Fields** (form-builder field blocks, `width` 100):

| name      | blockType  | Label     | Required |
| --------- | ---------- | --------- | -------- |
| `name`    | `text`     | Full Name | ✅       |
| `email`   | `email`    | Email     | ✅       |
| `phone`   | `text`     | Phone     | —        |
| `message` | `textarea` | Message   | ✅       |

- Phone is **text**, not the template's `number` (number strips `+1` / leading zeros).
- `submitButtonLabel: 'Submit'`.
- `confirmationType: 'message'`, `confirmationMessage` (richText h3): "Thanks —
  your message has been received. We'll be in touch soon."
- `title: 'Contact Form'`.

**`emails` (the Resend deliverable)** — one notification to the org inbox:

- `emailTo`: `process.env.CONTACT_INBOX_EMAIL || process.env.ADMIN_EMAIL`
  (baked into the form doc at seed time; ADMIN_EMAIL is already set locally).
- `emailFrom`: `` `${EMAIL_FROM_NAME} <${EMAIL_FROM_ADDRESS}>` `` (env-or-brand
  constants, imported from `@/utilities/brand`).
- `replyTo`: `{{email}}` (so replying in the inbox goes to the submitter).
- `subject`: `New contact form submission from {{name}}`.
- `message` (richText): a line each for name / email / phone / message using the
  `{{field}}` tokens the form-builder substitutes.

(No autoresponder to the submitter — the on-page `confirmationMessage` already
confirms receipt. Add one later if wanted.)

**reCAPTCHA:** `verifyRecaptcha` (beforeValidate) is env-gated — a no-op when the
reCAPTCHA env is unset, so the form submits/stores without a token locally/CI.

## 5. Implementation (scope of changes)

1. **`scripts/seed-pages.ts`**
   - `import { EMAIL_FROM_ADDRESS, EMAIL_FROM_NAME } from '../src/utilities/brand'`
     (SITE_NAME is already imported from there).
   - **`ensureForm(payload, data)` helper** — **upsert by `title`**: find a
     `forms` doc by title; if found `payload.update` it with `data` and return
     its id, else `payload.create` and return the new id. Upsert (not
     create-only) so re-running `seed:pages` after setting `EMAIL_FROM_ADDRESS` /
     `CONTACT_INBOX_EMAIL` re-bakes the new sender/recipient — matches how Pages
     are upserted every run and what `.env.example` instructs.
   - **`contactSlice`** becomes `async (payload) =>`: build `CONTACT_FORM` data
     (§4) with the existing `richText`/`heading`/`paragraph` helpers, resolve
     `const formId = await ensureForm(payload, CONTACT_FORM)`, return the page
     (LowImpact hero + `formBlock` with `form: formId`). Replaces the
     `simplePage('contact', …)`.
   - Update `META_BY_SLUG.contact` from placeholder to a real national-MAPS
     one-liner.
2. **`.env.example`** — document the optional `CONTACT_INBOX_EMAIL` (falls back
   to `ADMIN_EMAIL`) next to the existing Resend block.

No new block/collection/dependency; `forms` + `formBlock` + the Resend adapter
already exist in the committed schema, so `generate:types` is a no-op and the
migration guard stays green. `contactSlice` is already in `PAGE_SLICES`.

## 6. Code style

- Reuse existing lexical + page idioms; model the form-field shape on
  `src/endpoints/seed/contact-form.ts` (same keys) but author fresh for the MAPS
  copy, text phone, required message, and the env-driven `emails`. Don't import
  the template's demo-email object.
- Tokens/`.type-*` only; no styling work.

## 7. Testing strategy

New int spec `tests/int/contact.int.spec.ts` (node env, mirror
`committees.int.spec.ts`). Against the seeded `contact` page:

- exists, `_status === 'published'`, hero type `lowImpact`; layout has a `formBlock`.
- resolve the referenced form; assert `submitButtonLabel === 'Submit'`, exactly
  the four fields with the right `blockType`/`required`, and that it has one
  `emails` entry whose `subject` contains `{{name}}` and whose `emailFrom`
  includes `EMAIL_FROM_ADDRESS` (proves the Resend wiring, without needing a key).

Run: `npx vitest run --config ./vitest.config.mts tests/int/contact.int.spec.ts`.
Then `seed:pages` → full `test:int` → `generate:types` no-op → `build`. Verify in
preview: `/contact` renders hero + form; submitting valid data shows the
confirmation message, creates a `form-submissions` doc, and (key unset) logs the
notification email to the dev-server console.

## 8. Boundaries

**Always:** reuse FormBlock + `forms` + the existing Resend adapter; seed from
code; keep changes to `seed-pages.ts` + `.env.example` + one test; national MAPS
voice; commit / PR text as if written solely by the author (no AI/co-author
trailers); PR base = **`staging`**.

**Ask first:** adding an autoresponder to the submitter; adding a ContactDetails /
social block; changing form fields beyond the four; the actual `RESEND_API_KEY` /
sending-domain setup (user does this in Resend + env, not in code); any new block
or dependency.

**Never:** hardcode hex/px or secrets; commit a real `RESEND_API_KEY`; edit
generated files by hand (`payload-types.ts`, `importMap.js`); route submissions
anywhere but the `forms` / `form-submissions` pipeline; mass-push content over
prod; open the PR against `master`.

---

_Deliberately lazy: Resend, the form-builder stack, and the field shape all
already exist — the only new code is an upsert-form helper, the rebuilt contact
slice with an env-driven notification email, and one `.env.example` line._
