# CQS REAL MVP S05 — board/round-flow presentation choreography

Local and repository delivery evidence for the bounded S05 child that adds
remount-safe board ↔ clue ↔ round-flow presentation causality on the projector
— lifecycle presentation only; never gameplay authority; never delayed
authoritative content; never full-board-while-clue schema expansion.

- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S05-BOARD-ROUND-FLOW-PRESENTATION-CHOREOGRAPHY-1`
- **Gate / repair authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S05-PR98-VERIFICATION-GATE-RECONCILIATION-AND-BOUNDED-REPAIR-1`
- **Semantic repair authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S05-PR98-SEM-UNDO-DIRECTION-AND-UNAMBIGUOUS-ORIENTATION-1`
- **Tranche:**
  `CQS-REAL-MVP-S05-BOARD-ROUND-FLOW-PRESENTATION-CHOREOGRAPHY`
- **Parent:** `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY`
  (parent remains **OPEN / NOT TERMINAL**)
- **Tranche status:** **AUTHORIZED DELIVERY CANDIDATE — REPAIRED / NOT ACCEPTED / NOT TERMINAL**
- **Date (UTC):** 2026-09-24

```text
durable snapshot ≠ just-happened event
board reveal / selection / prompt / return / clear / Final bridge = local seed/ack
no full-board-while-clue; no spatial morph
Final wager/reveal/winner = successor only
PublicState 9 / sync 2 / persistence 1 unchanged
no outcomeKey / no presentation event ids
Path S-C / buzz / board-outcome / F1 preserved
child candidate ≠ parent terminal
Stop for Rick
```

---

## A. Identity

| Fact | Value |
| --- | --- |
| Canonical implementation base | `89c952344843f4924c84b1719ef93a3881372ecd` |
| Implementation branch | `cursor/cqs-real-mvp-s05-board-round-flow-presentation-fb16` |
| PR #98 live candidate head | **re-observe from GitHub / exact-head review** (do not pin a tip SHA here) |
| Historical product implementation tip | `4c5b575871a2823576d165758425d65633e9bc18` (historical) |
| Historical docs-identity tip (pre-gate) | `a817d1f08876b0afaf7f1f8c896466a182f40c25` (historical) |
| Historical gate-failing tip (Sonar 3.2% duplication) | `5171eecb6968516b2d7ee087ed8524d3540d4910` (historical) |
| Historical semantic-rejected tip (F-UNDO-DIRECTION + F-UNAMBIGUOUS-ORIENTATION) | `ad544827ad2ad20f860fb06584dc45886d07dac0` (historical) |
| PR | [#98](https://github.com/ricktron/classroom-quiz-show/pull/98) — non-draft; auto-merge **OFF** |

---

## B. Product objective

Make ordinary category-board play feel causally connected on the Display:
board reveal, tile selection, question reveal, return-to-board orientation,
optional category-clear acknowledgement when newly observed, and a
Display-side bridge into Final — without delaying authoritative state and
without expanding public protocol.

---

## C. Public-state non-change

Confirmed **unchanged**:

| Contract | Result |
| --- | --- |
| `PUBLIC_STATE_SCHEMA_VERSION` | **9** (no bump) |
| Sync envelope (`SYNC_SCHEMA_VERSION`) | **2** |
| `PERSISTENCE_WIRE_VERSION` | **1** |
| Sanitizer / reducer / command-event / replay | **unchanged** |
| Full board while clue open | **unchanged** (still absent) |
| Scoreboard / ADR-006 / Path S-C | **unchanged** |

No `outcomeKey`, presentation timestamps, or animation sequence ids.

---

## D–H. Presentation design (summary)

| Moment | Behavior |
| --- | --- |
| Board reveal | First observation / remount seeds durable board (`data-flow-ack=false`). Observed enter/return may ack (`cbd--board-enter`). |
| Tile selection | Observed `board → selected` acks selection header; remount into selected does not. Undo `prompt → selected` does not ack as selection. |
| Question reveal | Observed `selected → prompt` acks prompt; remount into prompt does not. Undo `answer → prompt` does not ack as prompt-reveal. No spatial morph. |
| Return to board | Board immediate from `prompt|answer → board` may ack board-enter; `selected → board` fail-safe suppresses board-enter. Optional return-orient only when exactly one used public tile matches prior already-public selection (categoryTitle + value). Zero or multiple matches suppress. |
| Local memory | Prior selection identity + prior cleared-key set held only in mounted lifecycle; never persisted / synced / authoritative. |
| Category completion | Durable Cleared / depletion primary. Newly appearing cleared keys after seed may light-ack; remount onto already-cleared does not. |
| Round→Final bridge | Shell observes `board:* → final:*`; remount into Final seeds without ceremony. Final wager/reveal/winner **out of scope**. |

Motion yields when buzz is active or `boardOutcome` is resolved (`ownsFlowMotion`).

Tokens: `--dur-emphasized`, `--ease-emphasized`, `--state-active` inset/wash; reduced-motion keeps static ring.

---

## I. Surfaces changed

**Production**

- `src/display/useSemanticPresentationAck.ts` (tiny shared seed/ack helper)
- `src/display/CategoryBoardDisplay.tsx` / `.css`
- `src/display/audience/AudienceDisplayShell.tsx` / `.css`

**Tests**

- `src/display/useSemanticPresentationAck.test.tsx`
- `src/display/CategoryBoardDisplay.test.tsx`
- `src/display/audience/AudienceDisplayShell.test.tsx`
- `src/test/visualStressDisplaySnapshots.ts` (board-flow snapshots; later Sonar-only seed helper extract)
- `tests/e2e/s05-board-round-flow-presentation-choreography.spec.ts`
- `tests/e2e/helpers/displayPublicState.ts` (shared overflow assert; Sonar-only)
- sibling S05 e2e overflow imports (outcome / buzz; Sonar-only)

**Docs / routing**

- This closeout
- `docs/STATUS.md`, `docs/handoff/CURRENT.md`, `docs/plans/CQS-REAL-MVP-ARC.md`
- `docs/design/CQS-UX-SURFACE-INVENTORY.md` (surfaces 14–15 + S05 routing)

Host / scoreboard / BuzzQueueDisplay / BoardOutcomeDisplay production
untouched. No reducer / sanitizer changes.

---

## J–R. Verification / non-claims

| Check | Result (historical local verification tip `4c5b575…`) |
| --- | --- |
| `git diff --check` | clean |
| lint / typecheck / build | pass (3 pre-existing ThemeProvider warnings) |
| Focused unit | 59 passed |
| Full unit | known local BroadcastChannel/`usePublicState` baseline fail — not claimed pass |
| New board-flow e2e | 18 passed / 2 skipped (720p+1080p) |
| Regression (outcome auth+presentation, buzz, F1 720p) | passed |

### Gate reconciliation (historical tip `5171eec…`)

On settled exact-head CI @ `5171eec…`: five required gates **SUCCESS**; SonarCloud **FAILURE** solely for **3.2%** new-code duplication (required ≤3%). Bounded Case A repair extracted shared stress-store seed + shared e2e overflow assert; no product behavior change; no NOSONAR / exclusions / QG weaken.

Re-observe live tip CI / Sonar metrics on GitHub after repair — do not treat this closeout as pinning the repaired SHA.

Physical S06 not claimed. Parent not terminalized. Successor
`CQS-REAL-MVP-S05-FINAL-AND-WINNER-PRESENTATION-CHOREOGRAPHY` named only —
**not authorized**.

PR: [#98](https://github.com/ricktron/classroom-quiz-show/pull/98) — non-draft;
auto-merge **OFF**.

---

### Semantic repair (historical tip `ad54482…`)

Independent exact-head review at `ad54482…` required **F-UNDO-DIRECTION** and
**F-UNAMBIGUOUS-ORIENTATION**. Bounded repair makes board-flow acknowledgement
direction-aware and suppresses ambiguous return-tile orientation (exactly one
used title+value match required). Store-driven undo + duplicate-value /
duplicate-title regressions added. Live tip is **re-observe from GitHub /
exact-head review** — do not pin the repaired SHA here.

## T. Status label

```text
CQS-REAL-MVP-S05-BOARD-ROUND-FLOW-PRESENTATION-CHOREOGRAPHY:
AUTHORIZED DELIVERY CANDIDATE — REPAIRED / NOT ACCEPTED / NOT TERMINAL

S05 parent:
OPEN / NOT TERMINAL
```

```text
Stop for Rick.
```
