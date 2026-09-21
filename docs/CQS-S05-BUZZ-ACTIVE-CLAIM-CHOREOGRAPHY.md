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
- **Tranche status:** **TERMINALLY COMPLETE**
- **Date (America/Chicago):** 2026-09-21

### Review / repair / merge chain (observed)

| Head | Verdict |
| --- | --- |
| `2ad426e73989619fb28a2a05b2ce561dc22253cd` | **REPAIR REQUIRED** (independent exact-head review: F1 Sonar duplication 3.9%; F2 waiting-count cancelled acknowledgement; F3 remount fabricated claim; F4 local accent list; F5 720p claim chrome clipping) |
| `bdd044f5ae06ad17a34968a0d9dce8a1851a8f35` (F1–F5 code repair) | intermediate — not independently accepted by the repair task |
| `042d973b1a90de46bbee939d628a5eba72a86b9e` / `fc87c49d4bf46b4901e77628b497b98b0ea67d4e` | docs clarification on repaired tip |
| `fc87c49d4bf46b4901e77628b497b98b0ea67d4e` | **ACCEPT CANDIDATE** |
| squash / main `42bbdfff5bd09386958f40dbb6475d69c8b0ab2d` | **MERGED** (PR #91; sole parent `33e9c91…`; trees **EXACT MATCH** `9a0b852…`) |

Repair authority (historical):
`AUTHORIZE-CQS-REAL-MVP-S05-PR91-BUZZ-ACTIVE-CLAIM-F1-F5-REPAIR-1`.
Repair alone did **not** mark this tranche independently accepted.

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

Acknowledgement ownership is the semantic `activeKey` (`active` team key, else
`null`). First observation **seeds** prior state (catch-up / remount → no
fabricated claim). Observed `none → active` and `active A → active B`
acknowledge. Waiting-count-only updates refresh the count and must neither
start nor cancel an in-flight acknowledgement. Signal Rail keeps
`BuzzQueueDisplay` mounted while buzz is `none` (renders null) so `none →
active` is observed across compact→expanded without remount catch-up.

| State | Presentation |
| --- | --- |
| Ready / armed, no claim | Compact Signal Rail: `Waiting for a buzz` (does not compete with clue) |
| Catch-up remount into already-active | Immediate active name; `data-claim-changed=false` (seed, no fabricated claim) |
| Observed none → active | Immediate active name + claim-change acknowledgement |
| Active + waiting 0 | `No teams waiting` |
| Active + waiting 1 | `1 team waiting` (no identity) |
| Active + waiting many | accurate plural count (stress exercises 7 waiting / 8 teams) |
| Waiting-count during acknowledgement | Count updates immediately; claim marker continues |
| Active-team change | New name immediate; `bqd--claim-changed` acknowledgement; no cause-specific copy |
| Exhausted | `Response closed` + `No one left to answer` (terminal, not an app failure) |

---

## E. Presentation design

- **Active-team hierarchy:** largest text is the answering name; label
  `Answering` is secondary; waiting count tertiary.
- **Waiting-count hierarchy:** anonymous count only.
- **State-change acknowledgement:** inset ring + surface tint (+ optional
  `--dur-emphasized` pulse) around already-visible text — no outward
  `outline-offset` / scale beyond clipped F1 geometry. Hold marker is 420ms
  (outlasts `--dur-emphasized` 320ms without reading CSS variables at runtime).
  Never delays name render. No cause-specific rebound wording.
- **Exhausted treatment:** distinct panel + explicit closed copy.
- **Reduced-motion:** static inset ring + underline emphasis without animation;
  meaning preserved when motion is removed.
- **High-contrast / grayscale:** text carriers remain; public accent border is
  supplemental only via canonical `TEAM_ACCENTS` / `teamAccentClass`.
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

## J. Post-merge identity

| Fact | Value |
| --- | --- |
| PR | [#91](https://github.com/ricktron/classroom-quiz-show/pull/91) **MERGED** |
| Rejected head | `2ad426e73989619fb28a2a05b2ce561dc22253cd` → **REPAIR REQUIRED** (F1–F5) |
| Repair tip | `bdd044f5ae06ad17a34968a0d9dce8a1851a8f35` (intermediate) |
| Accepted implementation head | `fc87c49d4bf46b4901e77628b497b98b0ea67d4e` → **ACCEPT CANDIDATE** |
| Squash / main | `42bbdfff5bd09386958f40dbb6475d69c8b0ab2d` |
| Sole parent | `33e9c910f7abe5fbc048704ff9fef5962d213919` |
| Accepted / main tree | **EXACT MATCH** `9a0b8527d670dfdf6aaec58fbb70f3577fab443b` |
| Post-merge workflows | CI, Playwright, Desktop artifacts (unsigned macOS + Windows), Pages, SonarCloud — all **SUCCESS** |
| Tranche status | **TERMINALLY COMPLETE** |
| Parent status | **OPEN / NOT TERMINAL** |

Terminal post-merge reconciliation:
[`receipts/2026-09-21-cqs-real-mvp-s05-buzz-active-claim-terminal-post-merge-reconciliation.md`](receipts/2026-09-21-cqs-real-mvp-s05-buzz-active-claim-terminal-post-merge-reconciliation.md).

---

## K. Next owner decision

**Independent exact-head review of the docs-only S05 buzz / active-claim
terminalization candidate** that carries the terminal receipt and
current-routing reconciliation.

Does not authorize merge of that docs PR, additional S05 work, S04D, S06,
or S05 parent terminalization. No `S05-F2` identity is registered.
