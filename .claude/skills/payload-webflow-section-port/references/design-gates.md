# Design gates & consistency notes

The port path reproduces an existing design inside a **locked** brand system. The gates below check that the port conforms — to the catalog, to the brand tokens, and to WCAG — and produce a short list of drift for a human to accept. They are **advisory and HITL**: surface recommendations, never auto-apply, never silently port a one-off variation.

## The three `design:` skills

Run these on the **rendered** output (the showroom variant or the real page), then fold their findings into the consistency notes. They are plugin skills; if the plugin is absent, **degrade gracefully** — note that the gate was skipped and fall back to a manual check against this file.

| Skill | Lens | What it catches for a port |
|---|---|---|
| `design:design-critique` | usability / hierarchy / consistency | the ported section competing with nav, weak reading order, an affordance the source had that the port dropped |
| `design:design-system` | token + variant conformance | hardcoded colours/spacing that should be tokens; near-duplicate variants that should collapse into **one** block with a `variant` field |
| `design:accessibility-review` | WCAG | contrast failures; the repo mandates **AAA** text pairs — white hero text over media, body text on surfaces |

Invoke a skill with the Skill tool (e.g. `design:design-system`) against the running Preview URL or a screenshot. `frontend-design` is **not** a gate here — it is generative/greenfield and does not apply to the port path.

## The brand-token rule (what `design:design-system` enforces)

All colour / spacing / type comes from `src/app/(frontend)/tokens.css` via the shadcn/Tailwind theme. Never inline a Webflow hex/px — map it to the nearest token:

- Base brand **navy `#0d1e6c`** and **maroon `#8b0a03`** are fixed; derive tints, never change them.
- A source scrim like `#050c2b66` → the brand-navy ramp at tuned alpha, **not** the literal hex (see the HighImpact overlay tracer).
- Theme is driven by `data-theme` on `<html>`, not Tailwind's `dark:` class; verify both themes.

## The AAA rule (what `design:accessibility-review` gates)

Every text pair in the theme is built to meet **WCAG AAA**. A port must preserve that — most often when adding an overlay/scrim under white text. Tune alpha until white-on-scrim passes AAA, and confirm block body text on its surface passes too. Treat an AAA failure as a blocking consistency note, not advisory.

## Consistency notes {#consistency-notes}

Always end a port with a short **Consistency notes** list. Each item names the drift and the recommended conformance — phrased as a recommendation to a human, because spacing/colour/structure differences are decisions the user owns, not ones the skill makes.

Use this shape:

```markdown
## Consistency notes
- **<aspect>** — source/catalog does X; the port does Y. Recommend: <conform how>. (HITL)
- **Accessibility** — <pass/fail of the AAA pairs; any contrast issue>.
```

**Example (from the Team grid port):**

```markdown
## Consistency notes
- **Grouping** — the live site stacks labelled category sections (Board of Directors, …);
  the port uses filter tabs. The catalog asks for a "category/state filter", so tabs are
  defensible — flag the divergence and offer a grouped-sections layout option. (HITL)
- **Photo shape** — source uses square headshots; the port uses circles. Recommend square
  (or a shape prop). (HITL)
- **Card affordances** — source shows LinkedIn + email icons and a "Read Bio" button on the
  card; the port makes the whole card the trigger. Recommend adding the visible affordances. (HITL)
- **Accessibility** — modal and cards pass the AAA pairs in both themes; no contrast issues.
```

A clean port still emits the list — with the matching items marked as conforming — so the human sees the gate ran, not just its failures.
