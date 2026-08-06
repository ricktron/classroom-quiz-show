# CQS Phase 3 — Design-System Readiness

## 1. Status and authority

| Field | Value |
| --- | --- |
| Document ID | `CQS-PHASE-3-DESIGN-SYSTEM-READINESS` |
| Authorization | `AUTHORIZE-CQS-PHASE3-S17-DESIGN-SYSTEM-READINESS-1` |
| Evidence-state ID | `CQS-PHASE3-S17-DESIGN-SYSTEM-READINESS-ES-1` |
| Lane | `CQS-PHASE3-S17-READINESS` |
| Exact delivery base | `70a8c51a1d9545e8d417f4437a8d268a78a6782d` |
| Date (America/Chicago) | 2026-08-05 |
| Classification | Documentation/specification only |

This document is the canonical **Phase 3 design-system readiness contract** that
had to precede Slice 17 implementation. It is authorized under Amendment 003's
requirement for a documentation/specification-only Phase 3 readiness lane before
Slice 17 ([`../decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md`](../decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md);
[`MVP-ARC.md`](MVP-ARC.md)).

**Phase 3 design-system readiness is satisfied when this specification is on
`main`.**

**At issuance, Slice 17 remained `Planned`, unstarted, and unauthorized** pending
its own separate owner authorization. This document granted **no implementation
authority** of any kind at issuance: no CSS, TypeScript, TSX, tests, fixtures,
assets, package, lockfile, workflow, deployment, or configuration mutation; no
theme registry in application source; no game-schema, public-wire,
synchronization, persistence, or summary change.

Proposed-tree completion semantics at readiness delivery: mutable routing
surfaces in that delivery described the state that holds **after** the readiness
content lands on `main`. They did not refer to an open delivery pull request.

### Post-merge implementation outcome (Slice 17)

The readiness dependency was **satisfied first** (this specification on `main`
at implementation base `6b908d577a588a68f06775a6511e1da3aacc33f3`) and then
**consumed** by completed Slice 17 delivery via PR
[#44](https://github.com/ricktron/classroom-quiz-show/pull/44) (reviewed head
`3214185ac750be8a9ab1ad170ff3c9d1c7f9f5a4`; squash
`dee2f3c219f9e60113a374ce0ec876ae20c40bc1`). The implemented result matched the
binding architecture in this contract and preserved every stated boundary
(public wire **8**, sync **2**, game-file schema **1**, GameDefinition model
**1**, private active-session wire **1**, IndexedDB **2**, Session Summary
**1**, completed-summary **1**, competitive profile **1**; no ADR; no Slice 18;
no Slice 22 qualification; no WCAG or physical-projector certification).

Evidence:

- [`../receipts/2026-08-05-slice-17-theme-tokens-local-verification.md`](../receipts/2026-08-05-slice-17-theme-tokens-local-verification.md)
- [`../receipts/2026-08-05-slice-17-post-merge-reconciliation.md`](../receipts/2026-08-05-slice-17-post-merge-reconciliation.md)

Historical base-inspection observations below remain observations of the
authorized readiness base at issuance and are **not** rewritten as post-Slice-17
repository truth.

## 2. Evidence and current repository truth

Fresh read-only inspection of the authorized base
`70a8c51a1d9545e8d417f4437a8d268a78a6782d` established the following. File
inspection is not exhaustive visual acceptance.

### Styling topology

- One global token sheet: `src/styles/global.css`, imported by the app shell.
- Surface-specific CSS beside host and display components (`src/host/*.css`,
  `src/display/*.css`, `src/routes/HostRoute.css`, `src/routes/DisplayRoute.css`).
- No SCSS/Sass/Less/CSS-modules toolchain; plain CSS only.
- Styling is predominantly class-based; inline styles are rare and non-theme
  (for example whitespace in the error boundary).

### Existing root custom properties

`:root` already defines a small token foundation:

- surfaces: `--color-bg`, `--color-surface`, `--color-surface-raised`,
  `--color-border`, `--color-text`, `--color-text-muted`;
- accents: `--color-accent`, `--color-accent-strong`, `--color-host-accent`,
  `--color-danger`, `--color-success`;
- team accents: eight `--color-team-*` variables mapped by application classes;
- typography: `--font-sans` / `--font-display` (system-font stack);
- scale: `--space-1`…`--space-4`, `--radius`, `--focus-ring`.

There is **no** controlled theme registry, **no** `data-theme` / theme-id
application path, and **no** complete high-contrast theme.

### Hardcoded-value categories observed

Component CSS still contains many local literals outside the root tokens:

- hex and `rgba(...)` colours (host banner wash, selected-tile tints, badges);
- gradients on the display shell;
- component-local spacing, font sizes (`clamp(...)`), border widths, and radii;
- shadows/glow and luminous edges on projector surfaces;
- motion keyframes and transitions (response-timer urgency pulse, Final urgency
  pulse, button transitions).

### Host / projector sharing

Host and projector share the global `:root` variables and team-accent classes.
They retain separate component styling and composition. There is no
projector-only token system and no second host theme authority today.

### Motion and reduced-motion

- Global `@media (prefers-reduced-motion: reduce)` collapses animation and
  transition durations.
- Response-timer and Final-wager displays add local reduced-motion overrides that
  disable urgency pulses.
- Scoreboard deliberately has no motion.
- Semantic parity under reduced motion is **not** comprehensively proven by
  dedicated tests; existing handling is structural CSS, not a verified
  theme-contract suite.

### Viewport projects

`playwright.config.ts` already defines `desktop-1080p` (1920×1080) and
`projector-720p` (1280×720), plus a mobile-host project. Slice 17 should reuse
the existing 1080p and 720p projects.

### Team / name / score support

- Logical team range **1–8**; authored order is authoritative; scoreboard does
  not auto-sort.
- Team names wrap; maximum authored length is **40** characters.
- Negative scores use the numeric minus from JavaScript stringification plus a
  danger colour class; accessible names say “minus N points”. High-contrast
  obligations below require that explicit minus signs and non-colour cues remain
  durable under theme migration.
- Current score layout is a **functional flex-wrap** presentation
  (`TeamScoreboard.css`), **not** the accepted Score Column / Strip / Deck
  system (Slice 18 / Phase 2B).

### Schema, wire, and storage boundaries

Observed and preserved:

| Contract | Version |
| --- | --- |
| Canonical game-file `schemaVersion` | **1** |
| `GameDefinition` model | **1** |
| Public-state wire | **8** |
| Sync envelope | **2** |
| Private active-session wire | **1** |
| IndexedDB schema | **2** |
| Session Summary contract | **1** |
| Completed-summary envelope | **1** |
| Competitive profile | **1** |

No theme field exists in `GameDefinition`, canonical schema 1, public wire 8,
sync, persistence, or summary contracts. Unknown top-level `theme` on import
fails closed as an unknown field.

### Imported-content isolation

Team accents are a **fixed imported-content allowlist** of eight name tokens
(`crimson`…`slate`). They are **not** theme identifiers. Import rejects raw
colours, gradients, CSS, class names, and URLs. Application code alone maps a
validated accent name to a CSS class.

### Package and font posture

No styling framework, CSS-in-JS package, or theme library is present or required.
The system-font strategy already satisfies typography for Slice 17; no bundled
or remote font is required.

### Evidence limitations

This readiness lane inspected repository files, docs, and Git state. It does
**not** claim physical-projector acceptance, WCAG certification, classroom
viewing-distance proof, Raspberry Pi support, or exhaustive visual QA of every
surface under every theme.

## 3. Scope, purpose and non-goals

### Purpose

Define the durable, reviewable contract that Slice 17 must implement: semantic
tokens, a closed theme registry (`default` / `high-contrast`), session-local
selection rules, reduced-motion parity obligations, responsive/stress fixtures,
and clear handoffs to Slices 18 and 22 — without starting implementation.

### Non-goals (this readiness lane)

- Slice 17 runtime implementation;
- creating tokens or themes in application source;
- game-schema, public-wire, sync, persistence, or summary changes;
- Slice 18 audience-display composition;
- physical projector, accessibility, or Raspberry Pi certification;
- repair of the inherited Final mid-refresh recovery flake;
- resolution of `CQS-OD-066`;
- post-MVP activation;
- merge authority for this delivery;
- ADR creation (none warranted under observed state);
- edits to [`../PROJECT.md`](../PROJECT.md).

## 4. Repository-truth matrix

| Area | Current implementation truth | Accepted future direction | Readiness gap | Slice owner |
| --- | --- | --- | --- | --- |
| Colour tokens | Small `:root` palette; many component literals | Application-wide semantic colours for default + high-contrast | Incomplete semantic set; dual-theme values absent | 17 |
| Typography | System-font stack; ad hoc sizes/`clamp` | Semantic typography roles; keep system fonts | Roles not named as a contract | 17 (roles); 18 (composition scale) |
| Spacing | Four `--space-*` steps; many local values | Representative spacing scale via tokens | Partial migration only | 17 |
| Borders / radii | One `--radius`; local widths/radii | Semantic border/radius tokens where needed for themes | Incomplete | 17 |
| Shadows / glow | Component-local luminous edges | Controlled shadow/glow tokens; reduce in high-contrast | No theme-controlled treatment | 17 |
| Motion | Local keyframes + button transitions | Motion as optional presentation only | No registry-level motion tokens | 17 |
| Reduced motion | Global + local CSS media queries | Proven semantic parity with motion off | Tests do not prove full parity | 17 |
| High contrast | Absent as a theme | Complete `high-contrast` semantic theme | Entire theme missing | 17 |
| Theme registry | Absent | Typed closed registry: `default`, `high-contrast` | Entire registry missing | 17 |
| Host / projector sharing | Shared `:root`; separate CSS | Shared semantic meanings; surface-specific CSS OK | Need one app-wide theme authority | 17 |
| Viewport support | Playwright 1920×1080 and 1280×720 | Reuse those projects for theme fixtures | Theme fixtures not yet defined | 17 |
| Team-count responsiveness | Flex-wrap scoreboard 1–8 | Theme-safe at 1/4/5/6/7/8; Column/Strip/Deck later | Stress fixtures for themes | 17 (fixtures); 18 (composition) |
| Long names | Wrap at 40-char max | Remain legible under both themes | Theme fixture coverage | 17 |
| Negative scores | Danger colour + numeric sign; spoken “minus” | Explicit minus + non-colour cues in both themes | High-contrast durability unproven | 17 |
| Imported-content isolation | Accents allowlisted; styles rejected | Themes never from imports; accents stay separate | Contract must stay explicit | 17 |
| Schema boundary | Game file / model version **1**; no theme field | No theme field on `GameDefinition` / schema 1 | Preserve | 17 (must not change) |
| Public-wire boundary | Wire **8**; accent is a name token | No theme field on public wire | Preserve | 17 (must not change) |
| Storage boundary | IndexedDB **2**; no theme persistence required | Session-local only for Slice 17 | Preserve | 17 (must not change) |
| Presentation authority | Host private; display sanitized | Theme is presentation config only | Infrastructure absent | 17 |
| Slice 18 handoff | Phase 2B direction accepted; not implemented | Board-first composition consumes tokens | Composition out of scope | 18 |
| Slice 22 qualification | Unstarted | Physical/a11y/release qualification | Out of scope | 22 |

## 5. Conflict and ambiguity register

| Finding | Classification | Disposition |
| --- | --- | --- |
| Application-wide semantic tokens shared by host and projector | Resolved repository fact / fixed readiness decision | One semantic contract; surface-specific CSS remains permitted |
| Hybrid typed registry + CSS custom properties | Fixed readiness decision | Required Slice 17 architecture; no framework/CSS-in-JS/remote theme service |
| Closed IDs `default` and `high-contrast` only | Fixed readiness decision | Unknown IDs fail closed to `default` |
| Session-local theme selection; no persistence required | Fixed readiness decision | App-shell state / launch config only; optional OS contrast hint |
| No theme on schema / wire / sync / storage / events | Resolved repository fact + fixed decision | Preserve all current versions |
| Team accents ≠ theme IDs | Resolved repository fact | Separate allowlist namespace |
| System fonts only | Fixed readiness decision | No bundled/remote font or package |
| Migration covers colour/contrast/focus/motion coherence; not full layout | Fixed readiness decision | Layout debt may defer to Slice 18 |
| Score Column / Strip / Deck absent | Deferred Slice 18 concern | Current flex-wrap remains until Slice 18 |
| Nexus Core, Signal Rails, living-board, Final choreography | Deferred Slice 18 concern | Out of Slice 17 |
| Physical projector / a11y / Pi certification | Deferred Slice 22 concern | Out of readiness and Slice 17 |
| Reduced-motion semantic parity unproven | Under-specification → Slice 17 obligation | Spec requires parity tests |
| Literal token values (exact hex) | Routine technical choice | Implementation may choose literals within constraints |
| Incidental file names for registry modules | Routine technical choice | Not dictated here |
| Whether OS contrast preference auto-selects or only hints | Implementation choice within optional-hint rule | Must remain allowlisted and fail-closed |
| Inherited Final mid-refresh flake | Resolved repository fact (unresolved defect) | Remains unresolved; not this lane |
| `CQS-OD-066` | Resolved repository fact (unresolved) | Remains unresolved; not this lane |
| ADR warranted? | Resolved repository fact | **No** — this readiness spec is sufficient |

**No material owner decision was required.** Fresh evidence did not contradict the
fixed readiness decisions in the authorizing packet.

## 6. Design-token ownership and isolation

1. **Application ownership.** All design tokens and themes are owned by
   application code. Imported game files cannot supply, register, replace, or
   define tokens, CSS, selectors, arbitrary class names, URLs, or animation
   definitions.
2. **Deterministic fallback.** Unknown or missing theme identifiers resolve to
   `default`. Invalid imported accent names continue to fail closed at import /
   sanitize boundaries (existing behaviour).
3. **No game-authority side effects.** Theme selection must not affect commands,
   events, reducer outcomes, replay, scores, timers, buzz queue, Final wager
   logic, sanitization, persistence, summaries, or exports.
4. **Team accent namespace.** The eight accent name tokens remain a separate
   fixed imported-content allowlist. They are never theme IDs and never become a
   plugin surface for arbitrary style values.
5. **Presentation is never authoritative.** Projector state remains sanitized and
   read-only. Theme is presentation configuration for an application window.

## 7. Semantic token taxonomy

Future Slice 17 semantic categories (meanings, not private game fields):

| Category | Role |
| --- | --- |
| Shell / background | Page/shell backdrop |
| Base surface | Primary panels |
| Elevated surface | Raised panels / cards |
| Board / tile surface | Board and tile faces |
| Foreground | Primary text/icon colour |
| Muted foreground | Secondary text |
| Structural border | Separators and outlines |
| Focus | Focus-ring treatment |
| General accent | Non-host structural emphasis |
| Active-team state | Currently responding / highlighted team |
| Waiting state | Eligible but not active |
| Success / correct | Positive adjudication presentation |
| Warning | Caution (including host amber caution where applicable) |
| Danger / incorrect | Negative adjudication / errors |
| Neutral used / dormant | Used or inactive tiles without implying ownership |
| Completed / cleared | Cleared category or completed presentation |
| Winner-safe result | Winner presentation that survives colour loss |
| Tie-safe result | Tie presentation that survives colour loss |
| Team accents | Mapped from the fixed accent allowlist |
| Spacing scale | Representative spacing steps |
| Typography roles | e.g. display, title, body, label, score |
| Line heights | Role-associated line heights |
| Radii | Controlled corner radii |
| Border widths | Structural widths |
| Controlled shadows / glow | Optional luminous edges |
| Motion durations | Timed presentation only |
| Easing | Presentation easing |
| Opacity | Disabled / overlay affordances |
| Focus-ring treatment | Visible keyboard focus |
| Minimum readable / interactive sizing | Where applicable (e.g. touch targets) |

Do **not** assign private game semantics (answers, wagers, eligibility, queue
order, notes) to appearance tokens. Exact literal values remain implementation
choices except where this contract states a durable constraint (system fonts;
closed theme IDs; fail-closed unknown themes; no import-supplied styles).

## 8. Controlled theme registry and selection

### Architecture

Slice 17 must use a **hybrid** approach:

- a **typed TypeScript registry** for valid theme identifiers, completeness
  validation, and deterministic resolution;
- **CSS custom properties** for application styling.

Do **not** add a styling framework, CSS-in-JS package, remote theme service,
runtime plugin loader, or other dependency for theming.

### Closed registry

Initial identifiers (exactly):

```text
default
high-contrast
```

- Identifiers are application-owned strings.
- Unknown identifiers **fail closed to `default`**.
- Imported files cannot supply or register themes.
- Completeness: every semantic token required by the taxonomy that Slice 17
  migrates must be defined for **both** themes before a theme is considered
  complete.

### Selection

Theme selection is **presentation configuration for an application window**.

A future implementation may:

- hold one validated theme ID in application-shell state;
- expose a bounded session-local selector;
- carry the validated ID as application-owned launch configuration when the host
  opens the projector window;
- use an operating-system contrast preference as an **optional selection hint**.

It must **not**:

- add a `GameDefinition` field;
- add a canonical game-file field;
- add a public-wire, sync, event, command, or reducer value;
- add an IndexedDB or summary field;
- use imported content as a theme source;
- accept an arbitrary URL or free-form string without allowlist validation.

**No persistence is required for Slice 17.** Host and display windows may resolve
presentation independently without affecting game truth.

Incidental module/file names are left to the implementation lane.

## 9. Default theme obligations

The `default` theme must preserve the existing product character:

- dark navy/black shell;
- cyan/blue structural emphasis on the projector;
- luminous but restrained edges;
- board-first hierarchy as a presentation intent (without implementing Slice 18
  composition);
- strong projector legibility at supported viewports;
- no proprietary game-show imitation;
- no decorative effect carrying essential meaning.

Host amber caution may remain the host-private accent cue. This section does not
fully specify Slice 18 composition.

## 10. High-contrast obligations

`high-contrast` is a **complete semantic theme**, not a partial override.

It must provide:

- stronger foreground/surface distinction;
- structural boundaries that survive colour loss;
- visible focus;
- explicit textual states for armed/paused/expired/active/waiting/correct/
  incorrect/unavailable as applicable to current surfaces;
- explicit minus signs for negative scores;
- available versus neutral-used distinction;
- active versus waiting distinction;
- winner-safe and tie-safe result states where those results are shown;
- legibility at **1280×720**;
- no colour-only identity;
- reduced or removed decorative glow where glow harms contrast.

This document does **not** claim WCAG conformance, accessibility certification,
or physical-projector acceptance.

## 11. Motion and reduced-motion parity

1. Motion is optional presentation.
2. No animation callback may enter game authority (commands, events, timers’
   durable facts, or reducer logic).
3. Every state remains immediate and understandable with motion disabled.
4. Reduced motion preserves text, structure, ordering, and results.
5. Continuous animation is unnecessary during quiet cognition.
6. Existing urgency pulses remain supplemental to textual state.
7. Tests must prove **semantic parity**, not merely the presence of a
   `prefers-reduced-motion` media query.

## 12. Responsive and stress fixtures

Slice 17 automated fixtures must cover:

### Viewports

```text
1920×1080
1280×720
```

Reuse Playwright’s existing `desktop-1080p` and `projector-720p` projects.

### Team counts

```text
1
4
5
6
7
8
```

### Content stress cases

```text
40-character team names
negative scores with explicit minus signs
large positive scores
large negative scores
ties
authored-order mismatch with score order
duplicate team accents
unknown theme identifier
default theme
high-contrast theme
normal motion
reduced motion
```

### Required automated assertions

- no essential off-screen content;
- no horizontal page overflow;
- no automatic score sorting;
- authored order stability;
- textual and structural cues for essential state;
- valid theme application;
- deterministic fallback for unknown theme IDs;
- no private fields or unsupported semantics on the projector;
- no game-engine behaviour change from theme selection.

Do **not** require new physical-device evidence. Do **not** require pixel-perfect
screenshot baselines unless a later implementation lane independently justifies
them.

## 13. Slice 17 implementation boundary

Slice 17 owns:

- semantic tokens;
- controlled registry;
- `default` theme;
- `high-contrast` theme;
- theme application infrastructure;
- reduced-motion foundation and parity proofs;
- session-local selection (and optional OS contrast hint);
- representative fixtures listed above;
- automated tests listed in §16;
- minimum coherent migration of colour, contrast, focus, and motion values
  across current host and projector surfaces;
- representative typography, spacing, border, radius, and shadow migration
  needed to prove the contract.

Slice 17 must **not** absorb full board-first composition, Nexus Core, Score
Column / Strip / Deck, Signal Rails, living-board memory composition, Final
choreography, or a full layout redesign. Layout-specific hardcoded values that
do not prevent theme correctness may be deferred to Slice 18 or recorded as
bounded styling debt in the Slice 17 delivery.

## 14. Slice 18 handoff

Slice 18 owns:

- complete board-first audience composition;
- Nexus Core;
- Score Column;
- Score Strip;
- Score Deck;
- compact, expanded, and Final Signal Rails;
- quiet-cognition composition;
- loud-consequence choreography;
- living-board memory composition;
- Final settlement composition;
- complete display-state matrix;
- any separately authorized public-state work.

Slice 18 consumes the Slice 17 token/theme foundation; it does not redefine
theme ownership or import-supplied styles.

## 15. Slice 22 handoff

Slice 22 owns:

- physical-projector verification;
- viewing-distance testing;
- washout and grayscale checks;
- final accessibility audit;
- classroom release qualification.

No certification claim is created by this readiness document or by Slice 17.

## 16. Verification architecture

A later Slice 17 implementation must prove, with automated tests appropriate to
the change:

- registry completeness for `default` and `high-contrast`;
- unknown-identifier fallback to `default`;
- imported-content isolation (no theme/CSS/URL/animation from imports);
- no game-file schema change;
- no public-wire change;
- no persistence/summary change;
- no command/event/reducer/history changes caused by theme selection;
- default and high-contrast completeness against the migrated semantic set;
- reduced-motion semantic parity;
- viewport and team fixture coverage;
- long-name and score-width handling;
- authored-order stability;
- no colour-only essential meaning on covered surfaces;
- compatibility with the current Vite, React, TypeScript, and Playwright setup;
- **no new dependency** required for the theme system.

## 17. Implementation handoff contract

When separately authorized, a Slice 17 Orchestrator may treat the following as
closed foundational choices:

1. Hybrid typed registry + CSS custom properties.
2. Exact initial IDs: `default`, `high-contrast`.
3. Fail-closed unknown → `default`.
4. Session-local selection; optional OS contrast hint; no required persistence.
5. No schema / wire / sync / storage / event theme field.
6. Team accents remain a separate allowlist.
7. System fonts only.
8. Migrate for theme coherence; defer Phase 2B layout to Slice 18.
9. Reuse existing Playwright 1080p and 720p projects.
10. Prove semantic reduced-motion parity and stress fixtures in §12.

This handoff does **not** authorize implementation.

## 18. Program routing and explicit non-claims

- **Readiness is complete when this specification is on `main`.**
- **At issuance, Slice 17 remained planned and unauthorized.**
- After readiness merge, the next safe action was a **separately authorized
  Slice 17 implementation lane**; that lane has since completed via PR #44
  (see the post-merge implementation outcome above).
- No registration or reconciliation lane should be required merely to state that
  this readiness content landed.
- The inherited Final mid-refresh recovery flake remains unresolved.
- `CQS-OD-066` remains unresolved.
- No physical, accessibility, WCAG, deployment, or Raspberry Pi certification
  exists (and Slice 17 did not create any).
- No post-MVP arc is activated.
- No ADR was warranted; none was created.
- ADR-016 remains Accepted; public wire **8**, sync **2**, game-file schema
  **1**, private active-session wire **1**, IndexedDB **2**, Session Summary
  **1**, completed-summary **1**, and competitive profile **1** remain the
  current boundaries (unchanged by Slice 17).
- After Slice 17 completion: Slices 1–17 are `Complete`; Slices 18–22 remain
  `Planned` and unauthorized for implementation. Slice 18 remains separately
  unauthorized. Slice 22 qualification remains unperformed.
