# MENUS Slice H — durable semantic acceptance matrix

- **Implementation SHA (product UI):** `1404b517921a5182a57291b3d7df36d464245ee5` (includes merged H-REPAIR-1)
- **Evidence classes:** `unit` · `e2e-browser` · `historian-png` · `owner-gate` · `physical-NOT-RUN`
- **Mode:** Evidence tranche / rebind after H-REPAIR-1. Product behavior under `src/` not mutated for defects.
- **Inventory legend (fresh vs main):** `CURRENT MERGED TEST SUFFICIENT` · `NEEDS STRONGER` · `NEW TEST` · `RENDERED EVIDENCE` · `CANNOT AUTOMATE HONESTLY`

| ID | Invariant (teacher job) | Evidence | Result | Class |
| --- | --- | --- | --- | --- |
| H1 | Empty Home: New Game dominant; Import adjacent; Display demoted; no Host CTA; no dual library | `menus-slice-cd-home-authoring.spec.ts` empty Home; `HomeRoute.test.tsx` teacher-first; Slice A CTA absence | PASS (cite) | e2e-browser + unit |
| H2 | Populated Home: one featured playable; Play/Edit/More; other playable + draft reachable | CD multi-entry e2e; CD populated hero; HomeRoute featured playable | PASS (cite) | e2e-browser + unit |
| H3 | Draft-only: Continue primary; no fake Play | CD draft-only e2e; HomeRoute unfinished Continue | PASS (cite) | e2e-browser + unit |
| H4 | Recovery-first: Resume (or invalid discard) dominates; stage+title truthful; Games protected | HomeRoute dominance/invalid units; **`shows truthful recovery stage + title on the Home Resume banner (H4)`**; `recoveryBannerContext` stage derivation | PASS | unit |
| H5 | New Game board-first; first incomplete selected; Final before settings; quality understandable | CD New Game e2e (selected + Final-before-settings + validation); AuthoringRoute unit same | PASS | e2e-browser + unit |
| H6 | Import: Board+Final/Classic; downloader; spreadsheet/JSON/demo co-present; no live-AI; fail-closed cited | CD Import e2e (co-present + no live-AI verbs); HomeRoute download unit; import-pipeline / salvage units | PASS | e2e-browser + unit |
| H7 | 0-team: setup mounts; Teams/Names blocked; Start disabled; Edit Game-owned | `menus-slice-e-team-sony.spec.ts`; ClassroomSetupPanel 0-team unit | PASS (cite) | e2e-browser + unit |
| H8 | Names keyboard without receiver; SIMULATED colour with supported profile via `?play=`; one detector | `menus-slice-h-names-sim-sony.spec.ts`; E keyboard e2e; wbuzzPresent units | PASS (sim); physical **NOT RUN** | e2e-browser + unit; physical-NOT-RUN |
| H9 | Ready + optionals never revoke; Start sole dominant; honest facts | `classroomReadiness.test.ts` H9 matrix table; ClassroomSetupPanel H9 UI cells; B+F golden e2e | PASS | unit (+ e2e-browser) |
| H10 | Start → focused play; **`tsp-scoreboard` first-viewport** (no scroll-before-assert); Controllers after gameplay + collapsed; compact healthy persistence; real **`cbh-grid` after legitimate round advance**; lifecycle owners mounted; no kitchen-sink / no Slice-number teacher copy | **`menus-h-repair-1-focused-host.spec.ts`** (merged); Slice A + B+F Start e2e; HostRoute chrome unit; **`FoundationControls.test.tsx` lifecycle mount** | PASS | e2e-browser + unit |
| H11 | Back to setup preserves Game/Session/names | Slice A Back + hydration D | PASS (cite) | e2e-browser |
| H12 | Resume mid-setup: setup land; identity; names preserved; Welcome agrees; no second gate | G Welcome setup e2e (names + title); HomeRoute no second gate; A hydration A | PASS | e2e-browser + unit |
| H13 | Resume mid-play: play land; Game+round; Welcome; runtime facts | G Welcome play e2e (title/round/ROUND_ADVANCED); A hydration B; hostResumeWelcome unit | PASS | e2e-browser + unit |
| H14 | Mid-setup refresh → Resume setup; no fabricate play | Slice A hydration A | PASS (cite) | e2e-browser |
| H15 | Change Game → Home → B → recovery → replace-confirm → B setup; A until confirm | G Change game e2e journeys | PASS (cite) | e2e-browser |
| H16 | Bare `#/host` exists; Home does not advertise; default play/More compat unchanged | Slice A **`H16 bare #/host…`** e2e; `FoundationControls.test.tsx` bare Host default; Home CTA absence | PASS | e2e-browser + unit |

## §5 FoundationControls thin unit

| Target | Test | Result |
| --- | --- | --- |
| Change Game visibility by posture | `FoundationControls.test.tsx` Change game setup/play | PASS |
| Lifecycle-owner mounting across Start | same file — owners under More after Start | PASS |
| Welcome gating after Home-Resume hydrate | same file — Home intent vs Persistence Resume | PASS |
| Start/Back posture ownership | same file — Start→play / Back→setup | PASS |
| Bare `#/host` default | same file — play + More open | PASS |

## Visual historian (focused Ready + post-Start)

| State | PNG | Class |
| --- | --- | --- |
| Class Setup Ready | `screenshots/setup/menus-setup-ready-*.png` | historian-png |
| Focused Host post-Start | `screenshots/host/menus-host-focused-*.png` | historian-png |
| Additional MENUS census | see [`CAPTURE-MANIFEST.json`](CAPTURE-MANIFEST.json) (20 automated) | historian-png |
| Owner / physical | [`OWNER-CAPTURE-CHECKLIST.md`](OWNER-CAPTURE-CHECKLIST.md) | owner-gate / physical-NOT-RUN |

## Non-claims preserved

Physical Sony · Windows physical · projector · physical audio · screen reader · S06 · owner acceptance · S05 terminalization · MENUS Complete.
