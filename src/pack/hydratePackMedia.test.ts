import { describe, expect, it, vi } from 'vitest'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, category, imagePrompt, tile } from '../test/categoryBoardFixtures'
import { exportGameDefinition } from '../export/exportGame'
import { saveDefinition } from '../persistence/savedDefinitions'
import {
  collectReferencedPackScopeKeys,
  enqueueActivePackResourceScopePublish,
  hydratePackMediaForGameText,
} from './hydratePackMedia'
import {
  commitPackMediaAssets,
  gcUnreferencedPackScopes,
  listPackMediaScopeKeys,
} from './packMediaPersistence'
import { createPackResourceRegistry } from './resourceRegistry'
import { resourceScopeKeyFromGameText } from './resourceScope'
import { TINY_PNG_BYTES } from './testFixtures'
import { readActivePackResourceScope } from './packMediaScopeSync'

const PNG_PATH = 'media-fixtures/slice-11-clue.png'
const registry = createDefaultRegistry()

async function definitionWithId(
  id: string,
  options: { readonly path?: string; readonly title?: string } = {},
) {
  const path = options.path ?? PNG_PATH
  const imported = importGameFromUnknown(
    boardGameFile(
      {
        categories: [
          category('a', {
            tiles: [
              tile('a-1', {
                prompt: imagePrompt({
                  source: { kind: 'same-origin-path', path },
                }),
              }),
            ],
          }),
        ],
      },
      { id, title: options.title ?? id },
    ),
  )
  if (imported.status !== 'success') throw new Error('fixture failed')
  return imported.definition
}

async function commitScopeForDefinition(
  adapter: ReturnType<typeof createMemoryPersistenceAdapter>,
  definition: Awaited<ReturnType<typeof definitionWithId>>,
): Promise<string> {
  const exported = exportGameDefinition(definition, { registry })
  if (exported.status !== 'success') throw new Error('export failed')
  const scopeKey = await resourceScopeKeyFromGameText(exported.jsonText)
  const committed = await commitPackMediaAssets(adapter, {
    resourceScopeKey: scopeKey,
    gameId: definition.id,
    gameSha256: scopeKey,
    mediaAssets: [
      {
        sourcePath: PNG_PATH,
        bytes: TINY_PNG_BYTES,
        mediaType: 'image/png',
        sha256: 'abc',
      },
    ],
  })
  if (committed.status !== 'success') throw new Error('commit failed')
  return scopeKey
}

describe('hydratePackMedia concurrency', () => {
  it('keeps the newest hydration when a slower older request finishes later', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const defA = await definitionWithId('hydrate-a')
    const defB = await definitionWithId('hydrate-b')
    const scopeA = await commitScopeForDefinition(adapter, defA)
    const scopeB = await commitScopeForDefinition(adapter, defB)
    const exportedA = exportGameDefinition(defA, { registry })
    const exportedB = exportGameDefinition(defB, { registry })
    if (exportedA.status !== 'success' || exportedB.status !== 'success') {
      throw new Error('export failed')
    }

    const packRegistry = createPackResourceRegistry({
      createObjectURL: () => 'blob:hydrate',
      revokeObjectURL: () => undefined,
    })

    let releaseA!: () => void
    const gateA = new Promise<void>((resolve) => {
      releaseA = resolve
    })
    let generation = 0

    const startA = (async () => {
      const token = ++generation
      const isCurrent = () => token === generation
      await gateA
      await hydratePackMediaForGameText(adapter, exportedA.jsonText, packRegistry, { isCurrent })
    })()

    const startB = (async () => {
      const token = ++generation
      const isCurrent = () => token === generation
      await hydratePackMediaForGameText(adapter, exportedB.jsonText, packRegistry, { isCurrent })
    })()

    await startB
    expect(packRegistry.scopeKey).toBe(scopeB)
    expect(await readActivePackResourceScope(adapter)).toBe(scopeB)

    releaseA()
    await startA
    expect(packRegistry.scopeKey).toBe(scopeB)
    expect(await readActivePackResourceScope(adapter)).toBe(scopeB)
    expect(packRegistry.scopeKey).not.toBe(scopeA)
  })

  it('ignores a stale hydration after a clear request', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const defA = await definitionWithId('hydrate-clear-a')
    const scopeA = await commitScopeForDefinition(adapter, defA)
    const exportedA = exportGameDefinition(defA, { registry })
    if (exportedA.status !== 'success') throw new Error('export failed')

    const packRegistry = createPackResourceRegistry({
      createObjectURL: () => 'blob:hydrate-clear',
      revokeObjectURL: () => undefined,
    })

    let releaseA!: () => void
    const gateA = new Promise<void>((resolve) => {
      releaseA = resolve
    })
    let generation = 0

    const startA = (async () => {
      const token = ++generation
      const isCurrent = () => token === generation
      await gateA
      await hydratePackMediaForGameText(adapter, exportedA.jsonText, packRegistry, { isCurrent })
    })()

    generation += 1
    packRegistry.clear()
    enqueueActivePackResourceScopePublish(adapter, null)
    await vi.waitFor(async () => {
      expect(await readActivePackResourceScope(adapter)).toBeNull()
    })

    releaseA()
    await startA
    expect(packRegistry.scopeKey).toBeNull()
    expect(await readActivePackResourceScope(adapter)).toBeNull()
    expect(scopeA).toMatch(/^[0-9a-f]{64}$/)
  })

  it('does not let a slow clear publish clobber a newer hydration', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const defB = await definitionWithId('hydrate-publish-b')
    const scopeB = await commitScopeForDefinition(adapter, defB)
    const exportedB = exportGameDefinition(defB, { registry })
    if (exportedB.status !== 'success') throw new Error('export failed')

    const packRegistry = createPackResourceRegistry({
      createObjectURL: () => 'blob:hydrate-publish',
      revokeObjectURL: () => undefined,
    })

    enqueueActivePackResourceScopePublish(adapter, null)
    await hydratePackMediaForGameText(adapter, exportedB.jsonText, packRegistry)
    await vi.waitFor(async () => {
      expect(await readActivePackResourceScope(adapter)).toBe(scopeB)
    })
    expect(packRegistry.scopeKey).toBe(scopeB)
  })
})

describe('pack media GC reference lifetime', () => {
  it('retains active and saved scopes and removes scopes after final reference loss', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const defA = await definitionWithId('shared-game', {
      path: 'media-fixtures/scope-a.png',
      title: 'Scope A',
    })
    const defB = await definitionWithId('shared-game', {
      path: 'media-fixtures/scope-b.png',
      title: 'Scope B',
    })
    const scopeA = await commitScopeForDefinition(adapter, defA)
    const scopeB = await commitScopeForDefinition(adapter, defB)
    expect(scopeA).not.toBe(scopeB)

    let keep = await collectReferencedPackScopeKeys(adapter, {
      activeDefinition: defA,
      roundRegistry: registry,
    })
    await gcUnreferencedPackScopes(adapter, { keepScopeKeys: keep })
    expect(await listPackMediaScopeKeys(adapter)).toEqual([scopeA])

    const saved = await saveDefinition(adapter, defA, { mode: 'save', registry })
    expect(saved.ok).toBe(true)
    // Active B while saved A still references scope A — both must survive.
    await commitScopeForDefinition(adapter, defB)
    keep = await collectReferencedPackScopeKeys(adapter, {
      activeDefinition: defB,
      roundRegistry: registry,
    })
    expect(keep.has(scopeA)).toBe(true)
    expect(keep.has(scopeB)).toBe(true)
    await gcUnreferencedPackScopes(adapter, { keepScopeKeys: keep })
    expect(new Set(await listPackMediaScopeKeys(adapter))).toEqual(new Set([scopeA, scopeB]))

    const replaced = await saveDefinition(adapter, defB, { mode: 'replace', registry })
    expect(replaced.ok).toBe(true)
    keep = await collectReferencedPackScopeKeys(adapter, {
      activeDefinition: defB,
      roundRegistry: registry,
    })
    await gcUnreferencedPackScopes(adapter, { keepScopeKeys: keep })
    expect(await listPackMediaScopeKeys(adapter)).toEqual([scopeB])

    keep = await collectReferencedPackScopeKeys(adapter, {
      activeDefinition: null,
      roundRegistry: registry,
    })
    await gcUnreferencedPackScopes(adapter, { keepScopeKeys: keep })
    expect(await listPackMediaScopeKeys(adapter)).toEqual([scopeB])

    const { deleteDefinition } = await import('../persistence/savedDefinitions')
    await deleteDefinition(adapter, defB.id)
    keep = await collectReferencedPackScopeKeys(adapter, {
      activeDefinition: null,
      roundRegistry: registry,
    })
    await gcUnreferencedPackScopes(adapter, { keepScopeKeys: keep })
    expect(await listPackMediaScopeKeys(adapter)).toEqual([])
  })

  it('removes an unsaved active scope after replacement with an unrelated definition', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const defA = await definitionWithId('replace-a')
    const defB = await definitionWithId('replace-b')
    const scopeA = await commitScopeForDefinition(adapter, defA)

    let keep = await collectReferencedPackScopeKeys(adapter, {
      activeDefinition: defA,
      roundRegistry: registry,
    })
    await gcUnreferencedPackScopes(adapter, { keepScopeKeys: keep })
    expect(await listPackMediaScopeKeys(adapter)).toEqual([scopeA])

    const scopeB = await commitScopeForDefinition(adapter, defB)
    keep = await collectReferencedPackScopeKeys(adapter, {
      activeDefinition: defB,
      roundRegistry: registry,
    })
    await gcUnreferencedPackScopes(adapter, { keepScopeKeys: keep })
    expect(await listPackMediaScopeKeys(adapter)).toEqual([scopeB])
  })

  it('retains a saved scope while an active replacement still leaves that saved reference', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const defA = await definitionWithId('keep-saved', {
      path: 'media-fixtures/keep-a.png',
      title: 'Keep A',
    })
    const defB = await definitionWithId('other-active', {
      path: 'media-fixtures/keep-b.png',
      title: 'Keep B',
    })
    const scopeA = await commitScopeForDefinition(adapter, defA)
    const scopeB = await commitScopeForDefinition(adapter, defB)
    await saveDefinition(adapter, defA, { mode: 'save', registry })

    const keep = await collectReferencedPackScopeKeys(adapter, {
      activeDefinition: defB,
      roundRegistry: registry,
    })
    await gcUnreferencedPackScopes(adapter, { keepScopeKeys: keep })
    expect(new Set(await listPackMediaScopeKeys(adapter))).toEqual(new Set([scopeA, scopeB]))
  })
})
