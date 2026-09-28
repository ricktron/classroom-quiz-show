# Claude Design reference packages

- **Document id:** `CQS-CLAUDE-DESIGN-REFERENCE-ARTIFACTS`
- **Kind:** durable preferred visual-design evidence index
- **Authority:** **not** implementation, architecture, privacy, or product
  authority. Repository canon and owner decisions win over these artifacts.
- **Not** CQS source code.

```text
preferred design evidence ≠ implementation authority
repo canon + owner decisions win
```

This directory indexes **immutable dated packages**. Each package lives in its
own dated folder. Never overwrite a prior dated folder or recompress a
committed ZIP in place.

---

## Package A — Audience / Display (2026-09-27)

Rick supplied and approved this Claude Design package as the preferred
visual-design reference for **Audience / Display presentation** work. It
informed Display visual-convergence decisions recorded in
[`../../../CQS-DISPLAY-VISUAL-CONVERGENCE.md`](../../../CQS-DISPLAY-VISUAL-CONVERGENCE.md).

These files are **design evidence only**. They do not authorize product
changes, do not override PublicState / privacy boundaries, and do not replace
accepted ADRs, the Product Contract, UX doctrine, or observed merged code.

| Field | Value |
| --- | --- |
| Title | Claude Design reference package (Audience / Display) |
| Path | [`2026-09-27/CQS-Claude-Design-Reference-Package.zip`](2026-09-27/CQS-Claude-Design-Reference-Package.zip) |
| Filename | `CQS-Claude-Design-Reference-Package.zip` |
| Byte size | `215071` |
| SHA-256 | `730573b599d00f6c3731539ed43ff1798cbd88db1d072334b1811e3b273261f0` |
| Date added | `2026-09-27` (folder date); committed with the durable-store packet that landed as PR #111 |
| Secondary provenance | Google Drive file id `1-xxDu-PwLRRHTAFw45IFYzZ-bPUx3NzN` (`CQS-Claude-Design-Reference-Package-restored.zip`) |
| Purpose | Preferred visual-design evidence for Audience / Display presentation convergence |
| Authority boundary | Preferred evidence only. **Not** authority for Host menus, Class Setup IA, engine behavior, Session schema, Sony hardware claims, or platform qualification |

### Top-level contents

- `CQS Directions.dc.html`
- `CQS Prototype2.dc.html`
- `Phase 1 design directions delivered.zip`
- `CQS Slice 17 Design System.zip`

### How to inspect

Do **not** modify the committed ZIP. Do **not** recompress, rename internals,
or overwrite `2026-09-27/`.

```bash
# Integrity
wc -c docs/design/reference-artifacts/claude-design/2026-09-27/CQS-Claude-Design-Reference-Package.zip
sha256sum docs/design/reference-artifacts/claude-design/2026-09-27/CQS-Claude-Design-Reference-Package.zip
unzip -t docs/design/reference-artifacts/claude-design/2026-09-27/CQS-Claude-Design-Reference-Package.zip

# Inspect in a disposable temp directory only
TMP=$(mktemp -d)
unzip -q docs/design/reference-artifacts/claude-design/2026-09-27/CQS-Claude-Design-Reference-Package.zip -d "$TMP"
# …read / render from "$TMP"…
rm -rf "$TMP"
```

---

## Package B — CQS MENUS D04 — B-Adapted pre-game workflow (2026-09-28)

| Field | Value |
| --- | --- |
| Title | **CQS MENUS D04 — B-Adapted pre-game workflow** |
| Version | **D04-R1 · v1.1** |
| Path | [`2026-09-28/CQS-MENUS-D04-REFERENCE.zip`](2026-09-28/CQS-MENUS-D04-REFERENCE.zip) |
| Filename | `CQS-MENUS-D04-REFERENCE.zip` |
| Byte size | `165850` |
| SHA-256 | `a17e8cad628806a533b10e16c637a6dcaa349b79220fa051ba5c1c3c577df612` |
| Date added | `2026-09-28` (folder date); stored as exact accepted bytes (no repack) |
| Purpose | Preferred design evidence for the teacher-facing **Home → Play → class setup → Ready → Start → in-game Host** pre-game workflow (B-Adapted Console structure + Ledger tone), after D02 Court IA settlement and D04-R1 fidelity repair |
| Authority boundary | Preferred design evidence only. **Not** implementation authority. **Not** authority for gameplay engine behavior, persistence semantics, Sony hardware behavior, Audience / Display implementation, Windows/platform support claims, exact implementation mechanism, or Game vs Session ownership / Session schema. Repository canon and owner decisions win. Storing this package does **not** authorize MENUS product slices |

### Top-level contents (under `CQS-MENUS-D04-REFERENCE/`)

- `CQS-MENUS-D04.dc.html` — package document (frames, notes, tensions, ledger)
- `D04-Console.dc.html` — clickable prototype (`frame=` pins)
- `d04-data.js` — sample content + readiness model mirror (design only)
- `support.js` — Design Component runtime
- `README.md` — identity, authority, scope, provenance
- `MANIFEST.md` — file list and per-file SHA-256

### How to inspect

Do **not** modify the committed ZIP. Do **not** recompress, rename internals,
or overwrite `2026-09-28/`. Do **not** touch `2026-09-27/`.

```bash
# Integrity
wc -c docs/design/reference-artifacts/claude-design/2026-09-28/CQS-MENUS-D04-REFERENCE.zip
sha256sum docs/design/reference-artifacts/claude-design/2026-09-28/CQS-MENUS-D04-REFERENCE.zip
unzip -t docs/design/reference-artifacts/claude-design/2026-09-28/CQS-MENUS-D04-REFERENCE.zip

# Inspect in a disposable temp directory only
TMP=$(mktemp -d)
unzip -q docs/design/reference-artifacts/claude-design/2026-09-28/CQS-MENUS-D04-REFERENCE.zip -d "$TMP"
# Open "$TMP/CQS-MENUS-D04-REFERENCE/CQS-MENUS-D04.dc.html" in a browser
rm -rf "$TMP"
```

### Related planning (not this package)

Bounded MENUS implementation planning (when registered) lives under
[`../../../plans/CQS-MENUS-PRE-GAME-WORKFLOW-IMPLEMENTATION-PLAN.md`](../../../plans/CQS-MENUS-PRE-GAME-WORKFLOW-IMPLEMENTATION-PLAN.md).
That plan is subordinate to the REAL MVP Program plan of record and does
**not** itself authorize product code.

---

## Later packages

Later packages get **new dated folders** under this directory. Never overwrite
`2026-09-27/`, `2026-09-28/`, or replace an immutable ZIP in place.

## Non-claims

- Not CQS source code or a runnable product surface.
- Not architecture, privacy, PublicState, or product-scope authority.
- Not authorization to begin S04D, S06, MENUS product slices, or any successor
  product work.
- No Git LFS; packages are stored as ordinary committed bytes.
- Audience / Display package (2026-09-27) and MENUS D04 package (2026-09-28)
  are distinct evidence sets for distinct surfaces; neither overrides the other.
