# Q7 full teacher buzzer workflow — Phase 0 coverage / gap map

- **Authorization:** `AUTHORIZE-CQS-Q7-FULL-TEACHER-BUZZER-WORKFLOW-SIMULATION-REPAIR-QUALIFICATION-1`
- **Observation base:** `origin/main` `78304319ec21106c64eee925a5f942726846d384`
- **Working tree at observation:** clean on that exact SHA
- **Kind:** Phase 0 map only — **no product repair in this observation**
- **Non-claims:** does not establish Q7-F02 physical root cause; simulation ≠ physical Sony

## Ordinary teacher route (observed)

```text
Home
→ create/import game (visible Import or New Game)
→ Play → Class Setup (Host posture=setup)
→ optional Buzzers row / task (often opens first when hardware present)
→ Show buzzer setup | Check buzzers  (setup-reveal-buzzers)
→ FoundationControls.onRevealBuzzersSetup:
     setEnterBuzzerCheck(true) → GamepadInputHostPanel forces Buzzer Check
     scrollIntoView + focus [data-testid=sbs-supported-profile|gih]
→ Connect buzzers (sbs-connect) → WebHID requestDevice / open / keep-alive
→ Gamepad exposure (OS/browser) → supported Wbuzz poll owner
→ Check buzzers / Buzzer Check confirmations (RED per slot)
→ optional team association Save
→ Names (required) → Ready → Start Game
→ Start Round 1 (ordinary rph-start)
→ RED buzz → claim / lockout → adjudicate
→ Back to setup → buzzer surface remains
→ persist / reload / Resume
```

## Teacher-visible controls (ordinary path)

| Control | Accessible / visible identity | Location |
| --- | --- | --- |
| Import / Play | Home Import, Play | Home |
| Resume class | `home-resume-session` / Resume class | Home |
| Buzzers readiness | readiness-sony / Buzzers row | Class Setup |
| Show buzzer setup | button Show buzzer setup / Check buzzers | Class Setup buzzers task |
| Connect buzzers | Connect buzzers | SBS below Class Setup |
| Check buzzers | Check buzzers / Leave Buzzer Check | SBS |
| Skip buzzers for now | Skip buzzers for now | SBS |
| Start Game | setup-play | Class Setup Ready |
| Start Round 1 | rph-start | Focused Host |
| Correct / Incorrect | ordinary adjudication | Host |
| Back to setup | host chrome Back | Focused Host |

## Workflow coverage table

| STEP | TEACHER ACTION | EXPECTED VISIBLE EFFECT | CURRENT AUTOMATED EVIDENCE | EVIDENCE GAP | PLANNED PROOF |
| --- | --- | --- | --- | --- | --- |
| Home launch | Open app root | Home heading | Q2/Q3/Q5 e2e | — | golden path start |
| Unfinished session | Import+Play+persist via UI | Resume appears | Q2-M, Q5-B | often Host reload resume, not always Home Resume | create via UI → Home → Resume |
| Resume | Click Resume class | Class Setup / Host setup | Q2-M, Q5 | mixed Host vs Home resume helpers | black-box Home Resume |
| Class Setup | Arrive setup posture | classroom-setup visible | many MENUS specs | — | golden path |
| Buzzers discover | Open Buzzers | setup-buzzers-task | Q1 Scenario D | may use testid click | role/name where practical |
| Show Reach | See Show buzzer setup | button visible | Q1 | viewport not proven | viewport matrix |
| Show Act | Click / keyboard activate | control activates | Q1 click only; component callback | keyboard semantic + visible effect | F01 regression |
| Show Effect | Understandable reveal | setup region in viewport; next action clear | Q1 asserts testid visible (DOM visibility ≠ viewport) + aria-pressed | **Q7-F01 escape** | fail-first in-viewport / status |
| Show continuation | Find Connect | Connect discoverable | partial | after Show without hunting | assert Connect in viewport |
| Connect | Click Connect | permission + open | unit lifecycle fakes; **no e2e WebHID** | platform HID sim missing | navigator.hid simulator |
| 054c:1000 | Exact device | receiver selected | unit only | e2e | HID sim exact filter |
| HID open / framing / 00×7 / keep-alive | — | healthy receiver copy | unit keep-alive | e2e teacher-visible | HID sim + visible Receiver |
| Gamepad expose | pad appears | Buzzers status truthful | simulatedGamepad helper | often installed before journey; no HID→pad sequencing | expose after Connect |
| 4× RED check | press slots 1–4 | per-slot confirmation | Q1 slot 1 only | slots 2–4 e2e | golden path + mapping unit |
| Association / Ready | save/apply if needed | truthful readiness | component/unit | black-box | golden path |
| Start Game / Round / buzz / lockout / adjudicate | ordinary controls | gameplay responds | Q3 keyboard; sim Sony partial | full Wbuzz gameplay spine | golden path |
| Back to setup / reload Resume | ordinary | no remount / usable | H-repair lifecycle; Q2-M | post-resume buzzer check | golden path K |
| Failure branches | deny/open fail/etc. | honest UI | unit-heavy | teacher-visible matrix | Phase 6 suite |
| Desktop Electron | same spine | shell + workflow | Q5 lifecycle; no Wbuzz sim | Electron HID/Gamepad inject | desktop harness |
| Viewport / a11y | 1280/1366/sim125 + keyboard | discoverable | H-repair viewports for Host | Show-buzzer viewport | Phase 8–9 |

## Substitutions in current evidence (reject for golden-path claims)

| Substitution | Where observed | Golden-path allowed? |
| --- | --- | --- |
| Component mount ClassroomSetupPanel | ClassroomSetupPanel.test | No |
| Callback spy onRevealBuzzersSetup | ClassroomSetupPanel.test | No |
| Playwright `toBeVisible` without viewport intersection | Q1 Scenario D | No (for F01 Effect) |
| Gamepad installed before navigation | Q1, Q3 sim | Only if sequenced like hardware after Connect |
| Unit fake WebHID transport | webHidTransport.test / lifecycle | Not teacher journey |
| Direct `#/host` / state injection | some older specs | No for this suite |
| Advanced diagnostics | forbidden ordinary path | No |
| scrollIntoView before discoverability assert | would fake F01 | No |

## Q7-F01 hypothesis (for red proof; not F02 root cause)

Show buzzer setup only arms Buzzer Check + scroll/focus. Class Setup task copy does not change. Playwright “visible” can pass while Connect / Check outcome remain off-screen or confusing. Owner observed no understandable effect — automation must require **Reach → Act → Visible Effect → Continuation** in the natural viewport.
