#!/usr/bin/env node

const archives = {
  s05: {
    archive: 'docs/design/history/2026-09-s05-complete/',
    implementationSha: '4368cc9eeb7dbf3ef342926e1d0fba7ba4c10f9b',
    historicalCommand: 'npm run capture:visual-history',
  },
  menus: {
    archive: 'docs/design/history/2026-09-menus-pre-owner-gate/',
    implementationSha: '1404b517921a5182a57291b3d7df36d464245ee5',
    historicalCommand: 'npm run capture:visual-history:menus',
  },
}

const key = process.argv[2]
const record = archives[key]

if (!record) {
  console.error('Unknown historian archive guard. Expected one of: s05, menus.')
  process.exit(2)
}

console.error(
  [
    'Historical capture blocked on current code.',
    '',
    `Archive: ${record.archive}`,
    `Bound implementation SHA: ${record.implementationSha}`,
    '',
    'This archive is immutable historical evidence. Do not regenerate it from current main.',
    'For forensic regeneration, use an isolated checkout/worktree at the bound implementation SHA',
    `and run that checkout's recorded command: ${record.historicalCommand}`,
    '',
    'For a new product milestone, create a new archive and a new/parameterized capture target',
    'after the milestone implementation SHA is explicitly frozen.',
  ].join('\n'),
)
process.exit(1)
