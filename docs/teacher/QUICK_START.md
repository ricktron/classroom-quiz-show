# Teacher quick start

Classroom Quiz Show is a local-first classroom game-show host. You run a private
**Home / Host** screen on your laptop; students watch the public **Display** on
the projector.

The conventional teacher path is the **desktop application**. See
[`DESKTOP.md`](DESKTOP.md) for install/start, unsigned-artifact warnings, and
manual updates. The GitHub Pages PWA remains a supported alternate.

## 1. Open Home

The app opens on **Home**. Keep this screen private — do not project it to
students.

From Home you can:

- **New Game** — create a category board and Final in the app
- **Import Game** — paste a game file, import a spreadsheet, or load the demo
- open **My Games** / **Recent Games**
- **Play** a ready game, or **Edit** it
- **Open Display** for the projector
- **Open classroom controls** when you want the Host play surface without
  choosing a game first

## 2. Create or import a game

The board itself is the editor. Fill the title, category headers, tiles
(question, canonical answer, supported alternates, teacher notes, values), and
Final. Incomplete tiles stay visibly unfinished. Save before you leave if you
want to keep edits.

Spreadsheet import remains the bulk / power path. After import, CQS shows an
**Import quality** report with errors, warnings, and quality notices. You can
download local generation feedback as a text file for a future writing prompt.
CQS does not call an AI service.

## 3. Play a class session

**Play** starts a class session from the saved game. Session scores, team
assignments, buzzes, and wagers belong to that class only. They do not write
back into the reusable game.

**Reset this class session** clears that class run. It does not delete the
saved game.

On Host, **Load a game** remains available for file, spreadsheet, and pack
import during class.

## 4. Set up this class

After **Play**, Host shows **Class setup** before the board when you started
from Home:

- Teams pick names together. Buzzers are optional. Typing always works.
- If buzzers are connected, Yellow / Green / Orange / Blue choose a name.
  Red shows four more names for that team only.
- Open the audience display and test or mute sound before you start.
- **Mute all sounds** is always available.

The product remains usable without controllers. A buzzer failure never
strands the class.

### Repair buzzers (supported Sony set only)

This sequence is only for the exact supported set: Namtai Wbuzz receiver
`054c:1000`. It is set-level. Do not pair only some of the buzzers you
intend to use. A connected receiver does not prove the handsets are
paired.

You do **not** need this for a normal class if the set already works.
Do not re-pair every session.

1. In CQS, start **Repair buzzers**. This pauses the current Sony
   connection. It does not clear saved team assignments.
2. Turn all participating buzzers **off**.
3. On each buzzer, press and **keep holding POWER**. Rapid red/blue
   flashing is normal startup — keep holding. Stop only when the **blue
   light at the bottom stays solid**.
4. Only after every participating buzzer shows solid blue, press/hold
   **BIND** on the receiver. The buzzers should blink together.
5. If they did not blink, do not bind again until every light is solid
   blue.
6. Connect buzzers again if CQS asks, then press **RED** once on each
   buzzer to check it.

Keyboard controls still work the whole time.

## 5. Open the audience display

Choose **Open audience display** (or **Focus audience display** if it is
already open).

On the desktop app, when this computer has exactly one other screen, Classroom
Quiz Show moves the audience display there. If it is still on the wrong screen,
or you are using the browser alternate, put that window on the projector
yourself. Students only see the sanitized public display — never host notes,
answers, or diagnostics.

## 6. Resume after a refresh

If the app refreshes mid-game on the same device, Home and Host offer an
explicit choice to **resume** the unfinished session or discard only that
session. Saved games stay on this device. Nothing requires an account or cloud
login.

## 7. Clear all local CQS data

Classroom Quiz Show stores its durable data only in this browser on this device
(saved games, unfinished sessions, completed summaries, pack media, controller
team mappings, and buzz-key preferences).

On Host, under **Saved games and this class session**, choose **Clear all local
CQS data**, read the warning, and confirm. CQS reports success only after
deletion finishes, then reloads. If another CQS tab still has storage open, the
clear is blocked — close other CQS tabs/windows and try again.

This does **not** uninstall a progressive web app or clear the browser’s ordinary
HTTP cache.

## Tips

- Home / Host = teacher controls. Display = projector.
- Prefer New Game, Import Game, and Play first.
- Advanced diagnostics exist for troubleshooting; they are not required for a
  normal class period.
