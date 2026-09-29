# CQS visual history archives

Milestone screenshot atlases for Classroom Quiz Show.

These archives preserve **what the product looked like** at a named milestone.
They are **not** implementation authority and must not be silently updated when
the UI changes later.

## Canonical workflow

Before creating, extending, or reviewing a milestone archive, follow
[`HISTORIAN-WORKFLOW.md`](HISTORIAN-WORKFLOW.md).

That workflow defines:

- when a new milestone archive is warranted;
- exact-SHA provenance;
- the complete graphical-surface/state census;
- automated versus local/native/hardware evidence classes;
- privacy and synthetic-data requirements;
- required manifest and atlas metadata;
- teacher-workflow reconstruction;
- verification and human-inspection gates;
- post-merge immutability.

## Archives

| Archive | Milestone |
| --- | --- |
| [`2026-09-s05-complete/`](2026-09-s05-complete/) | S05 presentation children complete / pre-owner-playthrough |
| [`2026-09-menus-pre-owner-gate/`](2026-09-menus-pre-owner-gate/) | MENUS early-workflow complete / pre-owner-gate (implementation SHA `5915d46…`) |

The S05 archive is the first full presentation-atlas precedent: 58 inventoried
surfaces/states, 50 committed automated PNG captures, five owner/local capture
slots, and three S06-deferred evidence slots.

The MENUS pre-owner-gate archive records teacher early-workflow surfaces after
Slices A–G (Home / setup Ready / focused Host / Resume Welcome-back). It does
**not** overwrite S05. Owner playthrough (Slice I) remains NOT RUN.

Regenerate automated captures for an archive only under that archive's own
documented command:

- S05: `npm run capture:visual-history` (`CQS_VISUAL_HISTORY_CAPTURE=1`)
- MENUS: `npm run capture:visual-history:menus` (`CQS_MENUS_VISUAL_HISTORY_CAPTURE=1`)

Ordinary `npm run test:e2e` must not rewrite either archive.

## Historical integrity

- Never overwrite an earlier milestone's screenshots to make them resemble
  the current product.
- Never use screenshots from one implementation SHA as evidence for another.
- Never treat browser screenshots as proof of Electron, Windows, projector,
  Sidecar, controller, audio, or accessibility behavior that was not actually
  observed in that environment.
- Never include real student/class data.
- If the product changes materially after owner review, create a new milestone
  archive rather than revising the old baseline.
