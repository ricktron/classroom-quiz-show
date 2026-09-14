# CQS-REAL-MVP-S04C-H1 — Safe startup and unified session recovery

## Identity

- **Slice:** `CQS-REAL-MVP-S04C-H1-SAFE-STARTUP-AND-UNIFIED-SESSION-RECOVERY`
- **Parent:** `CQS-REAL-MVP-S04C-PRODUCT-SAFETY-RECOVERY-AND-COMPATIBILITY-UX`
- **Program:** `CQS-REAL-MVP-1`
- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S04C-H1-SAFE-STARTUP-AND-UNIFIED-SESSION-RECOVERY-1`
- **Kind:** implementation receipt for an independently reviewable H1 PR.
  **Not** a merge. **Not** H2+. **Not** terminal S04C completion.
- **Date (America/Chicago):** 2026-09-13
- **Repository:** `ricktron/classroom-quiz-show`

## Starting provenance

| Fact | Observed |
| --- | --- |
| Exact authorized base `origin/main` | `5e649409567adc3951c45c872b7f01f13d91083b` |
| America/Chicago | 2026-09-13 21:08:38 CDT |
| UTC | 2026-09-14 02:08:38 UTC |
| Host | `ricks.macbook.air.lan` |
| User | `macdaddy` |
| cwd / Git toplevel | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show-s04b` |
| Delivery branch | `feat/cqs-real-mvp-s04c-h1-safe-startup-and-unified-session-recovery` |
| Base ancestry | `5e64940…` is `HEAD` at branch creation (`ancestor_ok`) |
| Main workflow at preflight | CI / Deploy / Desktop artifacts **success** on `5e64940…` (#77) |
| S04B | **TERMINALLY COMPLETE** |

## Root invariant repaired

Home "Resume session" was navigation-only (`Link` → Host). Host then showed a
second Resume gate for the same unfinished Session. Teachers had to Resume
twice for one recovery decision.

## Pre-change behavior (observed)

1. Valid unfinished Session on disk → Home showed Resume as a route link.
2. Arriving at Host re-booted persistence and prompted Resume again.
3. Discard / invalid-recovery discard already cleared only `activeSessions`
   key `current` and preserved saved Games (ADR-013).
4. Persistence schema remained one active recovery identity (`current`).

## Implementation behavior

1. **Home Resume** is a button that navigates to Host with a one-shot route
   state intent (`cqsResumeRecovery`).
2. **Host** (`FoundationControls`) consumes that intent once recovery is
   readable, calls the same `persistence.resume()` path Host already owned,
   then clears the intent (`replace` navigation). Hard refresh still
   re-prompts (ADR-013; no silent auto-resume).
3. **Start fresh** (Home + Host) requires confirmation, discards only the
   unfinished Session via `discardRecovery()` / `clearActiveSession`, and
   states that saved Games stay. Failed durable discard does not claim
   success; recovery remains visible.
4. Invalid recovery retains fail-closed discard of the unreadable Session only.
5. No parked-session / multi-history model. No persistence schema change.
6. Recovery UI remains Host-private; Display projections unchanged.

## Persistence / storage model

**Unchanged.** Still ADR-013:

- one `activeSessions` record keyed by `current`;
- explicit Resume;
- explicit discard / Start fresh of that Session only;
- saved definitions untouched;
- no silent auto-resume;
- malformed recovery fails closed.

## Host / Display privacy

No recovery metadata, persistence status, library content, or private Host
copy was added to `PublicState` or Display. Existing Display leak assertions
remain; H1 adds Home-recovery privacy coverage in Playwright.

## Game / Session ownership

| Action | Session | Saved Games |
| --- | --- | --- |
| Resume | restores unfinished Session | untouched |
| Start fresh / Discard | clears active recovery only | untouched |
| Clear all local CQS data | aggregate wipe (unchanged; separate control) | wiped |

Recovery controls do not invoke `clearAllLocalData`.

## Explicit non-claims

- H2+ / diagnostics / backup-restore / import-salvage **not begun**
- S04D / S05 / S06 **not begun**
- No Windows physical qualification
- No signing / notarization / release
- No NightWatch COURT run claimed for this H1
- This receipt does **not** mark S04C complete

## Changed files (implementation)

- `src/routes/HomeRoute.tsx` — real Resume intent; Start fresh confirmation/copy
- `src/host/FoundationControls.tsx` — one-shot Home→Host auto-resume
- `src/host/PersistenceControls.tsx` — Start fresh wording + failed-discard honesty
- `src/host/hostResumeNavigation.ts` — shared resume-intent helper
- `src/host/sessionRecoveryCopy.ts` — shared teacher-facing recovery copy
- `src/routes/HostRoute.tsx` — optional test persistence injection
- Tests: `HomeRoute.test.tsx`, `PersistenceControls.test.tsx`,
  `tests/e2e/persistence-recovery.spec.ts`
- Minimal current-state docs + this receipt

## Verification

Recorded in the delivery handoff / PR after the local verify matrix completes.
Never claim an unrun check.

## Transferable evidence for later S04C

- Home and Host now share one Resume semantic (Host `resume()`), not two
  teacher gestures.
- Start fresh is Session-only with confirmation and fail-closed honesty.
- Parked multi-session history remains an owner decision; H1 deliberately
  did not introduce it.
