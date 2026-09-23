# CQS REAL MVP S05 — board/round-flow presentation choreography

Local and repository delivery evidence for the bounded S05 child that adds
remount-safe board ↔ clue ↔ round-flow presentation causality on the projector
— lifecycle presentation only; never gameplay authority; never delayed
authoritative content; never full-board-while-clue schema expansion.

- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S05-BOARD-ROUND-FLOW-PRESENTATION-CHOREOGRAPHY-1`
- **Tranche:**
  `CQS-REAL-MVP-S05-BOARD-ROUND-FLOW-PRESENTATION-CHOREOGRAPHY`
- **Parent:** `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY`
  (parent remains **OPEN / NOT TERMINAL**)
- **Tranche status:** **AUTHORIZED DELIVERY CANDIDATE — NOT ACCEPTED / NOT TERMINAL**
- **Date (UTC):** 2026-09-23

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
| Exact head | `4c5b575871a2823576d165758425d65633e9bc18` |
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
| Tile selection | Observed `board → selected` acks selection header; remount into selected does not. |
| Question reveal | Observed `selected → prompt` acks prompt; remount into prompt does not. No spatial morph. |
| Return to board | Board immediate; optional return-orient on matching already-public used tile (categoryTitle + value from prior mounted selection). |
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
- `src/test/visualStressDisplaySnapshots.ts` (board-flow snapshots)
- `tests/e2e/s05-board-round-flow-presentation-choreography.spec.ts`

**Docs / routing**

- This closeout
- `docs/STATUS.md`, `docs/handoff/CURRENT.md`, `docs/plans/CQS-REAL-MVP-ARC.md`
- `docs/design/CQS-UX-SURFACE-INVENTORY.md` (surfaces 14–15 + S05 routing)

Host / scoreboard / BuzzQueueDisplay / BoardOutcomeDisplay production
untouched. No reducer / sanitizer changes.

---

## J–R. Verification / non-claims

| Check | Result (tip `4c5b575…`) |
| --- | --- |
| `git diff --check` | clean |
| lint / typecheck / build | pass (3 pre-existing ThemeProvider warnings) |
| Focused unit | 59 passed |
| Full unit | known local BroadcastChannel/`usePublicState` baseline fail — not claimed pass |
| New board-flow e2e | 18 passed / 2 skipped (720p+1080p) |
| Regression (outcome auth+presentation, buzz, F1 720p) | passed |
| Sonar MCP | unavailable this run — report CI check-run; no NOSONAR |

Physical S06 not claimed. Parent not terminalized. Successor
`CQS-REAL-MVP-S05-FINAL-AND-WINNER-PRESENTATION-CHOREOGRAPHY` named only —
**not authorized**.

PR: [#98](https://github.com/ricktron/classroom-quiz-show/pull/98) — non-draft;
auto-merge **OFF**.

---

## T. Status label

```text
CQS-REAL-MVP-S05-BOARD-ROUND-FLOW-PRESENTATION-CHOREOGRAPHY:
AUTHORIZED DELIVERY CANDIDATE — NOT ACCEPTED / NOT TERMINAL

S05 parent:
OPEN / NOT TERMINAL
```

```text
Stop for Rick.
```
