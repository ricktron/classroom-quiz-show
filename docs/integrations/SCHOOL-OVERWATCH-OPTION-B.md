# School Overwatch registration (Option B)

Classroom Quiz Show registers into School Overwatch via Mac school-auth clasp
(**Option B**). Apps Script Execution API is **not** used.

## Hook

```bash
# After GitHub Pages deploy succeeds for this repo:
npm run register:overwatch
# Optional Overwatch embed push/deploy:
npm run register:overwatch -- --push --deploy
```

Requires a local `ricktron/school-overwatch` checkout (`SOW_ROOT` or sibling path)
and school clasp login (`rgarnett@nchstx.org`).

Evidence is the GitHub Pages deployment API (deployment id + successful status +
SHA). HTTP 200 alone is insufficient. `releaseDecisionId` is bound as
`github-pages-deployment:<id>` — never invented.

## Boundary

This hook does not widen CQS product scope, does not add Google credentials to
CI, and does not modify GCS / NightWatch / Forge.
