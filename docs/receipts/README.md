# Receipts

A **receipt** is a lightweight, durable record of verification evidence — proof
that a claim ("tests pass", "deploy succeeded") was actually observed, not
assumed. This is a deliberately small practice borrowed from NightWatch, not a
heavy registry.

## When to write a receipt

Write one when you want durable evidence for a meaningful claim, e.g.:

- a slice's full verification run (`verify:all`) passed,
- CI went green on a specific commit,
- a GitHub Pages deployment went live and the URLs loaded,
- a risky change was validated.

Do **not** create a receipt for every commit or routine command.

## Format

One Markdown file per receipt: `docs/receipts/YYYY-MM-DD-<slug>.md`.
Keep it short and factual:

```md
# <what was verified>

- **Date:** YYYY-MM-DD
- **Slice / PR:** <slice number> / #<pr>
- **Commit:** <short SHA>
- **Environment:** <local | GitHub Actions | Pages>

## Commands & results

| Command             | Result | Notes                         |
| ------------------- | ------ | ----------------------------- |
| npm run lint        | pass   |                               |
| npm run typecheck   | pass   |                               |
| npm run test:run    | pass   | N passed                      |
| npm run build       | pass   |                               |
| npm run test:e2e    | pass   | N passed / M skipped          |

## Evidence

<links to CI run, deployment URL, or pasted summary lines>

## Caveats

<anything not proven, e.g. "CI not yet observed", "Pages not yet live">
```

## Principles

- **Only record what was actually observed.** Never mark a command as passing
  unless it was executed successfully.
- **Name caveats explicitly.** An unverified claim must be labeled unverified.
- Receipts are evidence, not status — status lives in [`../STATUS.md`](../STATUS.md).
