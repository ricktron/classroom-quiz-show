# Claude Design reference package

- **Document id:** `CQS-CLAUDE-DESIGN-REFERENCE-ARTIFACTS`
- **Kind:** durable preferred visual-design evidence index
- **Authority:** **not** implementation, architecture, privacy, or product
  authority. Repository canon and owner decisions win over these artifacts.
- **Not** CQS source code.

## What this is

Rick supplied and approved this Claude Design package as the preferred
visual-design reference for Audience / Display presentation work. It informed
Display visual-convergence decisions recorded in
[`../../../CQS-DISPLAY-VISUAL-CONVERGENCE.md`](../../../CQS-DISPLAY-VISUAL-CONVERGENCE.md).

These files are **design evidence only**. They do not authorize product
changes, do not override PublicState / privacy boundaries, and do not replace
accepted ADRs, the Product Contract, UX doctrine, or observed merged code.

```text
preferred design evidence ≠ implementation authority
repo canon + owner decisions win
```

## Immutable package (current)

| Field | Value |
| --- | --- |
| Path | [`2026-09-27/CQS-Claude-Design-Reference-Package.zip`](2026-09-27/CQS-Claude-Design-Reference-Package.zip) |
| Filename | `CQS-Claude-Design-Reference-Package.zip` |
| Byte size | `215071` |
| SHA-256 | `730573b599d00f6c3731539ed43ff1798cbd88db1d072334b1811e3b273261f0` |
| Date added | `2026-09-27` (folder date); committed with this durable-store packet |
| Secondary provenance | Google Drive file id `1-xxDu-PwLRRHTAFw45IFYzZ-bPUx3NzN` (`CQS-Claude-Design-Reference-Package-restored.zip`) |

### Top-level contents

- `CQS Directions.dc.html`
- `CQS Prototype2.dc.html`
- `Phase 1 design directions delivered.zip`
- `CQS Slice 17 Design System.zip`

## How to inspect

Do **not** modify the committed ZIP. Do **not** recompress, rename internals,
or overwrite this dated folder.

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

## Later packages

Later packages get **new dated folders** under this directory. Never overwrite
`2026-09-27/` or replace the immutable ZIP in place.

## Non-claims

- Not CQS source code or a runnable product surface.
- Not architecture, privacy, PublicState, or product-scope authority.
- Not authorization to begin S04D, S06, or any successor product work.
- No Git LFS; the package is stored as ordinary committed bytes.
