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

The current S05 archive is the first full precedent: 58 inventoried
surfaces/states, 50 committed automated PNG captures, five owner/local capture
slots, and three S06-deferred evidence slots.

Regenerate automated captures for an archive only under that archive's own
documented command (currently `npm run capture:visual-history` for the S05
archive).

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
