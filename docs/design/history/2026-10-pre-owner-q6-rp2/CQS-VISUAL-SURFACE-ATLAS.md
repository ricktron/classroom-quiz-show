# Visual surface atlas — pre-owner Q6-RP-2

- **Archive:** `2026-10-pre-owner-q6-rp2`
- **Implementation SHA:** `9410b6290a6dcb2f971e66da8173c3b44a6f785a`
- **Capture date (UTC):** 2026-10-04
- **Evidence class (unless noted):** `AUTOMATED-CAPTURE` / browser Playwright

Descriptive history only. Living UX doctrine remains under [`../../`](../../).
Canonical census: [`CAPTURE-MANIFEST.json`](CAPTURE-MANIFEST.json).

## Application / library

### PRE-OWNER-HOME-EMPTY — Empty Home

![Empty Home](screenshots/app/pre-owner-home-empty-1280x720.png)

- **Role / class:** App / normal · **Privacy:** host-private · **Viewport:** 1280×720
- **Purpose:** Empty library; New Game dominant; Host privacy banner
- **Trigger:** Fresh empty Home
- **Limitations:** Browser only

### PRE-OWNER-IMPORT-TEMPLATES — Import entry

![Import templates](screenshots/app/pre-owner-import-templates-1280x720.png)

### PRE-OWNER-HOME-POPULATED — Populated Home

![Populated Home](screenshots/app/pre-owner-home-populated-1280x720.png)

### PRE-OWNER-AUTH-BOARD-FIRST — Authoring

![Authoring board-first](screenshots/authoring/pre-owner-auth-board-first-1280x720.png)

### PRE-OWNER-HOME-RECOVERY — Resume on Home

![Home recovery](screenshots/recovery/pre-owner-home-recovery-1280x720.png)

## Class Setup

### PRE-OWNER-SETUP-NAMES — Names

![Setup names](screenshots/setup/pre-owner-setup-names-1280x720.png)

### PRE-OWNER-SETUP-READY — Ready / Start Game

![Setup ready](screenshots/setup/pre-owner-setup-ready-1280x720.png)

## Focused Host + Display lifecycle (G1 / G2)

### PRE-OWNER-HOST-FOCUSED-PRE-ROUND — Start Round 1

![Focused Host pre-round](screenshots/host/pre-owner-host-focused-pre-round-1280x720.png)

- Ordinary `rph-start` labeled **Start Round 1**; Undo absent

### PRE-OWNER-DISPLAY-WAITING-FIRST-ROUND — Waiting for the first round

![Display waiting](screenshots/audience/pre-owner-display-waiting-first-round-1280x720.png)

- Truthful G2 detail before first round

### PRE-OWNER-HOST-BOARD — Host board

![Host board](screenshots/host/pre-owner-host-board-1280x720.png)

### PRE-OWNER-DISPLAY-BOARD-PLAYING — Playing

![Display board Playing](screenshots/audience/pre-owner-display-board-playing-1280x720.png)

## Clue / buzz

### PRE-OWNER-HOST-CLUE — Host private answer

![Host clue](screenshots/clue/pre-owner-host-clue-1280x720.png)

- Host-only answer + teacher notes visible; lower chrome may clip

### PRE-OWNER-DISPLAY-CLUE — Public prompt only

![Display clue](screenshots/clue/pre-owner-display-clue-1280x720.png)

- No answer / host notes on Display

### PRE-OWNER-HOST-BUZZ-CLAIM / PRE-OWNER-DISPLAY-BUZZ-CLAIM

![Host buzz](screenshots/buzz/pre-owner-host-buzz-claim-1280x720.png)

![Display buzz](screenshots/buzz/pre-owner-display-buzz-claim-1280x720.png)

## Incorrect / ordinary live Undo (G3 / HG-13)

### PRE-OWNER-HOST-INCORRECT-UNDO — Undo Incorrect (Team 1)

![Host incorrect undo](screenshots/outcome/pre-owner-host-incorrect-undo-available-1280x720.png)

- Ordinary chrome control; Advanced diagnostics unused

### PRE-OWNER-HOST-AFTER-UNDO / PRE-OWNER-DISPLAY-AFTER-UNDO

![Host after undo](screenshots/outcome/pre-owner-host-after-undo-1280x720.png)

![Display after undo](screenshots/outcome/pre-owner-display-after-undo-1280x720.png)

## Outcome / scoring / round transition

### Correct outcome + scoring

![Host correct](screenshots/outcome/pre-owner-host-correct-outcome-1280x720.png)

![Display correct](screenshots/outcome/pre-owner-display-correct-outcome-1280x720.png)

![Host scoring](screenshots/outcome/pre-owner-host-scoring-1280x720.png)

### PRE-OWNER-HOST-ROUND-TRANSITION — Go to the Final

![Round transition](screenshots/round-flow/pre-owner-host-round-transition-1280x720.png)

## Final + completion

### PRE-OWNER-HOST-FINAL / PRE-OWNER-DISPLAY-FINAL

![Host Final](screenshots/final/pre-owner-host-final-1280x720.png)

![Display Final](screenshots/final/pre-owner-display-final-1280x720.png)

### PRE-OWNER-HOST-WINNER-COMPLETE / PRE-OWNER-DISPLAY-COMPLETE

![Host complete](screenshots/completion/pre-owner-host-winner-complete-1280x720.png)

![Display complete](screenshots/completion/pre-owner-display-complete-1280x720.png)

- Display shows **Game complete** / winner; G2 ended lifecycle

## Stress / accessibility browser states

| Id | Image |
| --- | --- |
| Reduced-motion board | ![rm](screenshots/stress/pre-owner-host-board-reduced-motion-1280x720.png) |
| Ready 1366 | ![r1366](screenshots/stress/pre-owner-setup-ready-1366x768.png) |
| Focused 1366 | ![h1366](screenshots/stress/pre-owner-host-focused-1366x768.png) |
| Ready sim125 | ![r125](screenshots/stress/pre-owner-setup-ready-1093x542-sim125.png) |
| Focused sim125 | ![h125](screenshots/stress/pre-owner-host-focused-1093x542-sim125.png) |

sim125 is a **browser CSS box** simulation of D04 Windows 125% Host — not OS
zoom and not Windows physical qualification.

## Deferred (not captured here)

See [`OWNER-CAPTURE-CHECKLIST.md`](OWNER-CAPTURE-CHECKLIST.md) and manifest
entries with `LOCAL-DESKTOP-CAPTURE`, `OWNER-HARDWARE-CAPTURE`, or
`S06-DEFERRED` authority.
