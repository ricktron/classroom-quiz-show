# Teacher quick start

Classroom Quiz Show is a local-first classroom game-show host. You run a private
**Host** screen on your laptop; students watch the public **Display** on the
projector.

The conventional teacher path is the **desktop application**. See
[`DESKTOP.md`](DESKTOP.md) for install/start, unsigned-artifact warnings, and
manual updates. The GitHub Pages PWA remains a supported alternate.

## 1. Open the Host

From the start screen, choose **Open Host**.

Keep this screen private — do not project it to students.

## 2. Load or create a game

On the Host, use one of the ordinary content paths under **Load a game**:

- **Import a game file** — paste a supported game JSON file, or use a built-in
  sample
- **Spreadsheet authoring** — download a template, fill it, upload the workbook,
  approve it, then load
- **Import portable pack** — choose a `.cqs-pack` file when you have one

If no game session exists yet, loading content starts one automatically. You do
not need a hidden “initialize session” step first.

You can also choose **Start new game session** when you want an explicit fresh
session before loading.

## 3. Set up teams and controllers

After a game is loaded:

- Use the teams and scoring controls to prepare teams
- Optional: pair keyboard or controller buzzers on the host
- Optional: enable presentation sound for classroom cues

The product remains usable without controllers.

## 4. Open the audience display

Choose **Open display in new window**.

Put that window on the projector. Students only see the sanitized public
display — never host notes, answers, or diagnostics.

## 5. Begin gameplay

Run the board and scoring from the Host. The Display follows automatically.

## 6. Resume after a refresh

If the browser refreshes mid-game on the same device, the Host offers an
explicit choice to **resume** the unfinished session or discard recovery. Saved
game definitions stay on this device only; nothing requires an account or cloud
login.

## 7. Clear all local CQS data

Classroom Quiz Show stores its durable data only in this browser on this device
(saved games, unfinished sessions, completed summaries, pack media, controller
team mappings, and buzz-key preferences).

On the Host, under **Persistence & recovery**, choose **Clear all local CQS
data**, read the warning, and confirm. CQS reports success only after deletion
finishes, then reloads a clean Host. If another CQS tab still has storage open,
the clear is blocked — close other CQS tabs/windows and try again.

This does **not** uninstall a progressive web app or clear the browser’s ordinary
HTTP cache.

## Tips

- Host = teacher controls. Display = projector.
- Prefer ordinary classroom labels and the Load a game section first.
- Advanced diagnostics exist for troubleshooting; they are not required for a
  normal class period.
