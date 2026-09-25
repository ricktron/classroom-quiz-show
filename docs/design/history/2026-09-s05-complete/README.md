# Visual history — S05 complete / pre-owner-playthrough

- **Archive id:** `2026-09-s05-complete`
- **Milestone:** S05 presentation children complete / pre-owner-playthrough
- **Repository:** `ricktron/classroom-quiz-show`
- **Canonical base SHA:** `4368cc9eeb7dbf3ef342926e1d0fba7ba4c10f9b`
- **Date (UTC):** 2026-09-24
- **S05 parent:** OPEN / NOT TERMINAL
- **Owner playthrough:** NOT RUN
- **S04D:** NOT AUTHORIZED
- **S06:** NOT AUTHORIZED

This folder is a **visual historical atlas** of Classroom Quiz Show as it
looked at the completed S05 presentation milestone, before the deliberate
whole-game owner playthrough.

It is **not** implementation authority. Living UX doctrine and surface
inventory remain under [`../../`](../). Observed code and tests remain the
product truth.

```text
current implementation authority ≠ visual historical record ≠ human acceptance evidence
```

## Contents

| Path | Role |
| --- | --- |
| [`CQS-VISUAL-SURFACE-ATLAS.md`](CQS-VISUAL-SURFACE-ATLAS.md) | Per-surface atlas entries with screenshots / capture status |
| [`CAPTURE-MANIFEST.json`](CAPTURE-MANIFEST.json) | Machine-readable census + authority classification |
| [`OWNER-CAPTURE-CHECKLIST.md`](OWNER-CAPTURE-CHECKLIST.md) | Surfaces Cursor cannot truthfully capture |
| [`screenshots/`](screenshots/) | Committed historical PNGs (synthetic content only) |

## Historian integrity rules

1. Historical screenshots are **immutable milestone evidence**.
2. Do **not** update an old image merely because the UI changed later.
3. New UI state gets a **new milestone archive** (for example
   `2026-xx-s05-owner-accepted/`), not an overwrite of this one.
4. Historical images are **not** implementation authority.
5. Do **not** include real student/class data — synthetic content only.
6. Use synthetic Game / Session fixtures and demo content only.
7. Every screenshot must be attributable to a repository commit (this archive
   binds automated captures to canonical base
   `4368cc9eeb7dbf3ef342926e1d0fba7ba4c10f9b`).
8. Automated and human/local captures must be clearly distinguished.
9. **Browser captures are not evidence** of Electron, Windows, projector, or
   Sidecar hardware behavior.
10. **Sidecar is not equivalent** to S06 classroom-projector qualification.

## Capture method

Automated captures use the existing Playwright production-preview path and
sanitizer-backed Display fixtures (including S05 visual-stress and Final
command-path snapshots).

Regenerate automated PNGs only when intentionally refreshing **this**
milestone archive (normally never after merge):

```bash
npm run capture:visual-history
```

Ordinary `npm run test:e2e` does **not** rewrite historical images
(`CQS_VISUAL_HISTORY_CAPTURE` must be `1`).

This archive is an intentional exception to the default
“do not commit piles of screenshots” guidance in
[`../../governance/EXECUTION-GUIDANCE.md`](../../governance/EXECUTION-GUIDANCE.md):
it is a bounded, named milestone atlas, not ad-hoc test debris.

## What this does not do

- Does not terminalize S05 parent.
- Does not authorize or begin S04D or S06.
- Does not substitute for the deliberate whole-game owner playthrough.
- Does not redesign UX or change gameplay.
- Does not fabricate Sidecar, Windows, projector, or physical-controller
  screenshots.

## Next human action

The next product-evidence step remains Rick’s **deliberate whole-game owner
playthrough** (including MacBook Air Host + iPad Sidecar Audience captures
listed in [`OWNER-CAPTURE-CHECKLIST.md`](OWNER-CAPTURE-CHECKLIST.md)).
