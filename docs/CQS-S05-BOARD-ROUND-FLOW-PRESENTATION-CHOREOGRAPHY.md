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
- **Terminalization packet:** docs-only post-merge reconciliation after exact-head PASS and guarded squash merge
- **Tranche:**
  `CQS-REAL-MVP-S05-BOARD-ROUND-FLOW-PRESENTATION-CHOREOGRAPHY`
- **Parent:** `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY`
  (parent remains **OPEN / NOT TERMINAL**)
- **Tranche status:** **TERMINALLY COMPLETE**
- **Date (UTC):** 2026-09-24

```text
durable snapshot ≠ just-happened event
board reveal / selection / prompt / return / clear / Final bridge = local seed/ack
no full-board-while-clue; no spatial morph
Final wager/reveal/winner = successor only
PublicState 9 / sync 2 / persistence 1 unchanged
no outcomeKey / no presentation event ids
Path S-C / buzz / board-outcome / F1 preserved
child terminal ≠ parent terminal
Stop for Rick
```

---

## A. Identity

| Fact | Value |
| --- | --- |
| Canonical implementation base | `89c952344843f4924c84b1719ef93a3881372ecd` |
| Implementation branch | `cursor/cqs-real-mvp-s05-board-round-flow-presentation-fb16` |
| Accepted implementation head | `ba37f690f67e0edd6b36e54d13524024601dba4b` — **PASS / no blocking semantic findings** |
| Squash / main | `11064f3afa4f29dd0c0dbb671b3d88f3a73293f2` |
| Sole parent | `89c952344843f4924c84b1719ef93a3881372ecd` |
| Accepted / squash tree | **EXACT MATCH** `7bb8d5a80afc83afb71b629c1e3fc28b24e9d3d0` |
| Historical product implementation tip | `4c5b575871a2823576d165758425d65633e9bc18` (historical) |
| Historical docs-identity tip (pre-gate) | `a817d1f08876b0afaf7f1f8c896466a182f40c25` (historical) |
| Historical gate-failing tip (Sonar 3.2% duplication) | `5171eecb6968516b2d7ee087ed8524d3540d4910` (historical) |
| Historical semantic-rejected tip (F-UNDO-DIRECTION + F-UNAMBIGUOUS-ORIENTATION) | `ad544827ad2ad20f860fb06584dc45886d07dac0` (historical) |
| PR | [#98](https://github.com/ricktron/classroom-quiz-show/pull/98) — **MERGED** (guarded squash) |

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

Historical gate evidence is preserved above. Final accepted exact-head evidence is recorded below; do not flatten rejected or gate-failing tips into first-pass success.

Physical S06 not claimed. Parent not terminalized. Successor
`CQS-REAL-MVP-S05-FINAL-AND-WINNER-PRESENTATION-CHOREOGRAPHY` remains named
only — **not authorized**.

PR: [#98](https://github.com/ricktron/classroom-quiz-show/pull/98) — **MERGED** via guarded squash.

---

### Semantic repair and acceptance chain

Independent exact-head review at `ad544827ad2ad20f860fb06584dc45886d07dac0`
required **F-UNDO-DIRECTION** and **F-UNAMBIGUOUS-ORIENTATION**. Repair at
`fd5d30e5ae743b4ca828a5d636197776758c16e0` closed those findings, but fresh
exact-head re-review found **F-UNDO-ORIENTATION-CROSSTALK** and
**F-ORIENTATION-OWNERSHIP-YIELD**. Product repair
`44c7d55267f1211fc8d23c2ecdb4199339390804` restricted orientation to truthful
forward `prompt|answer → board` returns and yielded it immediately to
buzz/outcome ownership; Sonar then failed solely on **5.2%** new-code
duplication caused by regression test duplication. Test-only dedupe
`ba37f690f67e0edd6b36e54d13524024601dba4b` restored Sonar to **1.6%**.

Fresh independent exact-head semantic re-review on `ba37f690…`: **PASS / no
blocking semantic findings**. All six PR-head checks succeeded. PR #98 was
guarded-squash merged as `11064f3afa4f29dd0c0dbb671b3d88f3a73293f2`; accepted
and squash trees are **EXACT MATCH** `7bb8d5a80afc83afb71b629c1e3fc28b24e9d3d0`.

Terminal reconciliation:
[`receipts/2026-09-24-cqs-real-mvp-s05-board-round-flow-presentation-choreography-terminal-post-merge-reconciliation.md`](receipts/2026-09-24-cqs-real-mvp-s05-board-round-flow-presentation-choreography-terminal-post-merge-reconciliation.md).

## T. Status label

```text
CQS-REAL-MVP-S05-BOARD-ROUND-FLOW-PRESENTATION-CHOREOGRAPHY:
TERMINALLY COMPLETE

S05 parent:
OPEN / NOT TERMINAL
```

```text
Stop for Rick.
```
