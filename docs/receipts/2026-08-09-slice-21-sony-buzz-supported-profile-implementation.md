# Receipt — Slice 21 Sony Buzz supported-profile implementation

- **Identity:** `CQS-SLICE-21-SONY-BUZZ-SUPPORTED-PROFILE-IMPLEMENTATION`
- **Authorization:**
  `AUTHORIZE-CQS-SLICE-21-SONY-BUZZ-SUPPORTED-PROFILE-IMPLEMENTATION-1`
- **Evidence state:**
  `CQS-SLICE-21-SONY-BUZZ-SUPPORTED-PROFILE-IMPLEMENTATION-ES-1`
- **Date:** 2026-08-09
- **Exact authorized base:** `0433f30d9a950d0a196feaf5bb7a57411df77e37`
- **Branch:** `feat/slice-21-sony-buzz-supported-profile`
- **ADR:**
  [`../architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md`](../architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md)

## Verdict (this receipt)

Implementation delivered for review. Slice 21 is **not Complete**.

```text
FINAL FOUR-HANDSET PHYSICAL RC: OWED
```

Physical handset #3 / browser group `15–19` remains untested on the candidate
head. Do not issue final independent acceptance for merge until RC completes.

## Synthetic / CI evidence

- Unit coverage for WebHID transport fakes, keep-alive lifecycle (permission,
  framing fail-closed, seven-zero payload, already-open convergence, disconnect,
  generation guards, visibility re-prime), supported profile recognition/recipe,
  IndexedDB v3→v4 additive store, mapping v1 round-trip / unknown version /
  team mismatch / no controllerIndex, Gamepad reprimeToken false-edge safety,
  host empty-state + supported-profile UI, PublicState privacy.
- Playwright: Controllers zero-team empty state; supported-profile host surface;
  projector non-leakage for Sony/WebHID tokens (extends existing gamepad e2e).
- Playwright does **not** fake physical WebHID compatibility.

## Physical owner evidence (inherited discovery; not re-run here)

Preserved accurately from Slice 21 discovery / evidence state:

| Item | Status |
| --- | --- |
| macOS 26.5.1 (25F80) + Chrome 151.0.7922.77 | Observed |
| Namtai Wbuzz `054c:1000` | Observed |
| WebHID reportId 0 / 7 bytes / seven-zero payload | Observed |
| ~2000 ms nominal cadence; background jitter | Observed |
| 271 sends / 0 failures / 0 overlaps (strong soak) | Observed |
| Concurrent Gamepad 20 buttons / 2 axes | Observed |
| Groups `0–4`, `5–9`, `10–14` | Observed |
| Group `15–19` / physical handset #3 | **UNTESTED / FINAL RC OWED** |
| Simultaneous primary-red presses | Observed |
| Disconnect stops keep-alive; replug recovery | Observed |
| Gamepad index `0 → 1` after replug | Observed |
| USB hub replug recovery | Observed once — **nonclaim:** not arbitrary-hub support |
| Already-open InvalidStateError | Observed; product converges |
| No spontaneous rising edge before next physical press | Observed |

Do not rewrite historical OADL2 or failed intermediate harness attempts.

## Owner-facing physical RC checklist (compact)

When handset #3 is available, test the **product implementation** on the exact
candidate head (not the discovery harness), covering:

1. All four slots × five colors (press/release)
2. Team assignments + saved mapping + reload hydration
3. Primary red gameplay; hold/release; simultaneous red
4. Secondary colors non-gameplay
5. Keyboard after setup and after disconnect
6. Mapping incompatibility failure + mapping clear
7. Keep-alive healthy; bounded soak
8. Blur/focus and hidden/visible return (immediate keep-alive + no false buzz)
9. Unplug/replug recovery; index change; no false reconnect buzz
10. Explicit support wording / nonclaims still accurate

## Guidance deltas (for Program Orchestrator)

- Physical vs synthetic hardware evidence must stay separated in receipts.
- Browser-permission and USB re-enumeration need generation-owned async tests.
- Volatile Gamepad index must never be persisted.
- Background timer cadence is not a browser guarantee.
- Exact support-claim discipline; shorter owner-facing RC procedures preferred.
- Physical evidence must be re-transferred after repairs on affected paths.

## Non-claims

- Slice 21 Complete
- Final merge authorization
- Four-handset certification
- Arbitrary USB hub support
- Wired `054c:0002` support
- Slice 22/23 started
