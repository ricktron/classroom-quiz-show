# CQS remaining-MVP rebalance (Amendment 003)

- **Date:** 2026-08-03 (America/Chicago)
- **Authorization id:** `AUTHORIZE-CQS-PLAN-S02-REMAINING-MVP-REBALANCE-1`
  (documentation-only delivery)
- **Repair authorization:** `AUTHORIZE-CQS-PLAN-S02-ORDINARY-SEMANTIC-REPAIR-1`
- **Evidence state id:** `CQS-PLAN-S02-ES-1` (**amended** under the repair
  authorization — same ID; no successor minted)
- **Slice identifier:** `CQS-PLAN-S02-REMAINING-MVP-REBALANCE`
- **Observed base:** `4df76f1dd504f0fdef5b27417edeec90471e6b62`
  (`origin/main`, verified equal before original mutation)
- **Pre-repair PR head:** `9a48b57131d5d001ca16c728f09b3f00e5270be7`
- **Branch:** `docs/cqs-plan-s02-remaining-mvp-rebalance`
- **PR:** [#35](https://github.com/ricktron/classroom-quiz-show/pull/35)
  (non-draft; not merged)
- **Final head:** *recorded in the Bridge Mode repair report after commit*
- **Environment:** local (`Ricks-MacBook-Air.local` / `macdaddy`)

## Disposition

**Accepted owner planning decision — remaining MVP rebalanced from 18 to 22
slices.** Documentation and decision records only. **No product implementation
authorized.**

Ordinary semantic repair at exact PR head
`9a48b57131d5d001ca16c728f09b3f00e5270be7` under
`AUTHORIZE-CQS-PLAN-S02-ORDINARY-SEMANTIC-REPAIR-1` corrected five documentation
defects without redesigning, reordering, adding, removing, merging, or
implementing any slice.

## Evidence-state treatment

`CQS-PLAN-S02-ES-1` is **amended in place** under the repair authorization.

**Rationale:** repository doctrine for ordinary semantic repair of an open
planning delivery prefers amending the existing evidence state rather than
minting a successor ID for convenience. The planning slice identity,
authorization lineage, and PR remain the same; the repair records corrections
to that same evidence state.

## Preflight observed before original mutation

| Condition | Observed |
| --- | --- |
| Repository | `ricktron/classroom-quiz-show` |
| Host / user | `Ricks-MacBook-Air.local` / `macdaddy` |
| Started from clean `main` at `origin/main` | Yes — after fast-forward from behind-by-5 local tip |
| Exact base SHA | `4df76f1dd504f0fdef5b27417edeec90471e6b62` |
| Working tree clean | Yes |
| Slices 1–14 Complete | Yes (Slice 14 via PR #32 at `ce2e103…`) |
| Former Slices 15–18 Planned / unstarted | Yes — no implementation PR or branch |
| Phase 2B registration on `main` | Yes (PR #34 at `4df76f1…`) |
| Open remaining-MVP roadmap-mutation PR | None |
| Existing Amendment 003 | Absent |

## Preflight observed before ordinary semantic repair

| Condition | Observed |
| --- | --- |
| PR #35 open and non-draft | Yes |
| PR #35 not merged | Yes |
| Exact head | `9a48b57131d5d001ca16c728f09b3f00e5270be7` |
| Base `main` | `4df76f1dd504f0fdef5b27417edeec90471e6b62` |
| Branch | `docs/cqs-plan-s02-remaining-mvp-rebalance` |
| Full PR path count | Exactly **13** Markdown paths |
| Working tree clean | Yes |
| Concurrent repair / equivalent roadmap work | None |

## Owner decisions recorded

1. 18-slice MVP → **22-slice** MVP.
2. Slices 1–14 unchanged and Complete.
3. Former Slices 15–18 replaced by Slices 15–22 as named in Amendment 003.
4. Sony Buzz remains a bounded MVP-supported target requiring permanent
   operationalization for one exact profile.
5. Raspberry Pi 5 is post-MVP; not an MVP release gate.
6. Standards/GCS tags removed from MVP completion pending `CQS-OD-066`.
7. Full archives, telemetry, transcripts, question analytics, assessment
   promotion, and individual identity remain post-MVP.
8. Direct LLM integration, question bank, item-family identity, live clue
   swapping, and full editor remain post-MVP.
9. Separate documentation/specification-only Phase 3 display-system readiness
   lane required before Slice 17 implementation.
10. No implementation authority granted by this planning slice.

## Exact changed-path classes (full PR; still 13 paths)

| Path | Change |
| --- | --- |
| `docs/decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md` | **added** (then repaired) |
| `docs/receipts/2026-08-03-cqs-remaining-mvp-rebalance.md` | **added** (this file; amended under repair) |
| `docs/plans/MVP-ARC.md` | updated / repaired |
| `docs/STATUS.md` | updated current routing |
| `docs/handoff/CURRENT.md` | updated current routing |
| `docs/plans/EXPANDED-CQS-VISION-ARC.md` | updated MVP boundary / consumers |
| `docs/plans/CQS-DESIGN-PHASE-2B-DIRECTION.md` | updated consumers to Slices 17–18 |
| `docs/plans/SESSION-ANALYTICS-ASSESSMENT-AND-PARTICIPATION.md` | MVP reporting → 15–16 |
| `docs/plans/LLM-SPREADSHEET-AUTHORING-ARC.md` | MVP authoring → Slice 20 |
| `docs/plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md` | trigger/dependency slice numbers |
| `docs/decisions/README.md` | Amendment 003 indexed |
| `docs/decisions/EXPANDED-VISION-OWNER-DECISIONS.md` | routing note only |
| `README.md` | remaining-slice + physical-certification wording |

No pre-existing receipt was edited. No `src/**`, `tests/**`, `public/**`,
`.github/**`, package/lockfile, schema, fixture, ADR for completed slices, or
owner-decision acceptance state was modified.

## Ordinary semantic repair (exact head)

Repair authorization:
`AUTHORIZE-CQS-PLAN-S02-ORDINARY-SEMANTIC-REPAIR-1`.

Allowed repair paths only:

1. `README.md`
2. `docs/decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md`
3. `docs/plans/MVP-ARC.md`
4. `docs/receipts/2026-08-03-cqs-remaining-mvp-rebalance.md`

Repairs applied:

1. **Sony Buzz physical-certification truth** — README current statements no
   longer claim that no physical Sony Buzz / controller has been tested or that
   physical certification is entirely deferred. Replaced with the bounded
   OADL2-S07 configuration claim and explicit non-claims; Slice 21 remains the
   permanent operationalization gap.
2. **Slice 19 impact** — `game schema no by default · pack format yes`.
3. **Slice 20 impact** — `game schema no by default · workbook/draft format yes
   · storage no by default`.
4. **Slice 21 dependencies** — depends on **9, 10, 13**; mapping persistence
   follows Slice 13 host-private persistence/coordination discipline; no second
   import pipeline, unrelated persistence authority, public mapping state, or
   projector persistence protocol; exact storage design belongs to the Slice 21
   ADR.
5. **Local E2E evidence language** — Disposition B (no attribution). See below.

## Local E2E observation (Disposition B — no attribution)

A local `npm run test:e2e` run during the original planning delivery reported:

- **247** passed
- **2** skipped
- **3** failed
- failures in the Final-wager refresh-resume scenario across three Playwright
  projects

> The observed local failures are not attributable to PR #35 by changed-path
> scope. Their root cause was not established in this planning slice.

This receipt does **not** claim that the failures are a pre-existing Slice 14
product defect, a test defect, an environment defect, a browser-version defect,
or a regression. No further clean-base reproduction was run under this repair
authorization. Any investigation is routed to a separate product/test lane.
**No product investigation or repair is authorized here.**

## Explicit non-claims

- No Slice 15–22 implementation.
- No schema, public-wire, storage, UI, hardware, or deployment change.
- No Raspberry Pi compatibility claim.
- No Sony Buzz claim beyond the bounded OADL2-S07 configuration and Slice 21
  target profile.
- `CQS-OD-066` remains unresolved.
- No new `CQS-OD-*` created.
- No post-MVP arc activated.
- Historical receipts and Amendments 001/002 bodies were not rewritten; they
  remain records of what was true when written and are superseded for current
  routing through Amendment 003.
- Local E2E failures are unattributed (Disposition B).

## Verification (to be observed on the repair head)

Required checks for this documentation-only delivery / repair:

1. `git diff --check`
2. relative Markdown-link validation for changed docs
3. `npm run lint`
4. `npm run typecheck`
5. `npm run test:run`
6. `npm run build`
7. local full E2E not re-required for this documentation repair
8. all changed paths are Markdown
9. no pre-existing receipt changed
10. no source/test/package/workflow/schema/asset/config change
11. full PR still exactly 13 Markdown paths
12. repair diff against pre-repair head touches only the four authorized repair
    paths
13. exact-head GitHub CI terminal state reported honestly

Results are recorded in the Bridge Mode repair report for the exact head.
