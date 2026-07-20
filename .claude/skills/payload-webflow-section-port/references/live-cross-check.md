# Live-site cross-check

Every ported section gets checked against its counterpart on the live site. This catches drift the markup export alone won't show — the export is a *static snapshot*, and rendering decisions (overlay alpha, photo shape, which affordances sit on a card, whether a list is grouped or filtered) are easiest to see on the running site.

## The source-vs-reference rule

- **`migration/_extracted/` (the gitignored export) is the port source of truth.** Translate *its* structure and bound fields.
- **The live site `https://mapsnational.webflow.io/` is reference only.** It shows intended rendering and interactions, but it is **not** an override — when it differs from the catalog or the export, that is **drift to surface as a consistency note**, never a silent change.
- A full page-level audit is a **separate later pass**. Here, check the one section you ported.

## Method

Two complementary reads:

1. **Structure / content / interactions — `WebFetch`.** Fetch the live page for the section and ask a focused question: card contents and photo shape, column count, whether members/items are **grouped into labelled sections** or switched via a **filter/tab**, what a click does (modal vs in-place expand vs navigation), and what the detail view contains. `WebFetch`'s rendered guess can be wrong on subtle markup (it once reported "expandable block" where the export clearly had a modal with overlay + close) — so **let the export markup win on structure**, and use `WebFetch` for content and the broad-strokes layout.

2. **Visual fidelity — Preview screenshot or browser.** Render the ported block (`/design-system/blocks/block.<slug>` or its real page) and compare overlay/scrim, spacing rhythm, photo shape, and contrast against the live page. Use the Preview tools (`preview_screenshot`, `preview_snapshot`, `preview_inspect`) or a browser. Check **both** themes (`data-theme`).

Cross-reference the two against the **catalog entry** — the catalog is the de-duplicated intent; the live site is one rendering of it. Where catalog intent and live rendering disagree (e.g. catalog says "filter", live stacks sections), name the tension explicitly in the notes and let the human choose.

## Worked illustration — the Team grid

Pulling the source markup plus a live `WebFetch` surfaced four real divergences the schema-only view missed:

- the live site **stacks labelled `<h2>` category sections** (Board of Directors, State Committee Presidents, …) rather than offering filter tabs;
- **square** headshots, not circles;
- LinkedIn + email icons **and** a "Read Bio" button **on the card**;
- members in multiple categories **appear in each section** (vs once under an "All" tab).

The export markup confirmed a real **modal** (`team-modal_component` + overlay + close), correcting `WebFetch`'s "in-place expand" guess. None of these were auto-applied — each became a HITL consistency note with a recommendation (see [design-gates.md](design-gates.md#consistency-notes) for that exact list). That is the cross-check working as intended: the port stays faithful to the export, the live site informs the recommendations, and the human decides.

## Practical notes

- Close any open modal/overlay before a Preview screenshot — a `fixed inset-0` overlay (or a degraded dev server stuck on a schema-push prompt) can hang the screenshot tool. If a screenshot hangs, check `[role=dialog]` and `location.href`, and the dev logs for a drizzle prompt.
- `WebFetch` caches per-URL for ~15 min and upgrades HTTP→HTTPS; cross-host redirects come back for you to re-fetch.
