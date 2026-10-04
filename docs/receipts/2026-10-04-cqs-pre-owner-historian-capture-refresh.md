# CQS pre-owner historian capture refresh — candidate receipt

- **Date:** 2026-10-04
- **Authorization:** `AUTHORIZE-CQS-PRE-OWNER-HISTORIAN-CAPTURE-REFRESH-1`
- **Base:** `d921b07e04acea61a7d50f4f41252b81b74b1a67`
- **Kind:** historian infrastructure / provenance repair
- **Product behavior:** unchanged
- **Historical screenshots/manifests:** unchanged

## Problem

Q6 found that the S05 and MENUS historian capture specs no longer execute on
current `main` because their selectors describe their historical product
milestones, not today's product.

The archive workflow already says merged milestone screenshots are immutable,
but current `package.json` still exposed commands that attempted to run those
old specs against current code. That failed with stale-selector noise and made
it too easy to mistake an archive-specific capture harness for a current
capture harness.

## Repair

- `npm run capture:visual-history` and
  `npm run capture:visual-history:menus` now fail closed on current code with
  the archive path, bound implementation SHA, and forensic-regeneration
  instructions.
- The current-main copies of both legacy capture specs are disabled so direct
  Playwright invocation cannot bypass the package-script guard.
- The historical archives themselves are untouched.
- Forensic regeneration remains possible by using an isolated checkout at the
  archive's exact implementation SHA, where that historical checkout still
  contains its original capture command and selectors.
- A future pre-owner milestone must use a new archive directory and new or
  parameterized capture target after the implementation SHA is frozen.

## Bound historical identities

| Archive | Implementation SHA |
| --- | --- |
| S05 complete / pre-owner-playthrough | `4368cc9eeb7dbf3ef342926e1d0fba7ba4c10f9b` |
| MENUS pre-owner gate | `1404b517921a5182a57291b3d7df36d464245ee5` |

## Ordering with Q6

Q6 Court A currently records G1/G2 as ordinary-path functional blockers on PR
#133. This historian repair does **not** repair or bypass them.

Do not freeze a new pre-owner historian milestone while those blockers remain.
After the authorized Q3-family repair lands and the ordinary path is
re-qualified, create the new historian archive against that exact candidate
SHA and capture the real ordinary workflow without Advanced-diagnostics
shortcuts or injected false Display status.

## Non-claims

This work does not:

- fix Q6 G1/G2;
- pass Q6 Court A or run Court B;
- issue PRE-Q7 eligibility;
- start owner playthrough;
- reopen or rewrite S05/MENUS historical archives;
- authorize S05, S04D, S06, or visual redesign.

## Verification

Exact-head CI is required before delivery because this branch changes package
scripts and Playwright spec files. Local `git diff --check`, `npm run verify`,
and `npm run verify:all` have not been run in the ChatGPT execution
environment and are not claimed.
