# CQS Display visual convergence

- **Objective:** pre-owner-playthrough Audience / Display visual convergence
- **Authorized base:** `4678c9223f8fa7e7129dca6d2a86ea9c6a0cef30`
- **Reconciled with `main` through:** `2383c40fc586c9820800b0f5949d4a2fbbc66b1f` (PR #109 — durable identity, sync stream authority, completion boundary) via non-destructive merge; see §8
- **Working branch:** `feat/display-visual-convergence`
- **Status:** ACTIVE — Claude Design reference artifacts are now open/rendered (see §9); fidelity COURT A–F re-run against real pixels (see §10). No MATERIAL MISMATCH required new implementation this pass — the prior reference-fidelity repair pass already converges faithfully, confirmed against the actual reference images rather than a prose description. **Not** Complete; S05 **not** terminal; playthrough remains paused until owner resumes (do not auto-start playthrough)
- **Authority:** repository implementation/contracts remain authoritative; uploaded Claude Design artifacts are preferred design evidence, not source code or product authority
- **Typography posture:** system stacks only — sans/display for numeric/UI; `ui-serif` reading voice for questions; `ui-monospace` for status/data; no remote/bundled fonts
- **Signal Rail posture (owner/DevPM binding):** thin public team-channel rail **and** adaptive Score Column/Strip/Deck coexist; rail does not replace scores

## 1. Definition-of-done ledger

| Obligation | State |
| --- | --- |
| Claude artifacts inventoried | VERIFIED — opened and rendered; immutable package now committed at [`design/reference-artifacts/claude-design/2026-09-27/CQS-Claude-Design-Reference-Package.zip`](design/reference-artifacts/claude-design/2026-09-27/CQS-Claude-Design-Reference-Package.zip) (215071 bytes; SHA-256 `730573b599d00f6c3731539ed43ff1798cbd88db1d072334b1811e3b273261f0`); Drive file id `1-xxDu-PwLRRHTAFw45IFYzZ-bPUx3NzN` remains secondary provenance; see §9 |
| Current canonical Display implementation observed | VERIFIED |
| Phase 2B direction reconciled | VERIFIED |
| Current S05 visual historian inspected | VERIFIED (`2026-09-s05-complete`, immutable) |
| Discrepancy matrix | VERIFIED |
| Bounded implementation plan | VERIFIED |
| Presentation-only convergence implementation | VERIFIED (CSS + presentation selector dedupe) |
| 720p / 1080p / 1–8 team stress verification | VERIFIED — gated review captures + workflow gap e2e + Score Column geometry repair |
| Reduced-motion / high-contrast verification | VERIFIED — theme/S05-F1 suite + HC/RM review frames |
| Integrated COURT review | VERIFIED — Hearing 7 evidence-closure + near-MVP polish COURT (8 questions) |
| Authoritative coverage matrix | VERIFIED — agent-store matrix (unit vs browser vs visual classes) |
| System-font canon + Display typography inventory | VERIFIED — Option A scale/weight/spacing; inventory in agent store |
| Near-MVP machine-evaluable visual polish exhausted | VERIFIED — typography/formatting/visual COURT; remaining items owner-only/physical |
| Post-convergence historian milestone | DEFERRED TO LATER AUTHORIZED QUALIFICATION — owner gate after playthrough |
| Owner-playthrough candidate handoff | OWNER PLAYTHROUGH PENDING — presentation tranche READY (agent-store repair-pass); not merged; S05 not terminal; do not start playthrough until owner resumes |

## 2. Evidence hierarchy

1. observed merged code, tests, configuration and Git history;
2. CQS product contract, current REAL MVP canon, accepted ADRs and UX doctrine;
3. accepted Phase 2B Audience direction;
4. current S05 historian archive;
5. uploaded Claude Design artifacts as preferred visual evidence.

The existing `2026-09-s05-complete` historian archive is immutable.

## 3. Current vs preferred discrepancy matrix

| Area | Current S05 candidate | Preferred direction | Why it matters | Ownership | Classification |
| --- | --- | --- | --- | --- | --- |
| Display shell | vertically stacked application-style header + content + footer | one broadcast-stage composition with identity, central Nexus, primary gameplay and rail | stronger center of gravity and distance reading | `AudienceDisplayShell.css` | IMPLEMENT BEFORE OWNER PLAYTHROUGH |
| Top region | product/status lines all centered above Nexus | public-safe identity left, Nexus centered, coarse context right | makes Nexus the persistent answer to “where are we?” | shell / Nexus | IMPLEMENT |
| Authored game/class identity | not present on public wire by design | Claude examples show authored game/class identity | copying it would cross privacy/PublicState boundary | PublicState + shell | PRESERVE COMPATIBILITY; do not implement |
| Board prominence | readable board inside a rounded application panel | board is the stage; stronger bounded tiles and header rules | board should dominate rather than feel embedded in a dashboard | `CategoryBoardDisplay.css` | IMPLEMENT |
| Scores | correct adaptive layouts, but strip/deck cards consume excessive height | compact, stable, secondary score readouts | returns vertical budget to gameplay while preserving 1–8 teams | `TeamScoreboard.css` | IMPLEMENT |
| Nexus Core | functionally complete, but visually one more centered bar | persistent visual anchor in top composition | establishes stable public status locus | shell / Nexus CSS | IMPLEMENT |
| Signal Rail | full-width status card with little signature distinction | compact/expanded/Final stage band, visually consistent across states | common learned status object | shell / SignalRail CSS | IMPLEMENT |
| Prompt reading | safe and legible, but framed as a large centered card | quiet cognition: broad reading stage, reduced chrome | shared attention belongs on the question | board/media CSS | IMPLEMENT |
| Correct/incorrect/pass | durable truth is present but consequence can collapse to a thin status line | bounded consequence band, still subordinate to prompt when appropriate | game-show feedback without chaos | BoardOutcome CSS | IMPLEMENT |
| Final | semantics complete; setup/reveal can feel sparse/generic | deliberate full-stage Final posture | Final should feel like a distinct game phase | Final CSS | IMPLEMENT |
| Winner/completion | correct result but generic panel treatment | ceremonial, photographable, bounded completion | earned spectacle and clear closure | Final CSS | IMPLEMENT |
| Motion | remount-safe semantic acknowledgements already implemented | quiet cognition + bounded consequences | preserve lifecycle truth; do not replace with decorative continuous motion | existing S05 choreography | PRESERVE |
| Future round types | shell primitives already separate from category board | keep shell/Nexus/scores/rail generic | avoid category-board-only architecture | audience shell | PRESERVE |
| High contrast / reduced motion | explicit existing modes and tests | retain full semantic parity | accessibility is structural | tokens/tests | PRESERVE + VERIFY |

## 4. Bounded implementation plan

### Reference convergence

1. Recompose the active header using CSS into left public-safe identity, centered Nexus Core and right public game context.
2. Reduce score-card footprint while preserving adaptive Column / Strip / Deck modes, authored order, long names and negative scores.
3. Strengthen board geometry with restrained square/bounded surfaces and category structural rules.
4. Turn open-clue presentation into a broader reading stage with less card chrome.
5. Give Signal Rail a consistent structural band treatment without inventing public queue data.
6. Make durable board outcomes visibly consequential even after transient acknowledgement ends.
7. Give Final and completion a full-stage hierarchy, with stronger winner emphasis.
8. Suppress duplicate Nexus round/stage labels (e.g. ended game “Game complete”).
9. Visually retire accessible page title and Nexus brand from the active broadcast stage while keeping them available to AT / waiting scenes.

### CQS-specific improvements

- Keep the existing semantic/remount-safe S05 motion ownership rather than copying prototype-only animation.
- Keep the accepted two-theme token system and no new font/dependency.
- Keep Score Column / Strip / Deck thresholds from accepted Phase 2B, even where an individual Claude frame shows only four teams.
- Keep used-state text and non-color structure rather than relying on dimming alone.
- Prefer left product identity over duplicating brand inside the Nexus during active play.

## 5. Intentional deviations from Claude references

### Authored game/class identity

The public DTO intentionally omits the game title, round identifiers/labels and authored configuration. The convergence therefore uses only already-public product/session context in the top region. Publishing authored identity would require a separate PublicState/privacy decision and is outside this tranche.

### Typography

Claude prototypes use externally loaded typefaces. CQS keeps the existing dependency-free system typography for this tranche. Typography hierarchy and density converge without introducing a remote/runtime dependency.

### Projector environment

The accepted Slice 17 design-system direction specifies the flat projector canvas. This tranche does not restore prototype-only ambient motion or decorative effects that would compete with quiet cognition.

## 6. COURT hearing 1 — composition and spatial ownership

**Question:** What is the highest-value convergence work before owner playthrough?

**Evidence:** current S05 historian, current shell/component code, accepted Phase 2B direction, Claude Phase 1/2 examples and CQS UX doctrine.

**Finding:** current implementation is semantically strong and stress-safe but still reads as a styled application page. The target should read as one student-facing broadcast stage. The largest material gaps are shell hierarchy, score density, Nexus centrality, prompt chrome, consequence weight and Final/completion staging.

**Decision:** proceed with presentation-only CSS convergence. Do not change PublicState, schemas, sync, reducers, scoring, persistence or round registry. Preserve the current lifecycle-safe choreography.

**Owner gate:** none required for this tranche. Any later proposal to publish authored game/class identity or change an accepted score-layout rule requires Rick's decision.

## 7. Verification requirements

The candidate must preserve the repository-defined checks and the existing evidence around:

- Audience privacy and fail-closed rendering;
- category board flow;
- buzz and active-claim flow;
- board outcomes;
- Final and completion;
- recovery;
- 1920×1080 and 1280×720;
- 1–8 teams;
- schema-max/long content;
- negative/extreme scores;
- high contrast;
- reduced motion;
- clipping and overflow.

No green test substitutes for the final integrated COURT review or owner playthrough.

Review captures (non-historical):

```bash
CQS_DISPLAY_VISUAL_REVIEW=1 npx playwright test \
  tests/e2e/display-visual-convergence-review.spec.ts \
  --project=desktop-1080p --project=projector-720p
```

Outputs land under `test-results/display-visual-review/` and must not overwrite
`docs/design/history/2026-09-s05-complete/`.

## 8. Reconciliation with `main` (post-#109)

`main` moved 5 commits ahead of this branch's authorized base after PR #106 was
opened, most substantively PR #109 (durable Host-stream identity, sync
envelope v3 / leader-only publishing, completion-boundary UNDO rejection).

- Reconciliation method: ordinary `git merge origin/main` into
  `feat/display-visual-convergence` (no rebase, no history rewrite).
- Result: clean auto-merge, zero textual conflicts (only file additions from
  `main` plus two small line-level overlaps in
  `tests/e2e/audience-display.spec.ts` and `src/theme/themeIsolation.test.ts`,
  both auto-resolved correctly — verified by hand below).
- `tests/e2e/audience-display.spec.ts`: PR #109's `schemaVersion: 3` /
  `hostStreamId: 'e2e-test-stream'` envelope fields and this PR's Signal Rail
  channel-strip assertions both landed intact after the merge.
- `src/theme/themeIsolation.test.ts`: PR #109's `SYNC_SCHEMA_VERSION` bump to
  `3` is preserved; this branch never touched that assertion.
- Post-merge verification: `npm run lint`, `npm run typecheck`, `npm run
  test:run` (2813 passed / 1 pre-existing environment flake unrelated to this
  branch — see the handoff for detail), and targeted Playwright suites
  (`audience-display`, `theme-system`, `final-wager`, `sync`, both
  `display-visual-convergence-*` specs, all `s05-*` choreography/authority/
  readability specs) all green on the reconciled head at both
  `desktop-1080p` and `projector-720p` where the spec is not viewport-scoped.
- No conflicts touched PublicState shape, sanitization, reducer semantics,
  scoring, persistence, round registry, or the Game/Session distinction. No
  architecture escalation was required.

## 9. Claude Design evidence — opened and rendered

Prior attempts in this reconciliation (recorded in agent-store history) were
correctly BLOCKED: the store, this PR's description/comments, the repository,
and Google Drive title search all genuinely had no accessible artifact at
that time. One attempt in between falsely claimed the artifacts had been
opened from a store path that did not exist; that claim was reverted.
That earlier review blockage **before bytes were available** remains the
historical account; it is not rewritten.

The owner then supplied the exact Google Drive **file ID** (not a title
search) for a restored package:

- File: `CQS-Claude-Design-Reference-Package-restored.zip`
- Drive file id: `1-xxDu-PwLRRHTAFw45IFYzZ-bPUx3NzN`
- Size: 215,071 bytes (independently confirmed via `get_file_metadata` and the
  downloaded byte count — exact match)

Downloaded via the Drive MCP `download_file_content` by exact id, saved and
unpacked under the Project Agent Store at
`media/display-visual-convergence/claude-refs/` (`unpacked/`, plus a
`render/` working copy and `render-proof/` screenshots used only to prove
openability).

**CURRENT durable store (repository):** the same byte-identical package is
now committed as an immutable reference artifact:

- Path: [`design/reference-artifacts/claude-design/2026-09-27/CQS-Claude-Design-Reference-Package.zip`](design/reference-artifacts/claude-design/2026-09-27/CQS-Claude-Design-Reference-Package.zip)
- Size: `215071` bytes
- SHA-256: `730573b599d00f6c3731539ed43ff1798cbd88db1d072334b1811e3b273261f0`
- Index: [`design/reference-artifacts/claude-design/README.md`](design/reference-artifacts/claude-design/README.md)
- Drive file id `1-xxDu-PwLRRHTAFw45IFYzZ-bPUx3NzN` remains secondary provenance only

Do not overwrite that dated folder. Later packages get new dated folders.
Inspect via `unzip` to a temp directory; do not modify the committed ZIP.

**All four source families were independently proven to open and render**,
not merely unzipped:

| Family | File(s) | Proof |
| --- | --- | --- |
| 1. Phase 0/1 creative directions | `CQS Directions.dc.html` | Served over local HTTP, loaded in headless Chromium (Playwright), HTTP 200, real DOM text extracted ("CLASSROOM QUIZ SHOW … PHASE 0 AUDIT · PHASE 1 CREATIVE DIRECTIONS …"), 14 full-viewport section screenshots taken and visually inspected |
| 2. Phase 2 interactive prototype | `CQS Prototype2.dc.html` | Same method; DOM text ("CQS PHASE 2 PROTOTYPE … NEXUS BROADCAST × SESSION MEMORY … 01 DORMANT … 19 ROUND END …"), full-page + sectioned screenshots inspected |
| 3. Phase 1 design-direction package | `Phase 1 design directions delivered.zip` → `phase1/` (`CQS Directions.dc.html`, `CQS Prototype.dc.html`, `support.js`, `.thumbnail`) | Zip verified with `unzip -l` (4 files, sizes match); `.thumbnail` confirmed real WebP image via `file`; both `.dc.html` files rendered identically to families 1–2 (byte-identical content) |
| 4. Slice 17 Design System package | `CQS Slice 17 Design System.zip` → `slice17/` (2 `.dc.html` mockup files, `CQS-SLICE-17-DESIGN-SYSTEM.md`, `CQS-SLICE-17-FINAL-REPORT.md`, `github.md`, `support.js`, `.thumbnail`) | Zip verified with `unzip -l` (7 files, sizes match); both `.dc.html` rendered (sectioned screenshots, 12 sections); both `.md` files read in full |

Rendering method: the `.dc.html` files are self-contained "design canvas"
documents (`<x-dc>` custom element + `support.js`) referencing Google Fonts by
URL. The two top-level standalone files ship without their own `support.js`
(the outer zip only bundles it alongside the nested `phase1`/`slice17`
zips); a `support.js` copy was placed next to them in a **separate `render/`
working copy** (the pristine `unpacked/` tree was left untouched) purely to
resolve the relative `<script src="./support.js">`. All rendering happened
against a local Python `http.server` over `localhost`, in headless Chromium
via Playwright — no network egress beyond the already-permitted Google Fonts
CDN preconnect (fonts are decorative in the reference and not adopted; see
§10 Hearing B).

This is genuine, CQS-specific content, not generic filler: category names
("Cells", "Natural Selection", "DNA & Proteins"), team names ("Mitochondria
Mafia", "The Keystones", "Trophic Cascade"), and terminology ("Nexus
Broadcast", "Signal Rail") that already appears verbatim in this document's
§3 discrepancy matrix and in the shipped `SignalRail.tsx` component — strong
independent confirmation this is the real source material the prior
convergence work was built from, not a fabrication.

## 10. Fidelity COURT A–F (re-run against real pixels)

Compared side-by-side: the rendered Claude reference screenshots above
against fresh current-Display captures
(`test-results/display-visual-review/desktop-1080p/**`, generated this
session against the reconciled head) and direct reads of the shipped
CSS/components. Classifications: `FOLLOW CLAUDE` / `ADAPT CLAUDE` /
`REJECT CLAUDE` (per §5 framing) — noted below where each maps to the brief's
`MATCHES DIRECTION` / `CQS-SPECIFIC IMPROVEMENT` / `MATERIAL MISMATCH` /
`OWNER PREFERENCE REQUIRED` vocabulary.

**A. Board scale + broadcast stage** — `FOLLOW CLAUDE` (`MATCHES DIRECTION`).
Direction 1a ("NEXUS BROADCAST", explicitly marked `RECOMMENDED` in the
source's own self-critique, with the competing 1b "graph, not grid" board
explicitly named the "strongest rejected alternative" for legibility risk)
uses a flat luminous tile grid with category headers, point values, and a
bottom team rail — structurally identical to the shipped
`CategoryBoardDisplay`/`TeamScoreboard` grid (`board/pristine.png`). The
source's own verdict already rejects the graph-board alternative CQS never
implemented, so there is no live mismatch to adjudicate.

**B. Typography** — `REJECT CLAUDE` (fonts) + `FOLLOW CLAUDE` (hierarchy)
(`CQS-SPECIFIC IMPROVEMENT`). The reference loads Archivo, Source Serif 4,
Space Grotesk, Newsreader, Chivo, Literata, IBM Plex Mono, and JetBrains Mono
from Google Fonts (confirmed reading the `<link>` tags in the rendered
`<head>`). CQS deliberately keeps its existing dependency-free system-font
stacks (`--font-mono` / `--font-reading`,`--font-serif` / `--font-sans`,
`--font-display`) — grep-confirmed in `BuzzQueueDisplay.css`,
`CategoryBoardDisplay.css`, `FinalWagerDisplay.css`, `MediaContentDisplay.css`,
`TeamScoreboard.css` — reproducing the reference's exact three-voice
hierarchy (mono for status/data, serif for reading, sans/display for
numeric/UI) without a remote font dependency. This was already the
documented decision in §5; it is now confirmed against the actual reference
fonts rather than a description of them.

**C. Signal Rail** — `ADAPT CLAUDE` (`CQS-SPECIFIC IMPROVEMENT`). The
reference's rail conflates team channel + live score into one row
(`Mitochondria Mafia 1,400 ready`, `mockups-section-6.png`'s
`Crimson Comets −200 / Azure Owls 1200 / …` score-card row). CQS's shipped
`SignalRail.tsx` (doc comment: *"a thin spanning team-segmented channel rail
… this rail does not replace scores"*) deliberately keeps the rail and the
adaptive Score Column/Strip/Deck as two separate objects — the already-
adjudicated owner/DevPM binding recorded at the top of this document. Reason
confirmed against the real reference this time: the reference's merged
rail+score row is shown with 4 short team names; CQS's real stress range is
1–8 teams with up to 40-character authored names (`MAX_TEAM_NAME_LENGTH`),
which a single merged row cannot hold. Adapting rather than copying is the
right call, not an unaddressed gap.

**D. Nexus + shell chrome** — `ADAPT CLAUDE` (`CQS-SPECIFIC IMPROVEMENT`).
The reference embeds round/tile-count chrome (`ROUND 1 OF 2`, `22 TILES
LEFT`) inside the board card's own header. CQS's shipped shell keeps that
context in the shell-level Nexus strip, separate from the board
(`shell/waiting.png`, `board/pristine.png`), because the shell/Nexus/rail
primitives must stay generic across future non-board round types (an
existing, already-documented PRESERVE invariant in §3). Embedding it in the
board card would violate that invariant for no visual gain the reference
itself requires.

**E. Final + winner** — `FOLLOW CLAUDE` + `ADAPT CLAUDE`
(`CQS-SPECIFIC IMPROVEMENT`). The reference's Direction 1a ceremonial winner
frame (`directions-section-3.png`: large centered name + score, "CHAMPION
CHANNEL", ranked runner-ups, "NEXT ROUND"/"REPLAY BOARD" **host** buttons) and
Slice 17's current-composition Final frame (`mockups-section-8.png`: a
"WINNER" badge inline in the score-card row) both directly parallel the
shipped `completion/winner.png` (soft radial-glow ceremonial card, "WINNER —
RED TEAM — 500", persistent top-left score list functioning as the
always-visible equivalent of the reference's runner-up list). The reference's
host-only replay/next-round controls are correctly absent from the public
Display, which is read-only by architecture.

**F. Quiet cognition + projector distance** — `FOLLOW CLAUDE`
(`MATCHES DIRECTION`). The reference's "bounded consequence band, still
subordinate to prompt when appropriate" language (already in §3) is
concretely realized in the shipped `BoardOutcomeDisplay.css`: a durable,
color-coded, left-bordered band (`.bod:not(.bod--secondary)`, up to `72rem`
wide, `--state-success`/`--state-danger` wash) plus a distinct transient
acknowledgement animation — bold and persistent like the reference's outcome
treatment, but bounded rather than a full-bleed screen-wide banner, which
avoids reading as a Host-only alert bleeding onto the public Display. This is
a deliberate, already-implemented restraint, not an unaddressed gap.

**Slice 17 contrast-token cross-check** (informs B/F): the R1 final report's
exact-value table (`CQS-SLICE-17-FINAL-REPORT.md` §7) was checked token-for-
token against the shipped `src/styles/themes.css`. `--border-standard:
#5a86ab`, `--border-strong: #7d9dbd`, `--border-disabled: #7d8b99`,
`--fg-disabled: #9aa9b8`, and the primary-accent repair target `#0f5fb0`
(shipped as `--state-accent-strong`) all match the report's prescribed "Now"
values exactly. The report's rejected `--state-timer-warning` token does not
exist anywhere in the codebase (`grep` — zero matches), and no
`button:disabled { opacity: … }` whole-control-opacity pattern exists in the
host CSS — both match the report's repair exactly. This independently
corroborates that the contrast-driven token repairs were already faithfully
carried into the shipped theme, not merely described.

**Verdict: no `MATERIAL MISMATCH` found.** Every meaningful discrepancy
already has a FOLLOW/ADAPT/REJECT classification with concrete evidence on
both sides (reference render + shipped code/screenshot), and every departure
from the reference is a previously-documented, deliberate, justified choice —
now confirmed against the actual pixels rather than a memory of them. No new
Display implementation was required or performed this session as a result of
this COURT. No `OWNER PREFERENCE REQUIRED` question arose: none of the
differences found rise to "two genuinely different visual directions" or a
"consequential departure" per the owner-interaction policy — they are
routine, already-adjudicated adaptations.
