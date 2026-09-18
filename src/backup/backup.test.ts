import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { createSampleGame } from '../game/sampleGame'
import { createGameDefinition } from '../game/gameDefinition'
import { placeholderRound } from '../game/roundDefinition'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { saveDefinition, listSavedDefinitions, loadDefinition } from '../persistence/savedDefinitions'
import { commitPackMediaAssets } from '../pack/packMediaPersistence'
import { sha256Hex } from '../pack/hash'
import type { DownloadEnvironment } from '../export/downloadGameFile'
import {
  BACKUP_FORMAT,
  BACKUP_MIME,
  BACKUP_SCHEMA_VERSION,
  applyStagedBackup,
  buildBackupFromAdapter,
  downloadBackupFile,
  parseBackupFromJsonText,
} from './index'

async function openAdapter() {
  const adapter = createMemoryPersistenceAdapter()
  await adapter.open()
  return adapter
}

describe('S04C-H3 backup foundations', () => {
  it('builds an empty backup when the library is empty', async () => {
    const adapter = await openAdapter()
    const built = await buildBackupFromAdapter({ adapter })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return
    expect(built.document.format).toBe(BACKUP_FORMAT)
    expect(built.document.schemaVersion).toBe(BACKUP_SCHEMA_VERSION)
    expect(built.document.games).toEqual([])
    expect(built.document.packMedia).toEqual([])
    expect(built.filename).toBe('classroom-quiz-show.backup.json')
  })

  it('round-trips saved games through build → parse → apply', async () => {
    const adapter = await openAdapter()
    const registry = createDefaultRegistry()
    const game = createSampleGame()
    await saveDefinition(adapter, game, { mode: 'save', registry })

    const built = await buildBackupFromAdapter({ adapter, registry })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return
    expect(built.metadata.gameCount).toBe(1)
    expect(built.jsonText).toContain(BACKUP_FORMAT)
    expect(built.jsonText).not.toContain('"events"')

    const target = await openAdapter()
    const parsed = await parseBackupFromJsonText(built.jsonText, { registry })
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.staged.newCount).toBe(1)
    expect(parsed.staged.conflictCount).toBe(0)

    const applied = await applyStagedBackup({
      adapter: target,
      staged: parsed.staged,
    })
    expect(applied.status).toBe('success')
    if (applied.status !== 'success') return
    expect(applied.appliedGameCount).toBe(1)

    const listed = await listSavedDefinitions(target)
    expect(listed.ok).toBe(true)
    if (!listed.ok) return
    expect(listed.value).toHaveLength(1)
    expect(listed.value[0]?.gameId).toBe(game.id)

    const loaded = await loadDefinition(target, game.id, registry)
    expect(loaded.ok).toBe(true)
  })

  it('fails closed on wrong format and unsupported schema version', async () => {
    const wrongFormat = JSON.stringify({
      format: 'classroom-quiz-show/game',
      schemaVersion: 1,
      exportedAt: 1,
      appVersion: '0.1.0',
      games: [],
      packMedia: [],
    })
    const parsedFormat = await parseBackupFromJsonText(wrongFormat)
    expect(parsedFormat.status).toBe('failure')
    if (parsedFormat.status === 'failure') {
      expect(parsedFormat.issues.some((i) => i.code === 'unsupported-format')).toBe(true)
    }

    const future = JSON.stringify({
      format: BACKUP_FORMAT,
      schemaVersion: 99,
      exportedAt: 1,
      appVersion: '0.1.0',
      games: [],
      packMedia: [],
    })
    const parsedVersion = await parseBackupFromJsonText(future)
    expect(parsedVersion.status).toBe('failure')
    if (parsedVersion.status === 'failure') {
      expect(parsedVersion.issues.some((i) => i.code === 'unsupported-schema-version')).toBe(true)
    }
  })

  it('fails closed on unknown fields, unsafe keys, and malformed game payloads', async () => {
    const unknownField = `${JSON.stringify({
      format: BACKUP_FORMAT,
      schemaVersion: 1,
      exportedAt: 1,
      appVersion: '0.1.0',
      games: [],
      packMedia: [],
      extra: true,
    })}\n`
    const unknown = await parseBackupFromJsonText(unknownField)
    expect(unknown.status).toBe('failure')

    const unsafeText =
      '{"format":"classroom-quiz-show/backup","schemaVersion":1,"exportedAt":1,"appVersion":"0.1.0","games":[],"packMedia":[],"__proto__":{"x":1}}\n'
    const unsafeParsed = await parseBackupFromJsonText(unsafeText)
    expect(unsafeParsed.status).toBe('failure')
    if (unsafeParsed.status === 'failure') {
      expect(unsafeParsed.issues.some((i) => i.code === 'unsafe-object-key' || i.code === 'unknown-field')).toBe(
        true,
      )
    }

    const badGame = `${JSON.stringify({
      format: BACKUP_FORMAT,
      schemaVersion: 1,
      exportedAt: 1,
      appVersion: '0.1.0',
      games: [
        {
          gameId: 'bad',
          title: 'Bad',
          savedAt: 1,
          playable: false,
          jsonText: '{"not":"a-game"}',
        },
      ],
      packMedia: [],
    })}\n`
    const badParsed = await parseBackupFromJsonText(badGame)
    expect(badParsed.status).toBe('failure')
    if (badParsed.status === 'failure') {
      expect(badParsed.issues.some((i) => i.code === 'game-import-failed')).toBe(true)
    }
  })

  it('requires confirmation before replacing existing games and writes nothing without it', async () => {
    const registry = createDefaultRegistry()
    const source = await openAdapter()
    const game = createSampleGame()
    await saveDefinition(source, game, { mode: 'save', registry })
    const built = await buildBackupFromAdapter({ adapter: source, registry })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return

    const target = await openAdapter()
    const existing = createGameDefinition({
      id: game.id,
      title: 'Existing Different Title',
      rounds: [placeholderRound('round-1', 'Keep Me')],
    })
    await saveDefinition(target, existing, { mode: 'save', registry })

    const existingGames = new Map([[game.id, existing.title]])
    const parsed = await parseBackupFromJsonText(built.jsonText, { registry, existingGames })
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.staged.conflictCount).toBe(1)

    const blocked = await applyStagedBackup({
      adapter: target,
      staged: parsed.staged,
      confirmReplaceConflicts: false,
    })
    expect(blocked.status).toBe('failure')
    if (blocked.status === 'failure') {
      expect(blocked.issues.some((i) => i.code === 'needs-confirmation')).toBe(true)
    }

    const still = await loadDefinition(target, game.id, registry)
    expect(still.ok).toBe(true)
    if (still.ok) expect(still.value.title).toBe('Existing Different Title')

    const applied = await applyStagedBackup({
      adapter: target,
      staged: parsed.staged,
      confirmReplaceConflicts: true,
    })
    expect(applied.status).toBe('success')
    const replaced = await loadDefinition(target, game.id, registry)
    expect(replaced.ok).toBe(true)
    if (replaced.ok) expect(replaced.value.title).toBe(game.title)
  })

  it('does not include active session data in the backup file', async () => {
    const adapter = await openAdapter()
    const registry = createDefaultRegistry()
    const game = createSampleGame()
    await saveDefinition(adapter, game, { mode: 'save', registry })
    await adapter.withTransaction(['activeSessions'], async (tx) => {
      await tx.put('activeSessions', 'current', {
        format: 'classroom-quiz-show/persistence-session',
        schemaVersion: 1,
        savedAt: 42,
        events: [{ type: 'SECRET_SESSION_MARKER', at: 1 }],
      })
    })

    const built = await buildBackupFromAdapter({ adapter, registry })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return
    expect(built.jsonText).not.toMatch(/persistence-session/)
    expect(built.jsonText).not.toContain('SECRET_SESSION_MARKER')
    expect(built.jsonText).not.toContain('"events"')
  })

  it('round-trips pack media with integrity checks and fails on tampered hash', async () => {
    const adapter = await openAdapter()
    const registry = createDefaultRegistry()
    const game = createSampleGame()
    await saveDefinition(adapter, game, { mode: 'save', registry })

    const { TINY_PNG_BYTES } = await import('../pack/testFixtures')
    const digest = await sha256Hex(TINY_PNG_BYTES)
    await commitPackMediaAssets(adapter, {
      resourceScopeKey: 'scope-1',
      gameId: game.id,
      gameSha256: 'a'.repeat(64),
      mediaAssets: [
        {
          sourcePath: 'media/sample.png',
          bytes: TINY_PNG_BYTES,
          sha256: digest,
          mediaType: 'image/png',
        },
      ],
    })

    const built = await buildBackupFromAdapter({ adapter, registry })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return
    expect(built.metadata.mediaCount).toBe(1)

    const target = await openAdapter()
    const parsed = await parseBackupFromJsonText(built.jsonText, { registry })
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    const applied = await applyStagedBackup({ adapter: target, staged: parsed.staged })
    expect(applied.status).toBe('success')
    if (applied.status === 'success') {
      expect(applied.appliedMediaCount).toBe(1)
    }

    const tampered = JSON.parse(built.jsonText) as {
      packMedia: Array<{ sha256: string }>
    }
    tampered.packMedia[0]!.sha256 = 'b'.repeat(64)
    const bad = await parseBackupFromJsonText(`${JSON.stringify(tampered)}\n`, { registry })
    expect(bad.status).toBe('failure')
    if (bad.status === 'failure') {
      expect(bad.issues.some((i) => i.code === 'media-integrity-failed')).toBe(true)
    }
  })

  it('aborts apply when stillValid becomes false before write', async () => {
    const registry = createDefaultRegistry()
    const source = await openAdapter()
    const game = createSampleGame()
    await saveDefinition(source, game, { mode: 'save', registry })
    const built = await buildBackupFromAdapter({ adapter: source, registry })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return
    const parsed = await parseBackupFromJsonText(built.jsonText, { registry })
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return

    const target = await openAdapter()
    const aborted = await applyStagedBackup({
      adapter: target,
      staged: parsed.staged,
      stillValid: () => false,
    })
    expect(aborted.status).toBe('failure')
    if (aborted.status === 'failure') {
      expect(aborted.issues.some((i) => i.code === 'apply-aborted')).toBe(true)
    }
    const listed = await listSavedDefinitions(target)
    expect(listed.ok).toBe(true)
    if (listed.ok) expect(listed.value).toHaveLength(0)
  })

  it('aborts before commit when stillValid flips false during the transaction', async () => {
    const registry = createDefaultRegistry()
    const source = await openAdapter()
    const game = createSampleGame()
    await saveDefinition(source, game, { mode: 'save', registry })
    const built = await buildBackupFromAdapter({ adapter: source, registry })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return
    const parsed = await parseBackupFromJsonText(built.jsonText, { registry })
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return

    const target = await openAdapter()
    let calls = 0
    const aborted = await applyStagedBackup({
      adapter: target,
      staged: parsed.staged,
      // Calls 1–3: outer guards + pre-mutation check (allow). Call 4: pre-commit (deny).
      stillValid: () => {
        calls += 1
        return calls < 4
      },
    })
    expect(aborted.status).toBe('failure')
    if (aborted.status === 'failure') {
      expect(aborted.issues.some((i) => i.code === 'apply-aborted')).toBe(true)
    }
    const listed = await listSavedDefinitions(target)
    expect(listed.ok).toBe(true)
    if (listed.ok) expect(listed.value).toHaveLength(0)
  })

  it('keeps success after commit even if stillValid later becomes false', async () => {
    const registry = createDefaultRegistry()
    const source = await openAdapter()
    const game = createSampleGame()
    await saveDefinition(source, game, { mode: 'save', registry })
    const built = await buildBackupFromAdapter({ adapter: source, registry })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return
    const parsed = await parseBackupFromJsonText(built.jsonText, { registry })
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return

    const target = await openAdapter()
    let allow = true
    const applied = await applyStagedBackup({
      adapter: target,
      staged: parsed.staged,
      stillValid: () => allow,
    })
    expect(applied.status).toBe('success')
    allow = false
    const listed = await listSavedDefinitions(target)
    expect(listed.ok).toBe(true)
    if (listed.ok) {
      expect(listed.value.some((entry) => entry.gameId === game.id)).toBe(true)
    }
  })

  it('wires BACKUP_MIME into the download Blob (MIME is never import trust)', async () => {
    const blobs: Array<{ type: string; parts: BlobPart[] }> = []
    const OriginalBlob = globalThis.Blob
    globalThis.Blob = class CapturingBlob {
      readonly type: string
      readonly parts: BlobPart[]
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        this.parts = parts
        this.type = options?.type ?? ''
        blobs.push({ type: this.type, parts: this.parts })
      }
    } as unknown as typeof Blob

    const env: DownloadEnvironment = {
      createObjectURL: () => 'blob:backup-test',
      revokeObjectURL: () => undefined,
      createAnchor: () => {
        const anchor = document.createElement('a')
        anchor.click = () => undefined
        return anchor
      },
      appendAnchor: (anchor) => {
        document.body.appendChild(anchor)
      },
      removeAnchor: (anchor) => {
        anchor.remove()
      },
      scheduleCleanup: (callback) => {
        callback()
      },
    }

    try {
      downloadBackupFile(
        { filename: 'classroom-quiz-show.backup.json', text: '{"format":"x"}\n' },
        env,
      )
      expect(blobs).toHaveLength(1)
      expect(blobs[0]!.type).toBe(BACKUP_MIME)
      // Filename/MIME alone remain insufficient for import trust.
      const spoof = await parseBackupFromJsonText('not-a-backup')
      expect(spoof.status).toBe('failure')
    } finally {
      globalThis.Blob = OriginalBlob
    }
  })

  it('filename/extension alone is not sufficient — parse still validates', async () => {
    const spoof = 'not-json-at-all'
    const parsed = await parseBackupFromJsonText(spoof)
    expect(parsed.status).toBe('failure')
    if (parsed.status === 'failure') {
      expect(parsed.issues.some((i) => i.code === 'invalid-json')).toBe(true)
    }
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})
