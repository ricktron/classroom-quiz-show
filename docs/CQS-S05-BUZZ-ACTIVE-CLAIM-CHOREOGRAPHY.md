# CQS REAL MVP S05 — buzz / active-claim choreography

Local and repository delivery evidence for the bounded S05 child tranche that
makes projector-visible buzz / active-claim state immediately understandable
at classroom distance.

- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S05-BUZZ-ACTIVE-CLAIM-CHOREOGRAPHY-1`
- **Tranche:**
  `CQS-REAL-MVP-S05-BUZZ-ACTIVE-CLAIM-CHOREOGRAPHY`
- **Parent:** `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY`
  (parent remains **OPEN / NOT TERMINAL**)
- **Tranche status:** **DELIVERY CANDIDATE / NOT MERGED / NOT TERMINAL**
- **Date (America/Chicago):** 2026-09-21

This document does **not** predict its own open delivery PR number, merge SHA,
or exact-head review verdict.

---

## A. Base and scope

| Fact | Value |
| --- | --- |
| Canonical base | `33e9c910f7abe5fbc048704ff9fef5962d213919` |
| Branch | `feat/cqs-real-mvp-s05-buzz-active-claim-choreography` |
| In scope | `BuzzQueueDisplay`, Signal Rail ready/armed copy, quiet-cognition densify for active claim, sanitizer-derived buzz stress snapshots, unit/component/e2e proof, this doc, routing as authorized candidate |
| Out of scope | PublicState / wire / sync / persistence / reducer / replay expansion; Host redesign; Sony hardware; audio redesign; correct/incorrect/score/board/Final/winner choreography; S04D; S06; S05 parent terminalization |

No `S05-F2` numbering is implied.

---

## B. Public-state non-change

Existing sanitized public buzz facts used:

```text
PublicBuzzState =
  | { status: 'none' }
  | { status: 'active'; activeTeamKey; waitingCount }
  | { status: 'exhausted' }
```

Active team **name** is resolved from the public teams DTO by positional key.
Waiting teams remain a **count only**.

Confirmed **not** changed:

- Public-state wire version
- sync envelope
- persistence schema
- sanitizer contract (behavior unchanged; tests/snapshots only)
- command/event vocabulary
- reducer / replay
- Game schema

If presentation had required cause-specific promotion facts
(`promotedBecauseIncorrect`, previous team identity, ordered waiting names),
this tranche would have **stopped** for owner decision. It did not widen the
contract.

---

## C. Privacy invariant

Projector may show:

- active team public name
- `N team(s) waiting` / `No teams waiting`
- exhausted copy (`No one left to answer`)

Projector must **not** show:

- ordered or unordered waiting-team identities
- reaction-time ranking
- controller / device / button identity
- Host-private queue internals
- promotion cause unless already public (it is not)

Unit, snapshot, and e2e tests assert waiting identities do not enter Display
DOM for active + waiting states.

---

## D. State family

| State | Presentation |
| --- | --- |
| Ready / armed, no claim | Compact Signal Rail: `Waiting for a buzz` (does not compete with clue) |
| First active claim | Immediate active name + `Answering` + waiting count; claim-change marker on first floor hold |
| Active + waiting 0 | `No teams waiting` |
| Active + waiting 1 | `1 team waiting` (no identity) |
| Active + waiting many | accurate plural count (stress exercises 7 waiting / 8 teams) |
| Active-team change | New name immediate; prior emphasis cleared; `bqd--claim-changed` acknowledgement; no cause-specific copy |
| Exhausted | `Response closed` + `No one left to answer` (terminal, not an app failure) |

---

## E. Presentation design

- **Active-team hierarchy:** largest text is the answering name; label
  `Answering` is secondary; waiting count tertiary.
- **Waiting-count hierarchy:** anonymous count only.
- **State-change acknowledgement:** brief outline + optional
  `--dur-emphasized` pulse around already-visible text. Never delays name
  render. No cause-specific rebound wording.
- **Exhausted treatment:** distinct panel + explicit closed copy.
- **Reduced-motion:** outline + underline emphasis without animation; meaning
  preserved when motion is removed.
- **High-contrast / grayscale:** text carriers remain; public accent border is
  supplemental only (`accent--*` / `data-accent`).
- **F1 coexistence:** quiet-cognition densify for `.bqd` inside Signal Rail so
  schema-max clue + 8-team deck budget is preserved.

---

## F. Audio relationship

ADR-020 `active-claim` cue unchanged. Visual choreography does not gate on
audio, does not add sound categories, and remains valid when muted or when
playback fails.

---

## G. Verification (local evidence to re-observe on the PR)

Required at delivery:

- `git diff --check`
- focused BuzzQueueDisplay / SignalRail / visual-stress snapshot tests
- focused buzz e2e + new choreography e2e
- `npm run verify`
- `npm run verify:all`
- Playwright projects `projector-720p` and `desktop-1080p`
- high-contrast and reduced-motion paths in the new e2e file

Physical Sony / projector qualification remains **S06** and is **not** claimed.

---

## H. Physical-evidence boundary

Keyboard Host→Display path is covered. Hardware buzzers are optional and not
required for acceptance of this tranche.

---

## I. Remaining S05 (later; not authorized here)

- correct / incorrect outcome feedback
- score choreography
- board / round transitions
- Final choreography
- winner celebration
- Host polish
- any remaining global visual-system work

Parent S05 remains **OPEN / NOT TERMINAL**.

---

## J. Next owner decision

**Fresh independent exact-head review** of this S05 buzz / active-claim
choreography delivery candidate. Merge is **not** authorized by this document.
