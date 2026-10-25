# T2 — Host one-second ops repair (CANON-H-06 / H-11 / H-07 / H-08)

- **Authorization:** Owner-authorized Design Court repair tranche **T2**
  (brief:
  `/cursor/stores/bc-e9fd1a48-7435-4da4-8745-60b0b14e7963/internal/ui-design-court/t2-repair-brief.md`)
- **Base:** `origin/main` `958ac8f2dfab51bcc4c25264ddbf93024fd241dd` (MATCH, clean; T1 landed)
- **Kind:** Host presentation / hierarchy only — no reducer, scoring math,
  clue lifecycle, timer/buzz policy, team identity, Final rules, persistence,
  PublicState, privacy, sync, session, or undo changes
- **Merge:** **NOT AUTHORIZED** in this packet

## Findings repaired

| ID | Category | Repair |
| --- | --- | --- |
| **CANON-H-06** | FRICTION | Pre-round Host keeps glanceable scoreboard + “Start Round 1…” next-beat copy; scoring target / manual correction / history tucked in a closed disclosure. |
| **CANON-H-11** | RISK | Inactive Arm/Timer walls deferred until prompt is live; Mark correct/incorrect/pass deferred until a team has buzzed. Status + recovery Reset remain. |
| **CANON-H-07** | RISK | Mid-play **End the game** uses quiet danger chrome (`btn--quiet-danger`); board-complete End stays primary. Confirm ceremony unchanged. |
| **CANON-H-08** | DEFECT | “On the display now” badge uses solid `--state-accent-strong` fill + `--fg-on-accent-fill` text (not white-on-cyan wash). |

## Code / test scope

- `src/host/TeamScoringPanel.tsx` + `.css` (+ focused tests)
- `src/host/ResponseTimerHostPanel.tsx` (+ focused tests)
- `src/host/LocalInputHostPanel.tsx` (+ focused tests)
- `src/host/RoundProgressHostPanel.tsx` (+ focused tests)
- `src/host/CategoryBoardHostPanel.css` (+ focused badge test)
- `src/styles/global.css` (`btn--quiet-danger`)

## Before / after evidence

Viewports: teacher-laptop 1366×768, 1080p 1920×1080, 720p 1280×720 (DPR 1,
light, reduced motion, fonts awaited). States: host-pre-round, host-board,
host-clue (SELECTED).

- Before:  
  `/cursor/stores/bc-e9fd1a48-7435-4da4-8745-60b0b14e7963/media/ui-design-court/t2-before-after/before/`
- After:  
  `/cursor/stores/bc-e9fd1a48-7435-4da4-8745-60b0b14e7963/media/ui-design-court/t2-before-after/after/`
- Manifests:  
  `/cursor/stores/bc-e9fd1a48-7435-4da4-8745-60b0b14e7963/internal/ui-design-court/t2-before-manifest.json`  
  `/cursor/stores/bc-e9fd1a48-7435-4da4-8745-60b0b14e7963/internal/ui-design-court/t2-after-manifest.json`

## Local verification (author)

| Check | Result |
| --- | --- |
| `git diff --check` | clean |
| `npm run verify` | pass (lint + typecheck + 3204 unit tests) |
| Exact-head GitHub CI | observe on open PR tip — not predicted here |

## Explicit non-claims

- Not merged; not owner acceptance; not physical classroom / S06.
- Functional Courts A/B not reopened.
- T3–T5 not started; T1 not regressively reopened.
- Independent review not self-certified (separate reviewer required).
- Docket HIGH IDs remain until independent review + owner merge instruction
  naming PR number **and** exact head SHA.
- Brief title strings (“Board scale / Signal rail / Nexus / Final ceremony”)
  do not match docket CANON-H definitions; repairs follow docket source of truth.
