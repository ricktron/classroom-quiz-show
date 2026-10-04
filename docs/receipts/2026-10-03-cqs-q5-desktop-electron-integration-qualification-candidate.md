# Receipt — Q5 Desktop/Electron integration qualification candidate

- **Date:** 2026-10-03
- **Authorization:** `AUTHORIZE-CQS-Q5-DESKTOP-ELECTRON-INTEGRATION-QUALIFICATION`
- **Kind:** qualification evidence receipt (candidate; not post-merge terminal)
- **Base:** `origin/main` `28ff23993183710c9eea9e524667bad45d0448fd`
- **Branch:** `cursor/cqs-q5-desktop-electron-integration-qualification-1`
- **Product repair:** none

## What was proven (DESKTOP E2E)

| ID | Claim | Evidence |
| --- | --- | --- |
| Q5-A | Desktop build identity `sourceSha` binds to exact HEAD | `q5-session-lifecycle` |
| Q5-B | Display hash-lock rejects Host navigation under Electron | `q5-session-lifecycle` |
| Q5-C | Authentic started Session survives quit/relaunch; explicit Home Resume; Host score + Display privacy reconverge | `q5-session-lifecycle` |
| Q5-D | Missing `cqs://app` asset fails closed (404 + CSP) without breaking Host | `q5-session-lifecycle` |
| RETAIN | Cold Host/Display/security/API/offline/diagnostics | `shell.spec.ts` |
| RETAIN | URL/HID/security policy units | `desktop/shell.invariants.test.ts` |

## Retained (not re-proven as new golden paths)

Browser Q1–Q4 packs, including HG-12/HG-13, remain **RETAIN**. Finding D
closed on this candidate by shell RETAIN + lifecycle strengthen.

## Non-claims

- Physical Sony / projector / audio / Windows runtime
- Signed / notarized release readiness
- Teacher usability / owner playthrough
- Q5 LANDED / Q6 started / OWNER-PLAYTHROUGH-ELIGIBLE
- S05 parent terminalization / S04D / S06

## Local verification (candidate)

- `git diff --check` — clean
- `npm run verify` — pass (pre-existing react-refresh warnings only)
- `npm run verify:all` — pass (662 Playwright browser e2e)
- `npm run test:desktop` — pass (8 desktop tests)

Bind later CI claims to the immutable final PR tip. Do not predict squash SHA.
