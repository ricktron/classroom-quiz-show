# Media normalized-prompt re-read repair receipt

- **Authorization ID:** `AUTHORIZE-CQS-MEDIA-NORMALIZED-PROMPT-REREAD-REPAIR-1`
- **Evidence-state ID:** `CQS-MEDIA-NORMALIZED-PROMPT-REREAD-REPAIR-ES-1`
- **Parent evidence:** `CQS-S14-ES-1` (implementation), `CQS-S14-REVIEW-ES-1` (review)
- **Date:** 2026-08-03
- **Repository:** `ricktron/classroom-quiz-show`
- **Pull request:** [#32](https://github.com/ricktron/classroom-quiz-show/pull/32)
- **Authorized base:** `4de1454181ed58bdb282accd136129c3c0eb0f2b`
- **Authorized starting head:** `cf00d737852c606dba9fbcca94d3efeaa7c62235`
- **Branch:** `claude/cqs-slice-14-final-wager`
- **Receipt type:** bounded prerequisite repair of an inherited defect

This repair was performed on the Slice 14 branch and pull request because the
inherited defect blocked Slice 14 browser-acceptance scenario 24. **It is not a
Slice 14 design change.** The defect was found during the Slice 14 review and was
inherited from the authorized base — that history is preserved, not erased.

## Preflight observed

| Check | Observed |
| --- | --- |
| Branch | `claude/cqs-slice-14-final-wager` |
| Local head | `cf00d737852c606dba9fbcca94d3efeaa7c62235` |
| Remote head | identical |
| `origin/main` | `4de1454181ed58bdb282accd136129c3c0eb0f2b` |
| Merge base | `4de1454181ed58bdb282accd136129c3c0eb0f2b` (no rebase) |
| PR #32 | open, non-draft, base `main`, `mergeable_state: clean` |
| Working tree | clean |
| Overlapping writer / newer commit | none; one worktree |

## Root cause

`src/game/media/definition.ts`.

The authored schema marks an image prompt's `caption` and `attribution`
**optional**. `normalizeImagePrompt` turns an omitted annotation into an explicit
`null` — the documented normalized form. `readTrustedPrompt`, which the sanitizer
uses to re-read an **already-trusted** prompt, routes back through that same
`normalizeImagePrompt`. Its guards were:

```ts
if (value.caption !== undefined && typeof value.caption !== 'string') return null
if (value.attribution !== undefined && typeof value.attribution !== 'string') return null
```

`null` is not `undefined` and is not a string, so both halves matched and the
function returned `null`. **Normalization rejected its own output** — it was not
idempotent.

The consequence was not a missing caption. `toPublic…State` returns `null` for
any stage whose prompt cannot be read, `roundAvailability` becomes `unavailable`,
and **no round DTO is published at all**.

## Pre-repair reproduction

A focused harness over all four legal combinations, run before any mutation.
**Three of four failed** — only "both present" survived:

| Authored optional fields | Normalized | `readTrustedPrompt` |
| --- | --- | --- |
| caption absent, attribution absent | `caption: null, attribution: null` | **`null` — FAIL** |
| caption present, attribution absent | `caption: "C", attribution: null` | **`null` — FAIL** |
| caption absent, attribution present | `caption: null, attribution: "T"` | **`null` — FAIL** |
| caption present, attribution present | `caption: "C", attribution: "T"` | re-read OK |

The review report had recorded two of these three; the attribution-only case is
recorded here for the first time.

- **Category-board impact:** a tile's image prompt is unreadable for those three
  combinations, so the prompt and answer stages of that tile project nothing.
- **Final-wager impact:** every Final stage carries the prompt, so the **entire
  Final round** projects nothing from the moment the question opens until the game
  ends — no question, no answer, no team reveal, no wager, no outcome, no image
  fallback. The host panel is unaffected, so a teacher gets no warning.

## The repair

One production file, two guard conditions, plus a named helper:

```ts
function isOptionalAnnotation(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string'
}
…
if (!isOptionalAnnotation(value.caption)) return null
if (!isOptionalAnnotation(value.attribution)) return null
```

**Why it is minimal.** It widens the accepted *absence* (adding `null`, the
module's own normalized form) and nothing else. The canonical output is
unchanged — `typeof value.caption === 'string' ? value.caption : null` already
mapped both absences to `null`, so a normalized prompt is byte-identical to
before. Source kind, path grammar, alt-text and exact-key validation are
untouched. Text prompts are untouched. No schema change, no wire change, no
version change, no dependency change, no new media capability.

**Invalid input is still rejected.** A number, boolean, object, array or function
in either annotation still fails closed, and a `null` `alt`, a remote source kind,
an illegal path and a blank alt are all still refused — proven by tests.

## Regression tests

`src/game/media/media.test.ts` — **39 → 49 tests**

- all four caption/attribution combinations: the authored form is schema-valid,
  normalization succeeds, `readTrustedPrompt` accepts the normalized value, the
  re-read equals the normalized value, and normalization is idempotent;
- optional annotations that are neither string nor absent still fail closed
  (number, boolean, object, array, function — via both entry points);
- the other guards are proven untouched, including that a `null` **alt** is still
  refused — `null` is permitted for annotations only;
- **category-board**: a board built with each of the four combinations retains a
  re-readable trusted image prompt.

`src/game/finalWager/finalWager.test.ts` — **84 → 88 tests**

- for each of the four combinations: the Final config is schema-valid, the trusted
  definition builds, `readTrustedPrompt` re-reads its prompt, and the same holds
  through `readFinalWagerDefinition`, the fail-closed reader the planner uses.

`tests/e2e/final-wager.spec.ts` — **5 → 8 scenarios**

- **the previously-failing combination, both annotations absent, end to end**: the
  Final prompt is published when the response window opens; the projector receives
  the image DTO; a failed image load renders the authored-alt fallback with no
  invented caption or attribution; the round stays available through response,
  answer reveal, team reveal and settlement; and no private content is exposed;
- the same annotation-free Final renders the real `<img>` when the image loads;
- a category-board image tile with neither annotation still projects.

**No test was weakened, deleted, skipped, quarantined or rewritten.**

## Browser acceptance

Re-run against the production build, host and projector simultaneously.

| Scenario | Result |
| --- | --- |
| **24 — Final prompt image failure / fallback** (schema-valid Final, both annotations absent, forced load failure) | **PASS** — round available, `mcd-image-fallback` with the authored alt, no invented content |
| Category-board regression, image tile with neither annotation | **PASS** — real image renders, private answer not exposed |
| Privacy under the repair | **PASS** — no wager, unrevealed response, correctness, host note, alternate, authored identifier, timer id or event history in the projector DOM |

**Scenario 24 was the last unmet Slice 14 acceptance requirement. All 24 required
browser-acceptance scenarios now pass.** The other 23 were not re-run; the repair
touches only image-prompt annotation handling, and every one of them uses a text
prompt.

## Versions — all unchanged

| Surface | Value |
| --- | ---: |
| Public-state wire | 8 |
| Sync envelope | 2 |
| Canonical game-file schema | 1 |
| `GameDefinition` model | 1 |
| Private persistence wire | 1 |
| IndexedDB schema | 1 |
| Dependencies / lockfile / workflows | **unchanged** |

## Status

**The Slice 14 blocker is repaired. Slice 14 remains `In review`** — it is not
`Complete` and it is not merged. No merge, auto-merge, post-merge reconciliation,
branch cleanup or Slice 15 work was performed.
