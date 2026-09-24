/**
 * Emits docs/design/history/2026-09-s05-complete/CAPTURE-MANIFEST.json from the
 * TypeScript capture registry. Run via: npx tsx scripts/emit-visual-history-manifest.ts
 * or imported by the capture test. Kept as plain Node-compatible TS for vitest.
 */

import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  VISUAL_HISTORY_SURFACES,
  automatedSurfaces,
  ownerLocalSurfaces,
  s06DeferredSurfaces,
} from '../src/test/visualHistoryCaptureRegistry'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.resolve(HERE, '../docs/design/history/2026-09-s05-complete/CAPTURE-MANIFEST.json')

export function buildCaptureManifest(options: {
  readonly canonicalSha: string
  readonly capturedAt: string
  readonly milestone: string
}) {
  const automated = automatedSurfaces()
  return {
    schemaVersion: 1,
    repository: 'ricktron/classroom-quiz-show',
    milestone: options.milestone,
    canonicalBaseSha: options.canonicalSha,
    capturedAt: options.capturedAt,
    s05ParentStatus: 'OPEN / NOT TERMINAL',
    ownerPlaythrough: 'NOT RUN',
    s04d: 'NOT AUTHORIZED',
    s06: 'NOT AUTHORIZED',
    counts: {
      surfacesInventoried: VISUAL_HISTORY_SURFACES.length,
      automatedCapture: automated.length,
      ownerOrLocalCapture: ownerLocalSurfaces().length,
      s06Deferred: s06DeferredSurfaces().length,
    },
    surfaces: VISUAL_HISTORY_SURFACES.map((s) => ({
      id: s.id,
      title: s.title,
      role: s.role,
      class: s.class,
      authority: s.authority,
      folder: s.folder,
      basename: s.basename,
      path:
        s.basename === null
          ? null
          : `screenshots/${s.folder}/${s.basename}`,
      viewport: s.viewport,
      route: s.route,
      privacy: s.privacy,
      purpose: s.purpose,
      trigger: s.trigger,
      components: s.components,
      ownerInspectionRequired: s.ownerInspectionRequired,
      notes: s.notes ?? null,
    })),
  }
}

const sha = process.env.CQS_VISUAL_HISTORY_SHA ?? 'UNSET'
const manifest = buildCaptureManifest({
  canonicalSha: sha,
  capturedAt: new Date().toISOString().slice(0, 10),
  milestone: 'S05 presentation children complete / pre-owner-playthrough',
})

writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`Wrote ${OUT} (${manifest.counts.surfacesInventoried} surfaces)`)
