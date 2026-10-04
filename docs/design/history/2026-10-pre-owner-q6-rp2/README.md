# Visual history — pre-owner Q6-RP-2 (ordinary live path)

- **Archive id:** `2026-10-pre-owner-q6-rp2`
- **Milestone:** Pre-owner visual refresh after landed Q6-RP-2 (ordinary Round 1 / live Undo / truthful Display lifecycle)
- **Repository:** `ricktron/classroom-quiz-show`
- **Canonical implementation SHA (product UI under archive):** `9410b6290a6dcb2f971e66da8173c3b44a6f785a`
- **Date (UTC):** 2026-10-04
- **Program status at capture (recorded, not mutated):** S05 parent **OPEN / NOT TERMINAL**; S04D / S06 **NOT AUTHORIZED**; REAL MVP **not** complete
- **Court A:** **COMPLETE** (at RP-2 land)
- **Court B:** **RECOMMEND ELIGIBLE** (at RP-2 land)
- **Owner playthrough / `OWNER-PLAYTHROUGH-ELIGIBLE`:** **NOT ISSUED**
- **PRE-Q7:** **NOT ISSUED** (separate DevPM verdict)
- **Evidence class for committed PNGs:** `AUTOMATED-CAPTURE` / BROWSER-RENDERED Playwright

This folder is a **visual historical atlas** of Classroom Quiz Show after Q6-RP-1
(G1 ordinary round progression + G2 truthful Display status) and Q6-RP-2
(G3 ordinary live Undo / HG-13) landed on `main`.

It is **not** implementation authority, owner acceptance, PRE-Q7 eligibility,
or physical classroom qualification.

```text
implementation SHA (product UI)
  ≠ historian branch head (capture infra + docs)
    ≠ owner acceptance / OWNER-PLAYTHROUGH-ELIGIBLE
      ≠ PRE-Q7 DevPM verdict
        ≠ physical classroom qualification (S06 / Windows / projector / Sony)
```

## What this archive proves

- Browser-rendered ordinary teacher workflow surfaces at implementation SHA
  `9410b6290a6dcb2f971e66da8173c3b44a6f785a`, including:
  - Home / import / authoring / recovery
  - Class Setup names + Ready
  - Focused Host with ordinary **Start Round 1** (`rph-start`)
  - Display lifecycle detail: Waiting for the first round → Playing → Game complete
  - Board, clue, buzz/claim, incorrect, **ordinary live Undo**, scoring
  - Round transition (**Go to the Final**), Final, winner/completion
  - Reduced-motion + laptop + sim125 stress viewports
- Host-private versus Display-public boundaries on synthetic Q3 content
- Ordinary path only — Advanced diagnostics were not used for gameplay

## What this archive explicitly does **not** prove

- Owner aesthetic acceptance or playthrough completion
- `OWNER-PLAYTHROUGH-ELIGIBLE` or PRE-Q7
- Electron shell chrome, Windows teacher runtime, classroom projector,
  Sidecar dual-display, physical Sony controllers, or physical audio
- S05 parent terminalization, S04D, or S06

## Contents

| Path | Role |
| --- | --- |
| [`CQS-VISUAL-SURFACE-ATLAS.md`](CQS-VISUAL-SURFACE-ATLAS.md) | Per-surface atlas with screenshots / deferred slots |
| [`CAPTURE-MANIFEST.json`](CAPTURE-MANIFEST.json) | Machine-readable census + authority classification |
| [`OWNER-CAPTURE-CHECKLIST.md`](OWNER-CAPTURE-CHECKLIST.md) | Surfaces automation cannot truthfully capture |
| [`screenshots/`](screenshots/) | Committed historical PNGs (synthetic content only) |

## Historian integrity rules

1. Historical screenshots are **immutable milestone evidence**.
2. Do **not** update an old image merely because the UI changed later.
3. New UI state gets a **new milestone archive**, not an overwrite of this one.
4. **Never overwrite** [`../2026-09-s05-complete/`](../2026-09-s05-complete/) or
   [`../2026-09-menus-pre-owner-gate/`](../2026-09-menus-pre-owner-gate/).
5. Historical images are **not** implementation authority.
6. Do **not** include real student/class data — synthetic/demo content only.
7. Every screenshot is attributable to implementation SHA
   `9410b6290a6dcb2f971e66da8173c3b44a6f785a`.
8. Automated and human/local captures must be clearly distinguished.
9. **Browser captures are not evidence** of Electron, Windows, projector,
   Sidecar, physical Sony, or physical audio behavior.

## Capture method

Automated captures use the production-preview Playwright path and authentic
Home → Class Setup → Start → ordinary Round 1 / Undo / Final journeys with
synthetic Q3 / demo data.

```bash
npm run capture:visual-history:pre-owner
```

Ordinary `npm run test:e2e` does **not** rewrite these images
(`CQS_PRE_OWNER_VISUAL_HISTORY_CAPTURE` must be `1`).

Legacy commands `npm run capture:visual-history` and
`npm run capture:visual-history:menus` remain fail-closed provenance guards for
the immutable S05 and MENUS archives.

### Viewports

| Label | CSS box | Role |
| --- | --- | --- |
| Primary | `1280×720` | Core Host/Home/setup/Display captures |
| Laptop | `1366×768` | Secondary laptop hierarchy |
| sim125 | `1093×542` | D04 Windows 125% Host simulation (browser CSS only — not OS zoom) |

### Ordinary teacher path recorded

```text
Home (empty) → Import / New Game authoring → populated Home → recovery Home
  → Class Setup Names → Ready → Start Game
  → focused Host (Start Round 1) + Display (Waiting for the first round)
  → ordinary Round 1 board → clue → buzz/claim
  → Incorrect → ordinary live Undo → continue adjudication → scoring
  → Go to the Final → Final → winner / Game complete
```

## Next human evidence step

Separate DevPM **PRE-Q7** eligibility verdict (not issued by this archive).
Owner playthrough remains gated; physical/native slots remain deferred per
[`OWNER-CAPTURE-CHECKLIST.md`](OWNER-CAPTURE-CHECKLIST.md).
