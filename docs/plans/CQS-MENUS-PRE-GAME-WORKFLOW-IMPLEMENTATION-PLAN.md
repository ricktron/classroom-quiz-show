# CQS MENUS — Pre-game workflow implementation plan

- **Document id:** `CQS-MENUS-PRE-GAME-WORKFLOW-IMPLEMENTATION-PLAN`
- **Program:** `CQS-REAL-MVP-1` (subordinate planning — **not** a new Program arc)
- **Kind:** bounded implementation plan for teacher-facing **Home → class setup → Ready → Start → focused Host** workflow (MENUS)
- **Status:** **ACTIVE — planning only.** This file does **not** authorize
  product code, merge of PR #110, S04D, S06, S05 terminalization, or owner
  playthrough resume.
- **Planning base tip:** `0fb4fe01dc332995b33631a19f54a501d1126de8`
  (`docs: durably store Claude Design reference package (#111)`)
- **Preferred design evidence:** D04-R1 · v1.1 at
  [`../design/reference-artifacts/claude-design/2026-09-28/CQS-MENUS-D04-REFERENCE.zip`](../design/reference-artifacts/claude-design/2026-09-28/CQS-MENUS-D04-REFERENCE.zip)
  (165850 bytes; SHA-256
  `a17e8cad628806a533b10e16c637a6dcaa349b79220fa051ba5c1c3c577df612`)
- **Settled IA inputs (store / Court; not repo authority by themselves):**
  D02 Fable Court; D01 evidence framing; D04-R1 package README / frames

```text
this plan ≠ REAL MVP arc replacement
this plan ≠ slice Complete
preferred design evidence ≠ implementation authority
each delivery tranche needs fresh Rick authorization
```

---

## 1. Purpose

Register a **dependency-ordered, tranche-sized** plan so later owner-authorized
MENUS delivery can recompose the ordinary teacher pre-game path without
reopening S04A as a Program slice, without inventing a second roadmap, and
without collapsing Home and Host into incoherent intermediate states.

## 2. Authority and subordination

1. Observed merged code, tests, configuration, and Git history remain first.
2. [`../PROJECT.md`](../PROJECT.md), [`../CQS-PRODUCT-CONTRACT.md`](../CQS-PRODUCT-CONTRACT.md),
   accepted ADRs, and [`../STATUS.md`](../STATUS.md) outrank this plan.
3. [`CQS-REAL-MVP-ARC.md`](CQS-REAL-MVP-ARC.md) remains the Program plan of
   record. This document is **subordinate planning** under that Program.
4. [`CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`](CQS-REAL-MVP-S04-FAMILY-DIRECTION.md)
   and adopted UX doctrine guide teacher-facing behavior; they do not, by
   themselves, authorize MENUS product PRs.
5. D02 Court and D04-R1 are **settled design / preferred evidence**. They
   inform slice bounds. They do **not** authorize implementation.
6. **Rick authorizes each delivery tranche separately.** Landing this plan
   (or storing D04-R1) is not product authorization.

## 3. Explicit non-goals of this plan document

- Not a new REAL MVP arc or Slice-24 successor numbering.
- Does **not** reopen S04A as a Program slice (S04A remains TERMINALLY COMPLETE).
- Does **not** authorize S04D or S06.
- Does **not** terminalize S05 parent.
- Does **not** resume the deliberate whole-game owner playthrough. Playthrough
  remains **paused** until MENUS + early-workflow qualification evidence the
  owner accepts — and only when the owner separately resumes it.
- Does **not** merge, close, rebase, or rewrite PR #110.
- Does **not** change engine schemas, PublicState, Session event kinds,
  Game↔Session ownership, Sony poll architecture, or Display visual system.
- Does **not** mark MENUS Complete in STATUS by virtue of planning alone.

## 4. Observation pin (planning base)

| Field | Value |
| --- | --- |
| `origin/main` tip at plan authoring | `0fb4fe01dc332995b33631a19f54a501d1126de8` |
| Product delta vs parent `ca158e6…` | Docs/reference only (PR #111); zero ordinary `src/` / `tests/` drift for MENUS product surfaces |
| PR #110 | OPEN draft; head `27a31fe12c1e3e3981a1dd8478c0b549840569e4`; merge-base `ca158e6884c413e34d0be6065df572f464c8ddc9`; path-disjoint from #111; CI green — **not** MENUS acceptance |
| Working discipline | One authorized branch / tranche at a time; stop on architecture or authority ambiguity |

If `main` moves before a delivery tranche, re-observe tip and rebaseline the
tranche packet. Stop if unexpected product drift invalidates these slice bounds.

---

## 5. Product definition of done (MENUS early-workflow)

MENUS succeeds when a normal teacher, on the ordinary path, can:

1. Land on **Home** and immediately see the correct next class action
   (recovery first when present; otherwise a clear playable Game hero when the
   library is populated; New/Import secondary; no marketed bare-Host CTA).
2. Import or author a playable Game without Host power-path archaeology
   (templates inside Home Import; board-first New Game editing).
3. Enter **Class Setup** via `?play=` and finish required readiness
   (teams 1–8 + unique Session names) with optionals (buzzers / Display /
   sound) never stranding Start.
4. See **Ready** as a setup state when `canStartPlay` is true — one dominant
   Start control; optionals as honest facts, not fake projector/speaker
   confidence.
5. **Start** into a focused Host: gameplay panels first; kitchen-sink chrome
   demoted; Mute / Display focus / Back to setup immediate; lifecycle owners
   (sync, audio, timers, gamepad poll, display-handle poll) never unmounted
   for declutter.
6. Recover: Resume / Start fresh honest; Resume posture derived at hydration;
   Change Game reaches Home with replace-confirm when a Session exists;
   0-team Games expose an Edit path instead of a silent missing panel.
7. Keep keyboard usable without controllers; Sony remains optional with
   honest copy; Display stays sanitized and read-only.

**Program vocabulary note:** implemented setup CTA today is **Play**. Owner
Court §23 #1 chooses `Play` vs `Start Game` (and collateral badges / Reset
terms). Slice copy stays vocabulary-neutral or gated on that call.

---

## 6. Settled information architecture (from D02 / D04-R1)

Synthesize — do not paste Court or prototype wholesale. Binding product
behavior still requires Rick-authorized delivery.

| Topic | Settled shape |
| --- | --- |
| Standing setup IA | One readiness workspace; five rows always present (Teams · Names · Buzzers · Display · Sound); one dominant expanded; teacher may expand another; no mandatory wizard; no ceremonial Ready route |
| Ready gate | `canStartPlay` only (teams 1–8 + names assigned + unique); optionals never block Start |
| Ready presentation | When required met: Ready heading + Start sole dominant; live status line for unresolved optionals; no optional auto-expand (Court default; §23 #2 fork preserved) |
| Start | Host **posture** transition over existing `playReady` substrate; derive at hydration from gameplay-class events after last init; **not** a new Session event in MENUS |
| Focused Host | Shell subtraction + fixed chrome; `<details>` More for demoted power paths; no Settings surface/route |
| Bare `#/host` | Route retained; Home CTA removed; **default posture unchanged in MENUS** |
| Team count | Game-owned; authoring add/remove UI required; Session-time override deferred |
| Names / Sony | Names-first; conditional colour-press copy on supported-receiver detection; `GamepadInputHostPanel` always mounted |
| Display / sound | Facts not readiness (“window open/not open”; tested/muted/not tested); retire “Display ready” |
| Home | Recovery first; hero Play when populated; merge lists; demote New/Import/Display; #110 templates inside Import |
| D04-R1 role | Preferred visual/composition evidence for the above IA — **not** pixel DoD and **not** engine/schema authority |

## 7. Qualification limits (honest non-claims)

MENUS delivery + Slice H automation **cannot** claim:

| Claim | Status |
| --- | --- |
| Physical projector / speaker confidence | Out of MENUS; S06-class |
| Windows physical teacher runtime | STATUS: **NOT RUN** / S06 |
| Physical Sony re-qualification | Required later if posture/copy/`selectionMode` moment changes vs H6 identity; not closed by simulated e2e |
| CI green = teacher journey success | False; selector presence ≠ semantic task success |
| Visual historian PNGs alone = acceptance | False; historian is evidence class, not owner verdict |
| D04-R1 prototype = shipped product | False |
| PR #110 merge = MENUS Complete | False |

Owner playthrough remains the acceptance verdict for classroom feel (Slice I).

## 8. PR #110 disposition and harvest timing

| Field | Planning observation |
| --- | --- |
| Aggregate disposition | **RETAIN WITH ADAPTATION** (Court Q12; Lane 3 re-observation) |
| Merge as standalone | **Not authorized** |
| Prefer | Harvest into authorized MENUS slices **C/D** (and team-count via D/E) after rebase onto then-current `main` |
| Retain catalog | Home Import templates (Board+Final primary / Classic secondary); board-first New Game; Final before teams; `Game settings` `<details>`; quality disclosure; QUICK_START path |
| Adaptations at land | Keep templates **inside** Import disclosure; vocabulary pass after §23; reserve Game-settings shell for team-count; do not reopen S04A Program slice |
| When to harvest | Same authorization wave as **Slice C Home** (serialize `HomeRoute.tsx`); authoring hunks in **Slice D**; team-count UI extends D’s settings shell (or lands in E if D delayed — incomplete vs Q7 if omitted) |
| Rebase note | Path-disjoint from #111 at tip `0fb4fe0…`; re-observe head/base before harvest if either moves |

---

## 9. Slice family overview (A–I)

Coherent families from Court §25 / D05 lane maps, split to avoid one giant PR
and avoid micro-slice thrash. Each family is a **candidate authorization
packet**, not a started branch.

| ID | Family | Primary job |
| --- | --- | --- |
| **A** | Host posture / shell subtraction | Focused Host after Start; demote kitchen sink; L0 Back; derived Resume posture; remove Home bare-Host CTA; Mute chrome; identity header |
| **B** | Readiness rows dial | Chips → five-row disclosure dial; one dominant; inline secondary verbs |
| **C** | Home hierarchy | Recovery-first; hero Play; merged library; demote New/Import/Display; badge vocabulary hooks |
| **D** | Import + authoring + #110 harvest | Templates in Import; board-first editor; Game settings shell; QUICK_START |
| **E** | Names / Sony / 0-team / team-count | Conditional Names copy; 0-team mount + Edit link; authoring add/remove teams |
| **F** | Display / sound / Ready semantics | Single `canStartPlay` Ready selector; honest Display/Sound words; optional exception line |
| **G** | Change Game + recovery orientation | Setup Change-game → Home; replace-confirm journey; Resume welcome-back orientation |
| **H** | Semantic acceptance / visual | Automable semantic e2e + historian milestones for teacher jobs |
| **I** | Owner gate | Vocabulary forks; deliberate MENUS playthrough; physical/Windows non-claims |

---

## 10–13. Cross-cutting delivery rules

### 10. Home vs Host coherence rule

Never leave an intermediate merge where:

- Home still markets **Open classroom controls** after Host shell expects
  ordinary entry only via `?play=` / Resume, **or**
- Home hero/Play hierarchy lands while Host kitchen-sink still owns the first
  viewport after Start, **or**
- Import templates promote to Home-level CTAs while Court/Home hierarchy still
  demotes Import.

**Serialization:** A3 (CTA removal) before or inside the same authorized wave
as C; C and D serialize on `HomeRoute.tsx`; A shell before claiming focused
Host DoD; F Ready rule before claiming optional-readiness DoD.

### 11. Lifecycle never-unmount list

Sync (`useHostSync`), presentation audio, response/Final timer expiry,
display-handle poll, and `GamepadInputHostPanel` / gamepad poll remain mounted
in **both** postures. Gameplay panels may unmount when `!playReady` (tip
behavior). Do not “declutter” by unmounting owners.

### 12. Harness / Advanced path

~20 e2e/desktop paths use Advanced / sample init / bare `#/host`. Demotion
must keep a developer-reachable harness path. Bare `#/host` default posture
stays unchanged in MENUS.

### 13. Evidence classes

| Class | Use |
| --- | --- |
| unit/component | Helpers, panels, posture derivation matrices |
| reducer/state | Readiness / library / name selection |
| browser/e2e | Semantic teacher jobs (Slice H) |
| rendered visual | New historian milestone bound to exact SHA (not alone merge gate) |
| owner observation | Slice I verdict |
| physical / Windows | Non-claims unless separately authorized |

Unrun checks must **never** be reported as passing ([`../../AGENTS.md`](../../AGENTS.md)).

---

## 14. Dependency-ordered slices (full fields)

### Slice A — Host posture / shell subtraction

| Field | Content |
| --- | --- |
| **Purpose** | Make Start a real focused-Host posture: subtract ordinary kitchen-sink chrome; keep lifecycle owners; close FC3 Resume trap (L0 Back + derived hydration); remove marketed bare-Host CTA |
| **In scope** | Shell posture gate after Start; `<details>`/More relocation of demoted mounts; `PersistenceControls` split (recovery vs library); Home remove Open classroom controls; `Back to setup` never disabled; derived-at-hydration posture on Resume/`?play=`; Mute to Host chrome; identity header from Session definition title (+ round in play); minimal non-interactive play-posture status + fault-only recovery slot; acceptance harness for Start transition + Resume landing |
| **Out of scope** | Rows dial (B); Home hierarchy redesign (C); #110 harvest (D); Ready selector / Display honesty internals if packed in F (coordinate — do not duplicate); bare-`#/host` default change; `CLASS_STARTED` event; Settings surface; PublicState/wire; Display visual redesign; Sony physical re-qual |
| **Depends on** | Owner MENUS tranche auth; optional §23 vocabulary (labels may stay `Play` temporarily) |
| **Likely files** | `HostRoute.tsx/.css`, `FoundationControls.tsx/.css`, `ClassroomSetupPanel.tsx/.css`, `PersistenceControls.tsx`, `HomeRoute.tsx` (CTA only), new posture-derivation helper under `src/session/`, targeted e2e/unit (`FoundationControls` test new) |
| **Risks** | Unmounting lifecycle owners; `selectionMode` flip on Back; Display opener split (`noopener` vs tracked handle); Advanced demotion bricks harness; scope bleed into B/C |
| **Acceptance** | Start-transition e2e (Home Play → names → Start → gameplay first; kitchen sink not ordinary); L0 Back enabled when names incomplete in play; Resume mid-names lands setup board; Resume after Start lands play (or one enabled click); bare `#/host` default unchanged; poll/sync/audio still live; explicit non-claims |
| **Auth** | Separate Rick tranche — not granted by this plan |

### Slice B — Readiness rows dial

| Field | Content |
| --- | --- |
| **Purpose** | Replace chip-hidden task bodies with Court/D04 rail: five rows always listed; one dominant expanded by pure recompute; ≤1 secondary verb on collapsed lines |
| **In scope** | Recompose `ClassroomSetupPanel` nav chips → row/`details`; drive emphasis from `dominantSetupTask` without `focusOverride` as status input; retire rendered “needs attention” for optional-current; Buzzers row anchors to mounted gamepad/Sony UI (no poll-owner move); unit/a11y coverage for emphasis + expand survival |
| **Out of scope** | Shell subtraction (A); Ready selector split / Display honesty strings (F — may leave hooks); conditional Sony copy & team-count (E); Home/#110 |
| **Depends on** | Soft: A for viewport after shell shrink; Court §7/§22 settled |
| **Likely files** | `ClassroomSetupPanel.tsx/.css/.test.tsx`, `classroomReadiness.ts/.test.ts`, optional presentational extract; visual-history registry only if selectors change |
| **Risks** | 1280×720 / 8-team height UNKNOWN; re-coupling status to focus; e2e selector churn; landing before F leaves FC4 half-fixed |
| **Acceptance** | Five rows in DOM in setup; one programmatic emphasis when required unmet; when `canStartPlay` and not play posture, Start sole primary and no optional forced open by recompute; Buzzers verb does not remount poll owner |
| **Auth** | Separate Rick tranche |

### Slice C — Home hierarchy

| Field | Content |
| --- | --- |
| **Purpose** | Make Home match ordinary funnel: recovery-first; hero Play when populated; one library list; demote New/Import/Display; drop bare-Host CTA (if not already removed in A) |
| **In scope** | DOM/IA reorder per Court §22 Home; Resume banner names Game + age/stage when derivable; row actions Play primary / Edit secondary / rest in More; badge rename hooks (after §23); keep Backup & restore `<details>` |
| **Out of scope** | #110 authoring hunks (D); Host posture (A); Class Setup rows (B); merging #110 wholesale |
| **Depends on** | Soft: owner vocabulary for badges; serialize with A3 CTA removal and with D Import panel edits |
| **Likely files** | `HomeRoute.tsx` + tests + Home e2e fixtures |
| **Risks** | Dual edit conflict with D; empty vs populated dominance bugs; badge collision with setup “Ready” |
| **Acceptance** | Populated library: hero/recent playable dominates Start group; New/Import not primary; no Open classroom controls; recovery precedes new Play; multi-entry choice reachable (H covers semantic fixture) |
| **Auth** | Separate Rick tranche (S04A-adjacent MENUS auth — does not reopen S04A) |

### Slice D — Import + authoring + #110 harvest

| Field | Content |
| --- | --- |
| **Purpose** | Close ordinary-path template hole and board-first authoring friction by harvesting RETAIN rows from PR #110 |
| **In scope** | Templates inside Import disclosure; Board+Final primary / Classic secondary via `downloadWorkbookTemplate`; board-first goal + first-incomplete cursor seed; Final before team settings; Game settings `<details>`; quality notes disclosure; QUICK_START adaptation |
| **Out of scope** | Importer/validation redesign; Host power Import (demoted in A); team-count control if packed in E (D must reserve shell); PR body/CI narrative |
| **Depends on** | Serialize with C on `HomeRoute.tsx`; rebase #110 onto then-current tip; soft: §23 before final QUICK_START wording |
| **Likely files** | `HomeRoute.tsx/.test.tsx`, `AuthoringRoute.tsx/.css/.test.tsx`, `docs/teacher/QUICK_START.md` |
| **Risks** | Promoting templates to Home-level CTAs; Game settings collapse hiding missing team-count; vocabulary drift |
| **Acceptance** | Teacher downloads Board+Final (and Classic) from Home Import; New Game lands on content work; Game settings closed by default but hosts (or reserves) team-count; no S04A reopen claim |
| **Auth** | Same wave as C preferred; still Rick-gated; **do not merge #110 as MENUS** |

### Slice E — Names / Sony / 0-team / team-count

| Field | Content |
| --- | --- |
| **Purpose** | Honest Names↔Sony relationship; end 0-team silent dead-end; expose Game-owned team count in authoring |
| **In scope** | Mount Class Setup when `teams.length === 0` with Teams `blocked` + Edit this game → `#/edit/:id` return to `?play=`; authoring add/remove via existing `correctDraft` ops (prefer inside D’s Game settings); conditional colour-press Names copy from supported-receiver signal; pass detection from gamepad/Sony panel (no duplicate detection); unit matrix |
| **Out of scope** | Session-time team count; Buzzers-before-Names default; Sony poll architecture / WebHID redesign; physical Sony/Windows; full repair UX redesign |
| **Depends on** | Soft: B row model; soft: D Game settings shell for count control |
| **Likely files** | `FoundationControls.tsx`, `ClassroomSetupPanel.tsx`(+tests), `GamepadInputHostPanel.tsx` / `useSonyBuzzSupportedProfile.ts`, `AuthoringRoute.tsx`(+tests), `correctDraft.ts` (UI wiring) |
| **Risks** | #110/`AuthoringRoute` serialization; `teamSignature` stale after count change; detection flicker while loading |
| **Acceptance** | 0-team: setup visible, Play disabled, Edit works; teacher can set count 1–8 in authoring; Names copy never shows colour-press without supported receiver; `canStartPlay` still names+teams only |
| **Auth** | Separate Rick tranche |

### Slice F — Display / sound / Ready semantics

| Field | Content |
| --- | --- |
| **Purpose** | Single Ready selector from `canStartPlay`; honest optional facts; kill FC4 two-dominants |
| **In scope** | When `canStartPlay`: Ready heading + Start dominant; split optional chore emphasis from Ready state; `needs attention` only for required-unmet/regression; replace “Display ready” with window open/not open; sound tested/muted/not tested; optional “No projector today” local acknowledgement; coordinate L0 Back attribute split with A |
| **Out of scope** | Persisting optional flags into Session/IDB; projector claims; unifying all Display openers beyond wording-first (tracking fix is follow-on); final §23 #2 alternate unless owner chooses it |
| **Depends on** | Soft: B for disclosure links in exception line; soft: A for Mute chrome / Back |
| **Likely files** | `classroomReadiness.ts/.test.ts`, `ClassroomSetupPanel.tsx/.test.tsx`, possibly `FoundationControls.tsx` for skip acknowledgement |
| **Risks** | Intentional contract change vs tip Display-after-names tests; teachers feeling Ready is “premature”; dual opener false-negatives remain |
| **Acceptance** | `canStartPlay` ⇒ Ready + Start dominant even if Display closed / buzzers unskipped / sound untested; exception line names facts; no teacher-facing “Display ready”; required unmet ⇒ Start disabled + blocker in status |
| **Auth** | Separate Rick tranche |

### Slice G — Change Game + recovery orientation

| Field | Content |
| --- | --- |
| **Purpose** | Close setup Change-game affordance gap and orient Resume landings without new Session entities |
| **In scope** | Setup-only small Change game → Home; exercise replace-confirm when Session exists and another Play is chosen; Resume/arrival orientation line (“Welcome back — …”); keep identity header consistent with A |
| **Out of scope** | Durable selected-Game store; changing replace-confirm substrate semantics; Windows relaunch claims |
| **Depends on** | A identity header; C Home hierarchy for destination clarity |
| **Likely files** | `ClassroomSetupPanel.tsx` / Host header composition, `HomeRoute.tsx` (orientation copy), e2e Change-game journey |
| **Risks** | Accidental Session clobber UX; copy colliding with recovery banner |
| **Acceptance** | From setup, Change game returns to Home; choosing another playable Game arms replace-confirm when Session present; Resume landing shows orientation consistent with derived posture |
| **Auth** | Separate Rick tranche |

### Slice H — Semantic acceptance / visual

| Field | Content |
| --- | --- |
| **Purpose** | Automable proof of teacher jobs after IA slices land — without substituting for owner judgment |
| **In scope** | Start-transition semantic e2e; Back-to-setup round trip; Home multi-game + draft fixture; simulated Sony name claim via `?play=` (NOT physical); FC3 Resume landing; mid-setup refresh; Ready+optional matrix; 0-team mount; Change Game journey; invert bare-Host CTA assertions; thin `FoundationControls` unit; new historian milestone for setup Ready + post-Start Host (immutable PNGs; SHA-bound) |
| **Out of scope** | Owner forks (§23); physical Sony; Windows; bare-`#/host` default change; declaring MENUS/S05 Complete; rewriting historical H5/H6 archives; merging #110 as acceptance |
| **Depends on** | Delivery slices A–G as needed for each scenario; may land with delivery PRs as evidence or as follow-on packet |
| **Likely files** | New/extended Playwright specs; readiness/setup/Home unit tests; `docs/design/history/<new-milestone>/` per historian workflow |
| **Risks** | Brittle CSS pins; claiming Complete on green CI alone; historian overwrite temptation |
| **Acceptance** | Required semantic scenarios run and cited; evidence classes labeled; non-claims explicit |
| **Auth** | Separate Rick tranche (tests-only auth still required) |

### Slice I — Owner gate

| Field | Content |
| --- | --- |
| **Purpose** | Human acceptance P25 cannot automate |
| **In scope** | §23 vocabulary call + copy pass (incl. QUICK_START); Ready row-2 fork; optional Reset-in-setup placement; deliberate MENUS playthrough (keyboard; Sony if hardware; multi-Game/draft; Resume after Start; Change Game; 0-team; declutter feel); fit judgment (1280×720 / Windows scaling if available); physical Sony re-qual if posture/copy changed; Windows only when S06/packaging authorizes; explicit non-claims receipt |
| **Out of scope** | Writing product code/tests; silently authorizing S04D/S06/S05 terminalization; NightWatch as STATUS override |
| **Depends on** | Slice H evidence packet (or equivalent merged semantic e2e); owner availability |
| **Acceptance** | Owner verdict recorded with named evidence; unrun physical/Windows stated NOT RUN |
| **Auth** | Owner only |

---

## 15. Sequencing rationale

```text
[Owner vocabulary soft-gate §23 #1]
        │
        ▼
   A  Host shell / posture / CTA removal / L0 / derived Resume
        │
        ├──────────► F  Ready selector + Display/sound honesty
        │              (may start after A; prefer after or with B hooks)
        ▼
   B  Readiness rows dial
        │
        ├──────────► E  Names/Sony/0-team (+ team-count; soft D)
        │
        ▼
   C  Home hierarchy ──serialize──► D  #110 Import/authoring harvest
        │
        ▼
   G  Change Game + recovery orientation
        │
        ▼
   H  Semantic acceptance + visual historian
        │
        ▼
   I  Owner gate (playthrough still paused until owner resumes)
```

**Why this order**

1. **A first** closes the largest ordinary-path defect (kitchen-sink Host +
   FC3) and removes the marketed dual entry that fights every later Home story.
2. **F with/after B** fixes FC4 without pretending rows exist; B without F
   leaves two-dominants half-fixed.
3. **E after B** so 0-team/Teams repair has a row to live in; authoring
   team-count soft-syncs with D.
4. **C then D** keeps Home hierarchy coherent before Import templates land;
   avoids Home-level template CTAs.
5. **G after A+C** needs identity header and a Home worth returning to.
6. **H after delivery** (or paired) — do not write tip-era semantic e2e as if
   IA already shipped.
7. **I last** — owner verdict; playthrough not auto-started.

**PR sizing:** Prefer one family per authorized PR (A alone is already large).
Do not combine A+B+C+D. Acceptable tight pairs under one auth only when file
overlap forces it (C∥D on `HomeRoute`; F early hooks inside B). Avoid
per-control micro-slices.

## 16. Semantic acceptance matrix

| Teacher job | Primary slices | Strongest tip proof today | MENUS proof target |
| --- | --- | --- | --- |
| Keyboard-only setup→Start→Host | A, B, E, H | Component typed names; e2e stops at setup entry | H Start-transition e2e types names + asserts Host panels |
| Sony (sim) | E, H | Unit honesty; sim e2e on bare `#/host` | H sim claim via `?play=`; physical = I / later |
| Multiple Games | C, H | Library flags; single-entry e2e | H multi-entry Home fixture |
| Draft vs class | C, H | Draft flags + Session recovery | H coexistence fixture + badge vocabulary |
| Recovery / Resume posture | A, G, H | Session e2e posture-blind | H FC3 Resume landing + A derivation |
| Change Game | G, H | Replace-confirm wiring untested as journey | H setup→Home→other Play |
| Optional readiness | F, B, H | `canStartPlay` unit strong | H/F matrix: optionals never block; skip UI |
| Ready + optionals open | F, H | FC4 two-dominants defect | H single-dominant Ready rule |
| 0-team | E, D/E, H | Blocker unit; panel unmounted | H mount + Edit path |
| Start transition | A, H | Wiring only | H semantic e2e + visual milestone |
| Back to setup | A, H | Pre-Play revisit only | H round trip; L0 unit |
| Direct Host compat | A, C, H | 22-file harness coupling | CTA demotion + bare default unchanged |

## 17. Owner gate

Before MENUS may be treated as early-workflow qualified:

1. Rick authorizes delivery tranches (A–G) and verification (H) explicitly.
2. Court §23 #1 vocabulary decided (and #2/#3 if owner wishes) before final
   copy ships.
3. Slice H required checks **run and cited**.
4. Slice I owner playthrough / verdict recorded — **not** auto-started by
   agents; remains paused until the owner resumes.
5. Physical Sony / Windows remain NOT RUN unless separately evidenced.
6. STATUS / CURRENT updates that claim MENUS product Complete require merge
   evidence + the above — planning and D04 storage alone never suffice.

## 18. Plan definition of done (this documentation tranche)

This planning document is satisfied when:

- [x] Exact D04-R1 ZIP bytes stored under
  `docs/design/reference-artifacts/claude-design/2026-09-28/` with verified
  size + SHA-256 + `unzip -t`
- [x] Claude Design index distinguishes Audience/Display (2026-09-27) vs MENUS
  D04-R1 (2026-09-28) with authority boundary
- [x] Design README has minimal discoverability routing
- [x] This plan records subordinate authority, product DoD, settled IA,
  qualification limits, #110 harvest rules, slices A–I with full fields,
  sequencing, acceptance matrix, owner gate, and authority language
- [x] Draft PR opened for Rick review (docs only; no product code; no merge)

Completing this plan DoD does **not** complete MENUS product work.

## 19. Authority language (binding reminders)

```text
AUTHORIZED later, per tranche, by Rick: MENUS delivery slices A–G, verification H, owner gate I
NOT AUTHORIZED by this file: product/src/css/test/Electron mutation; merge;
  mutate/close PR #110; S04D; S06; S05 terminalization; playthrough start;
  architecture/schema/PublicState changes; unpacking/recompressing D04 ZIP;
  treating D04 pixels as implementation DoD
```

S04A remains TERMINALLY COMPLETE. Harvest under MENUS is a **bounded repair /
recomposition**, not a Program reopen.

## 20. Stop points and handoff

Stop and return to Rick / Program routing if:

- `main` tip shows unexpected product drift vs this plan’s assumptions;
- a tranche would require Session schema / PublicState / lifecycle unmount
  changes;
- Home and Host edits cannot be serialized without an incoherent intermediate;
- #110 head/base drifts such that harvest dispositions must be re-opened;
- owner vocabulary forks block copy-final slices and no temporary vocabulary
  stub is accepted.

**Next Program-level actions remain owner-gated.** Suggested order after this
docs PR: owner vocabulary call → authorize Slice A → continue per §15.

---

## Related durable artifacts

| Artifact | Role |
| --- | --- |
| [`../design/reference-artifacts/claude-design/README.md`](../design/reference-artifacts/claude-design/README.md) | Package index |
| [`../design/reference-artifacts/claude-design/2026-09-28/CQS-MENUS-D04-REFERENCE.zip`](../design/reference-artifacts/claude-design/2026-09-28/CQS-MENUS-D04-REFERENCE.zip) | D04-R1 preferred evidence |
| [`../design/reference-artifacts/claude-design/2026-09-27/CQS-Claude-Design-Reference-Package.zip`](../design/reference-artifacts/claude-design/2026-09-27/CQS-Claude-Design-Reference-Package.zip) | Audience/Display preferred evidence |
| [`../CQS-DISPLAY-VISUAL-CONVERGENCE.md`](../CQS-DISPLAY-VISUAL-CONVERGENCE.md) | Display convergence (distinct surface) |
| [`CQS-REAL-MVP-ARC.md`](CQS-REAL-MVP-ARC.md) | Program plan of record |
| [`../STATUS.md`](../STATUS.md) | Program status (do not claim MENUS implemented here) |
