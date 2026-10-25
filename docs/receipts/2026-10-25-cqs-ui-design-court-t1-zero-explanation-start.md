# T1 — Zero-explanation start repair (CANON-H-01 / H-10 / H-05)

- **Authorization:** Owner-authorized Design Court repair tranche **T1**
  (brief:
  `/cursor/stores/bc-e9fd1a48-7435-4da4-8745-60b0b14e7963/internal/ui-design-court/t1-repair-brief.md`)
- **Base:** `origin/main` `47902101b55db744c533094cd176ff93fe9dd18e` (MATCH, clean)
- **Kind:** teacher-facing UI honesty / hierarchy only — no reducer, persistence,
  lifecycle, readiness-policy gate, input-authority, projection, or destructive-policy
  changes
- **Merge:** **NOT AUTHORIZED** in this packet

## Findings repaired

| ID | Category | Repair |
| --- | --- | --- |
| **CANON-H-01** | DEFECT | Class Setup slot titles use `Team N` (matching Host/Display until Session name claimed). Game-authored defaults (e.g. Blue Basalts) no longer appear as named headers while “0 of 2 named” blocks Start. |
| **CANON-H-10** | FRICTION | Home Import cold-start: **Import demo game** is the sole solid primary; template downloads and file/spreadsheet import are secondary; lead copy points at demo first. |
| **CANON-H-05** | FRICTION | Ready heading is **Required setup complete** while optional Display/Buzzers/Sound remain unfinished; **✓ Ready** only when those optional facts are settled. Display remains optional — Start Game stays enabled. |

## Code / test scope

- `src/host/ClassroomSetupPanel.tsx` (+ focused tests)
- `src/routes/HomeRoute.tsx` (+ focused tests)
- `tests/e2e/court-b-b-pending-name-start.spec.ts` (Ready wording)
- `tests/e2e/menus-bf-readiness.spec.ts` (Ready wording)

## Before / after evidence

Same viewport/states as Court baseline teacher-laptop shots (1366×768, DPR 1, light,
reduced motion):

- Before (copied from frozen baseline):  
  `/cursor/stores/bc-e9fd1a48-7435-4da4-8745-60b0b14e7963/media/ui-design-court/t1-before-after/before/`
- After (captured on this branch tip):  
  `/cursor/stores/bc-e9fd1a48-7435-4da4-8745-60b0b14e7963/media/ui-design-court/t1-before-after/after/`
- Manifest:  
  `/cursor/stores/bc-e9fd1a48-7435-4da4-8745-60b0b14e7963/internal/ui-design-court/t1-after-manifest.json`

Surfaces: `home-empty`, `home-import`, `setup-names`, `setup-ready`.

## Local verification (author)

| Check | Result |
| --- | --- |
| `git diff --check` | clean |
| `npm run verify` | pass (lint + typecheck + 3200 unit tests) |
| Exact-head GitHub CI | observed on the open PR tip — not predicted here |

## Explicit non-claims

- Not merged; not owner acceptance; not physical classroom / S06.
- Functional Courts A/B not reopened.
- T2–T5 not started.
- Independent review not self-certified (separate reviewer required).
- Docket HIGH IDs remain until independent review + owner merge instruction
  naming PR number **and** exact head SHA.
