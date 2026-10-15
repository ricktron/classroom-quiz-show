# Q7 full teacher buzzer workflow — simulation repair qualification receipt

- **Authorization:** `AUTHORIZE-CQS-Q7-FULL-TEACHER-BUZZER-WORKFLOW-SIMULATION-REPAIR-QUALIFICATION-1`
- **Authoritative starting main:** `78304319ec21106c64eee925a5f942726846d384`
- **Kind:** product repair + black-box qualification harness
- **Merge:** NOT performed by this packet (review-ready PR only)

## Phase 0

Coverage/gap map:
[`2026-10-15-cqs-q7-buzzer-workflow-phase0-coverage-map.md`](2026-10-15-cqs-q7-buzzer-workflow-phase0-coverage-map.md)

## Q7-F01 red proof (unmodified main)

| Field | Value |
| --- | --- |
| Candidate SHA | `78304319ec21106c64eee925a5f942726846d384` |
| Command | `npx playwright test tests/e2e/q7-f01-show-buzzer-setup-regression.spec.ts --project=projector-720p -g "1280"` |
| Failing assertion | `Show buzzer setup: Connect must land in the teacher viewport without hunting` (`expect(isMostlyInViewport(sbs-connect)).toBe(true)` → false) |
| Class of failure | Same as owner Q7-F01 — Act without understandable in-viewport Effect/Continuation |

## Repair summary

| Item | Change |
| --- | --- |
| Show buzzer setup Effect | `setup-buzzer-reveal-status` in Class Setup; Connect scroll/focus |
| Gameplay after Check | Clear `testMode` on leave setup; enable when Wbuzz mapping applied |
| First output honesty | `connecting` until first success; first fail → `failed` |
| Check leave honesty | Clear sticky responding slots / recent observations |

## Simulator architecture

- Browser/Electron: `tests/e2e/helpers/simulatedWbuzzHardware.ts`
- Boundary: `navigator.hid` + `navigator.getGamepads` only
- Exact profile: `054c:1000`, reportId 0, 7-byte zeros
- Desktop: Playwright `addInitScript` + reload (no production preload;
  `DESKTOP_WEB_PREFERENCES.preload` remains forbidden)

## Non-claims

- Simulation is **not** physical Sony evidence
- Q7-F02 physical root cause remains **UNESTABLISHED**
- Does not issue `OWNER-PLAYTHROUGH-ELIGIBLE`
- Does not terminalize S05 / authorize S04D / S06 / signing
