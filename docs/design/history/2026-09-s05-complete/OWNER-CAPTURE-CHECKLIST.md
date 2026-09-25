# Owner / local capture checklist — S05 visual historian

Surfaces Cursor Projects **cannot** truthfully capture. Do not fabricate these
screenshots. Attach evidence to a later milestone archive (or an additive
`owner/` folder under this archive with explicit provenance) when captured.

Canonical census: [`CAPTURE-MANIFEST.json`](CAPTURE-MANIFEST.json).

---

## A. Local desktop (Electron shell)

| ID | Capture | Instructions |
| --- | --- | --- |
| `AUTH-IMPORT-FAILURE` | Import validation failure UI | On Host or Home, import a deliberately invalid game/spreadsheet. Screenshot the teacher-facing fail-closed explanation. Synthetic file only. |
| `HOST-ELECTRON-CHROME` | Electron Host window chrome | Run `npm run desktop` or an unsigned packaged build. Capture the native Host window (title bar / shell chrome). |
| `DESKTOP-DUAL-WINDOW` | Host + Display dual window | Open Host and Display native windows. Capture both windows (or a desktop overview showing both). Browser dual-tab is **not** a substitute. |

Browser historian captures already cover Host **content** for board / Final.
These rows are specifically for **native shell** evidence.

---

## B. Sidecar two-screen capture (Rick owner playthrough)

Expected arrangement:

- **MacBook Air** = Host
- **iPad Sidecar** extended display = Audience

CQS uses Electron display enumeration. Sidecar-specific placement, scaling, and
recovery remain **owner-observed** until Rick runs them.

Record that Sidecar evidence is **not** classroom-projector qualification (S06).

Have Rick capture, where practical:

1. Host + Audience simultaneously (desktop overview or paired shots)
2. Projector/Display window opening onto the Sidecar surface
3. Board
4. Clue / prompt
5. Buzz / active claim
6. Outcome (correct / incorrect)
7. Round transition / board return
8. Final (setup → wager → response → reveal → settlement)
9. Winner / completion (and tied finish if encountered)
10. Any window-placement or recovery behavior unique to Sidecar
11. Any scaling / layout anomaly specific to iPad

Manifest id: `SIDECAR-TWO-SCREEN`.

Also capture physical Sony pairing / sleep / wake if handsets are available
during the same playthrough (`SETUP-PHYSICAL-SONY`) — still not S06 classroom
qualification.

---

## C. Reserved for later S06 (NOT part of this historian task)

| ID | Evidence slot |
| --- | --- |
| `S06-WINDOWS-PROJECTOR` | Actual Windows teacher machine + classroom projector |
| `S06-PHYSICAL-CONTROLLERS` | Physical Sony controllers in class |
| `S06-SLEEP-WAKE-AUDIO` | Sleep/wake, disconnect/reconnect, classroom audio, screen-reader/physical a11y where required |

Do **not** fill these slots under this tranche.

---

## D. After capture

1. Keep synthetic / demo content only — no real student names or class data.
2. Name files stably; prefer adding under a dated owner subfolder rather than
   overwriting automated PNGs.
3. Record device, OS, CQS build/SHA, and that owner playthrough status changed
   only in the **owning** status/receipt docs when authorized — not by editing
   this archive’s milestone identity.
4. If UI changed because of playthrough fixes, create a **new** milestone
   archive instead of mutating `2026-09-s05-complete`.
