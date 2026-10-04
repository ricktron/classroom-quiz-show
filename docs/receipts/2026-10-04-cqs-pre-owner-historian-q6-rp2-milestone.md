# Pre-owner historian milestone — Q6-RP-2 ordinary live path

- **Date:** 2026-10-04
- **Authorization:** `AUTHORIZE-CQS-Q6-RP2-LANDING-AND-PRE-OWNER-HISTORIAN-1`
  (continues `AUTHORIZE-CQS-PRE-OWNER-HISTORIAN-CAPTURE-REFRESH-1`)
- **Kind:** visual historian milestone archive
- **Archive:** `docs/design/history/2026-10-pre-owner-q6-rp2/`
- **Canonical implementation SHA:** `9410b6290a6dcb2f971e66da8173c3b44a6f785a`
  (PR #136 squash / landed Q6-RP-2 product identity)
- **Prior archives:** S05 and MENUS **untouched**

## What was captured

- New archive directory + capture harness
  (`npm run capture:visual-history:pre-owner`,
  `CQS_PRE_OWNER_VISUAL_HISTORY_CAPTURE=1`)
- 31 automated browser PNGs on the ordinary teacher path, including:
  - Home / import / authoring / recovery
  - Class Setup Names + Ready
  - Focused Host **Start Round 1** (`rph-start`)
  - Display lifecycle: Waiting for the first round → Playing → Game complete
  - Board, clue, buzz/claim, Incorrect, **ordinary live Undo**, scoring
  - Round transition, Final, winner/completion
  - Reduced-motion + 1366 + sim125 stress viewports
- Synthetic Q3 / demo data only; Advanced diagnostics unused for gameplay
- Host-private versus Display-public boundaries asserted during capture

## Deferred / not claimed

| Class | Count | Examples |
| --- | --- | --- |
| LOCAL-DESKTOP / OWNER-HARDWARE | 3 | Electron chrome, Sidecar, physical Sony |
| S06-DEFERRED | 4 | Windows, projector, physical audio, screen reader |

Browser captures are **not** Electron / Windows / projector / Sony / audio
qualification.

## Verification actually run

```bash
git diff --check
npm run verify
npm run verify:all
npm run capture:visual-history:pre-owner
```

Ordinary e2e gate (`menus-historian-gate`) extended to assert the new archive
is present and not rewritten when capture env is off.

## Human visual inspection (agent)

Inspected representative PNGs for hierarchy, clipping, legibility, truthful
labels, Host/Display privacy, sequence, and Q6 product-specificity:

- **Pass:** Start Round 1 ordinary control; Display Waiting for the first
  round / Playing / Game complete; host clue holds private answer while
  Display shows prompt only; **Undo Incorrect (Team 1)** on ordinary chrome;
  Go to the Final; winner/completion.
- **Noted residual:** Host clue first-viewport may clip lower prompt text;
  not treated as a functional blocker.
- **No new ordinary-path functional blocker** found that would reopen Court A.

## Non-claims

This archive does **not**:

- issue `OWNER-PLAYTHROUGH-ELIGIBLE`;
- issue PRE-Q7;
- start Q7 or owner playthrough;
- start S04D, S06, or S05 terminalization;
- overwrite S05 or MENUS archives;
- prove physical/native classroom qualification.
