import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { applyDraftCorrection } from '../authoring'
import type { AuthoringDraft } from '../authoring/types'
import { createNewLibraryGame, saveAuthoringDraftToLibrary } from '../library/gameLibrary'
import { acquireOrRenewHostLease } from '../persistence/coordination'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { listSavedDefinitions, loadDefinition } from '../persistence'
import type { PersistenceAdapter, PersistenceTx } from '../persistence/adapter'
import { createManualClock, type ManualClock } from '../time/clock'
import { AuthoringRoute } from './AuthoringRoute'
import { editPath } from './paths'
import type { UseHostPersistenceOptions } from '../host/useHostPersistence'

const IMPLEMENTATION_LEAK =
  /persistence lease|host tab owns persistence|indexeddb|object store|\badapter\b|\bwire\b|transaction/i

function trackDurableWrites(adapter: PersistenceAdapter): { savedDefinitions: number; activeSessions: number } {
  const counts = { savedDefinitions: 0, activeSessions: 0 }
  const original = adapter.withTransaction.bind(adapter)
  adapter.withTransaction = (stores, work) =>
    original(stores, async (tx: PersistenceTx) => {
      const put = tx.put.bind(tx)
      const del = tx.delete.bind(tx)
      await work({
        get: tx.get.bind(tx),
        getAll: tx.getAll.bind(tx),
        getAllKeys: tx.getAllKeys.bind(tx),
        put: async (store, key, value) => {
          if (store === 'savedDefinitions') counts.savedDefinitions += 1
          if (store === 'activeSessions') counts.activeSessions += 1
          return put(store, key, value)
        },
        delete: async (store, key) => {
          if (store === 'savedDefinitions') counts.savedDefinitions += 1
          if (store === 'activeSessions') counts.activeSessions += 1
          return del(store, key)
        },
      })
    })
  return counts
}

type EditorOptions = UseHostPersistenceOptions & {
  adapter?: PersistenceAdapter
  /** Shape the saved draft before the editor opens it (applied, then saved). */
  prepareDraft?: (draft: AuthoringDraft) => AuthoringDraft
}

function mountEditor(adapter: PersistenceAdapter, gameId: string, options: EditorOptions = {}) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>Home page</p> },
      { path: '/host', element: <p>Host page</p> },
      {
        path: '/edit/:gameId',
        element: (
          <AuthoringRoute
            persistenceOptions={{
              createAdapter: () => adapter,
              tabId: options.tabId ?? 'authoring-test',
              broadcastChannel: options.broadcastChannel ?? null,
              clock: options.clock,
              leaseTtlMs: options.leaseTtlMs,
              renewIntervalMs: options.renewIntervalMs,
            }}
          />
        ),
      },
    ],
    { initialEntries: [editPath(gameId)] },
  )
  return render(<RouterProvider router={router} />)
}

async function renderEditor(options: EditorOptions = {}) {
  const adapter = options.adapter ?? createMemoryPersistenceAdapter()
  await adapter.open()
  const registry = createDefaultRegistry()
  const created = await createNewLibraryGame(adapter, registry)
  if (!created.ok) throw new Error(created.message)
  const gameId = created.value.definition.id
  if (options.prepareDraft) {
    const prepared = await saveAuthoringDraftToLibrary(
      adapter,
      options.prepareDraft(created.value.draft),
      registry,
    )
    if (!prepared.ok) throw new Error(prepared.message)
  }
  const view = mountEditor(adapter, gameId, options)
  await waitFor(() => {
    expect(screen.getByLabelText(/game title/i)).toBeInTheDocument()
  })
  return { adapter, gameId, unmount: view.unmount }
}

/** Every board tile authored; Final left exactly as New Game creates it (empty). */
function completeBoard(draft: AuthoringDraft): AuthoringDraft {
  let next = draft
  for (const category of draft.board.categories) {
    for (const clue of category.clues) {
      next = applyDraftCorrection(next, {
        kind: 'clue-field',
        categoryOrder: clue.categoryOrder,
        clueOrder: clue.clueOrder,
        field: 'prompt',
        value: `Question ${clue.categoryOrder}-${clue.clueOrder}`,
      })
      next = applyDraftCorrection(next, {
        kind: 'clue-field',
        categoryOrder: clue.categoryOrder,
        clueOrder: clue.clueOrder,
        field: 'answer',
        value: `Answer ${clue.categoryOrder}-${clue.clueOrder}`,
      })
    }
  }
  return next
}

async function stealLeadership(adapter: PersistenceAdapter, clock: ManualClock): Promise<void> {
  clock.advance(5_000)
  await acquireOrRenewHostLease({
    adapter,
    tabId: 'other-window',
    clock,
    leaseTtlMs: 60_000,
    broadcastChannel: null,
  })
}

describe('in-app board authoring', () => {
  it('shows Saved after opening a durable game with no edits', async () => {
    await renderEditor()
    expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/^saved$/i)
  })

  it('opens New Game on the first incomplete tile and keeps team settings secondary', async () => {
    await renderEditor()
    await waitFor(() => {
      expect(screen.getByTestId('tile-editor')).toBeInTheDocument()
    })
    expect(screen.getByTestId('tile-editor')).toHaveTextContent(/category 1/i)
    expect(screen.getByTestId('authoring-game-settings')).toBeInTheDocument()
    expect(screen.getByTestId('authoring-game-settings')).not.toHaveAttribute('open')
    expect(screen.getByTestId('team-name-bank')).not.toBeVisible()
    expect(screen.getByTestId('authoring-team-count')).not.toBeVisible()
    expect(screen.getByTestId('authoring-goal')).toHaveTextContent(/fill the board first/i)
    // H5: first incomplete clue is selected; Final precedes Game settings in DOM.
    const selected = screen.getByRole('button', { pressed: true })
    expect(selected).toHaveAccessibleName(/incomplete/i)
    expect(selected).toHaveClass('authoring-board__tile--selected')
    const finalHeading = screen.getByRole('heading', { name: /^final$/i })
    const settings = screen.getByTestId('authoring-game-settings')
    expect(
      finalHeading.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByTestId('authoring-validation')).toHaveTextContent(
      /missing questions or answers/i,
    )
  })

  it('edits title, a tile, and Final without claiming a false Saved state', async () => {
    await renderEditor()
    const title = screen.getByLabelText(/game title/i)
    fireEvent.change(title, { target: { value: 'Weather Board' } })
    expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/unsaved/i)
    expect(screen.getByTestId('authoring-validation')).toHaveTextContent(/missing questions or answers/i)

    fireEvent.click(screen.getByRole('button', { name: /category 1 100, incomplete/i }))
    fireEvent.change(screen.getByLabelText(/^question$/i), {
      target: { value: 'What is condensation?' },
    })
    fireEvent.change(screen.getByLabelText(/^canonical answer$/i), {
      target: { value: 'gas to liquid' },
    })
    fireEvent.change(screen.getByLabelText(/final question/i), {
      target: { value: 'Name the water cycle step after evaporation.' },
    })
    fireEvent.change(screen.getByLabelText(/final canonical answer/i), {
      target: { value: 'condensation' },
    })

    fireEvent.click(screen.getByTestId('authoring-save'))
    await waitFor(() => {
      expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/^saved$/i)
    })
  })

  it('asks before discarding unsaved edits and previews without starting a session', async () => {
    await renderEditor()
    fireEvent.change(screen.getByLabelText(/game title/i), { target: { value: 'Unsaved Title' } })
    fireEvent.click(screen.getByTestId('authoring-home'))
    expect(screen.getByRole('alert')).toHaveTextContent(/unsaved changes/i)
    fireEvent.click(screen.getByRole('button', { name: /^stay$/i }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /preview board/i }))
    expect(screen.getByTestId('authoring-preview')).toHaveTextContent(/does not start a class session/i)
  })

  it('blocks follower Save before any library write and keeps edits in memory', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const clock = createManualClock(1_000_000)
    await adapter.open()
    await acquireOrRenewHostLease({
      adapter,
      tabId: 'other-window',
      clock,
      leaseTtlMs: 60_000,
      broadcastChannel: null,
    })
    await renderEditor({
      adapter,
      clock,
      tabId: 'authoring-follower',
      leaseTtlMs: 1_000,
      renewIntervalMs: 20,
      broadcastChannel: null,
    })
    await waitFor(() => {
      expect(screen.getByTestId('authoring-follower-notice')).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText(/game title/i), { target: { value: 'Follower Keeps This' } })
    const writes = trackDurableWrites(adapter)
    fireEvent.click(screen.getByTestId('authoring-save'))
    /*
      Deliberately over-constrained: this asserts the one SETTLED copy a failed
      write produces today, so it will also red on an honest copy change. That
      direction is safe — stricter, never weaker — and it is the only way to
      bind the assertion to a settled state rather than to the pre-save
      "Unsaved" that a negative check would have caught.
    */
    await waitFor(() => {
      expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/save problem/i)
    })
    expect(writes.savedDefinitions).toBe(0)
    expect(screen.getByLabelText(/game title/i)).toHaveValue('Follower Keeps This')
    expect(document.body.textContent).not.toMatch(IMPLEMENTATION_LEAK)
  })

  it('blocks Save after a leader-to-follower transition without losing unsaved edits', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const clock = createManualClock(1_000_000)
    await renderEditor({
      adapter,
      clock,
      tabId: 'authoring-leader',
      leaseTtlMs: 1_000,
      renewIntervalMs: 20,
      broadcastChannel: null,
    })
    fireEvent.change(screen.getByLabelText(/game title/i), { target: { value: 'Still In This Window' } })
    expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/unsaved/i)
    await stealLeadership(adapter, clock)
    await waitFor(() => {
      expect(screen.getByTestId('authoring-follower-notice')).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/game title/i)).toHaveValue('Still In This Window')
    const writes = trackDurableWrites(adapter)
    fireEvent.click(screen.getByTestId('authoring-save'))
    /*
      Deliberately over-constrained: this asserts the one SETTLED copy a failed
      write produces today, so it will also red on an honest copy change. That
      direction is safe — stricter, never weaker — and it is the only way to
      bind the assertion to a settled state rather than to the pre-save
      "Unsaved" that a negative check would have caught.
    */
    await waitFor(() => {
      expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/save problem/i)
    })
    expect(writes.savedDefinitions).toBe(0)
    expect(screen.getByLabelText(/game title/i)).toHaveValue('Still In This Window')
    expect(screen.getByTestId('authoring-follower-notice')).toHaveTextContent(
      /another classroom quiz show window is currently responsible for saving/i,
    )
  })

  it('exposes Game-owned team count 1–8 via add/remove from the high end', async () => {
    await renderEditor()
    const settings = screen.getByTestId('authoring-game-settings')
    expect(settings).not.toHaveAttribute('open')
    fireEvent.click(settings.querySelector('summary')!)
    await waitFor(() => {
      expect(screen.getByTestId('authoring-team-count')).toBeVisible()
    })
    const count = screen.getByTestId('authoring-team-count')
    expect(count).toHaveValue(2)
    expect(screen.getByLabelText(/^team 1$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^team 2$/i)).toBeInTheDocument()

    fireEvent.change(count, { target: { value: '3' } })
    expect(screen.getByTestId('authoring-team-count')).toHaveValue(3)
    expect(screen.getByLabelText(/^team 3$/i)).toHaveValue('Team 3')
    expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/unsaved/i)

    fireEvent.change(screen.getByLabelText(/^team 1$/i), { target: { value: 'Survivors' } })
    fireEvent.change(count, { target: { value: '1' } })
    expect(screen.getByTestId('authoring-team-count')).toHaveValue(1)
    expect(screen.getByLabelText(/^team 1$/i)).toHaveValue('Survivors')
    expect(screen.queryByLabelText(/^team 2$/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^team 3$/i)).not.toBeInTheDocument()

    fireEvent.change(count, { target: { value: '9' } })
    expect(screen.getByTestId('authoring-team-count')).toHaveValue(8)
    fireEvent.change(count, { target: { value: '0' } })
    expect(screen.getByTestId('authoring-team-count')).toHaveValue(1)
  })

  it('opens Game settings Team count from Class Setup authoringFocus navigation state', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const registry = createDefaultRegistry()
    const created = await createNewLibraryGame(adapter, registry)
    if (!created.ok) throw new Error(created.message)
    const gameId = created.value.definition.id
    const router = createMemoryRouter(
      [
        {
          path: '/edit/:gameId',
          element: (
            <AuthoringRoute
              persistenceOptions={{
                createAdapter: () => adapter,
                tabId: 'authoring-focus-test',
                broadcastChannel: null,
              }}
            />
          ),
        },
      ],
      {
        initialEntries: [
          {
            pathname: editPath(gameId),
            state: { authoringFocus: 'team-count' },
          },
        ],
      },
    )
    render(<RouterProvider router={router} />)
    await waitFor(() => {
      expect(screen.getByTestId('authoring-game-settings')).toHaveAttribute('open')
    })
    expect(screen.getByTestId('authoring-team-count')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByTestId('authoring-team-count'))
    })
  })
})

/**
 * M04 — R4 authoring durability, second layer.
 *
 * The existing browser detector watches the editor; this drives the real
 * AuthoringRoute and then READS THE GAME BACK through the persistence adapter.
 * The mutation it is built to kill: Save reporting "Saved" while writing
 * nothing — a teacher losing a period of authoring to a status line that lied.
 *
 * "Saved" from the UI is not evidence of durability. Only a read-back is.
 */
describe('M04: Save means the Game is really on the device', () => {
  it('writes the edited title through to the adapter, with its identity intact', async () => {
    const { adapter, gameId } = await renderEditor()
    const registry = createDefaultRegistry()

    const before = await loadDefinition(adapter, gameId, registry)
    expect(before.ok).toBe(true)
    const originalTitle = before.ok ? before.value.title : ''

    const title = screen.getByLabelText(/game title/i)
    fireEvent.change(title, { target: { value: 'Plate Tectonics Review' } })
    fireEvent.blur(title)

    await waitFor(() => {
      expect(screen.getByTestId('authoring-save')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('authoring-save'))
    await waitFor(() => {
      expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/^saved$/i)
    })

    // The claim under test: read it back, do not trust the status line.
    const after = await loadDefinition(adapter, gameId, registry)
    expect(after.ok).toBe(true)
    if (!after.ok) throw new Error('saved game could not be read back')
    expect(after.value.title).toBe('Plate Tectonics Review')
    expect(after.value.title).not.toBe(originalTitle)

    // Identity survives the edit: this is the SAME game, not a new one.
    expect(after.value.id).toBe(gameId)
    const listed = await listSavedDefinitions(adapter)
    expect(listed.ok).toBe(true)
    if (!listed.ok) throw new Error('library could not be listed')
    expect(listed.value.filter((entry) => entry.gameId === gameId)).toHaveLength(1)
    expect(listed.value.find((entry) => entry.gameId === gameId)?.title).toBe(
      'Plate Tectonics Review',
    )
  })

  it('does not report Saved when the write actually fails', async () => {
    const { adapter } = await renderEditor()
    const title = screen.getByLabelText(/game title/i)
    fireEvent.change(title, { target: { value: 'Will Not Persist' } })
    fireEvent.blur(title)
    await waitFor(() => {
      expect(screen.getByTestId('authoring-save')).toBeEnabled()
    })

    // Every durable write now fails. "Saved" would be a lie.
    const failing = adapter as unknown as {
      withTransaction: PersistenceAdapter['withTransaction']
    }
    failing.withTransaction = async () => ({
      ok: false,
      code: 'transaction-failed',
      message: 'write refused',
    })

    fireEvent.click(screen.getByTestId('authoring-save'))

    /*
      Assert the SETTLED text positively. A negative `waitFor` resolves on its
      first synchronous check, when the status still reads "Unsaved" from the
      edit — before the click's async save has settled at all — so it would pass
      against the very lie this test names. Verified: with that negative
      assertion, mutating `completeSave` to treat a failed write as ok let the
      status settle to "Saved" and all ten tests still passed.
    */
    /*
      Deliberately over-constrained: this asserts the one SETTLED copy a failed
      write produces today, so it will also red on an honest copy change. That
      direction is safe — stricter, never weaker — and it is the only way to
      bind the assertion to a settled state rather than to the pre-save
      "Unsaved" that a negative check would have caught.
    */
    await waitFor(() => {
      expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/save problem/i)
    })
    expect(screen.getByTestId('authoring-save-status')).not.toHaveTextContent(/^saved$/i)
  })
})

/**
 * UIX-O16: the editor told a teacher "This game has the required content and
 * can be played" for a complete board with an empty Final, which the canonical
 * import boundary refuses. Readiness shown here must never outrun that boundary.
 */
describe('UIX-O16: the editor never claims an incomplete Final can be played', () => {
  const validation = () => screen.getByTestId('authoring-validation')
  const play = () => screen.getByRole('button', { name: /^play$/i })
  const finalQuestion = () => screen.getByLabelText(/final question/i)
  const finalAnswer = () => screen.getByLabelText(/final canonical answer/i)

  it('names the missing Final content, keeps Save available, and keeps Play unavailable', async () => {
    await renderEditor({ prepareDraft: completeBoard })

    expect(screen.queryAllByRole('button', { name: /, incomplete$/i })).toHaveLength(0)
    expect(validation()).not.toHaveTextContent(/can be played/i)
    expect(validation()).toHaveTextContent(/final still needs a question and an answer/i)
    expect(validation()).toHaveTextContent(/save and come back/i)
    expect(play()).toBeDisabled()
    expect(screen.getByTestId('authoring-save')).toBeEnabled()

    // The diagnostics sit on the fields that need the work, and are announced with them.
    expect(finalQuestion()).toHaveAttribute('aria-invalid', 'true')
    expect(finalQuestion()).toHaveAccessibleDescription(/final needs a question/i)
    expect(finalAnswer()).toHaveAttribute('aria-invalid', 'true')
    expect(finalAnswer()).toHaveAccessibleDescription(/final needs an answer/i)
  })

  it('follows partial Final content in both directions with no stale readiness', async () => {
    await renderEditor({ prepareDraft: completeBoard })

    // Question only: the answer is still a blocker, and only the answer.
    fireEvent.change(finalQuestion(), { target: { value: 'Name a high cloud.' } })
    expect(validation()).toHaveTextContent(/final still needs an answer/i)
    expect(validation()).not.toHaveTextContent(/a question/i)
    expect(validation()).not.toHaveTextContent(/can be played/i)
    expect(finalQuestion()).not.toHaveAttribute('aria-invalid', 'true')
    expect(screen.queryByTestId('final-prompt-help')).not.toBeInTheDocument()
    expect(screen.getByTestId('final-answer-help')).toBeInTheDocument()
    expect(play()).toBeDisabled()

    // Both present: the Final diagnostics clear and the ordinary path opens.
    fireEvent.change(finalAnswer(), { target: { value: 'Cirrus' } })
    expect(validation()).toHaveTextContent(/can be played/i)
    expect(screen.queryByTestId('final-prompt-help')).not.toBeInTheDocument()
    expect(screen.queryByTestId('final-answer-help')).not.toBeInTheDocument()
    expect(finalAnswer()).not.toHaveAttribute('aria-invalid', 'true')

    // Whitespace is not an answer: the blocker returns and the success claim goes.
    fireEvent.change(finalAnswer(), { target: { value: '   ' } })
    expect(validation()).not.toHaveTextContent(/can be played/i)
    expect(validation()).toHaveTextContent(/final still needs an answer/i)
    expect(finalAnswer()).toHaveAttribute('aria-invalid', 'true')
    expect(play()).toBeDisabled()

    // Answer only: the question is the blocker.
    fireEvent.change(finalAnswer(), { target: { value: 'Cirrus' } })
    fireEvent.change(finalQuestion(), { target: { value: '' } })
    expect(validation()).not.toHaveTextContent(/can be played/i)
    expect(validation()).toHaveTextContent(/final still needs a question/i)
    expect(validation()).not.toHaveTextContent(/an answer/i)
    expect(screen.getByTestId('final-prompt-help')).toBeInTheDocument()
    expect(screen.queryByTestId('final-answer-help')).not.toBeInTheDocument()
    expect(play()).toBeDisabled()
  })

  it('saves an incomplete Final as a draft, reopens it intact, and plays once Final is complete', async () => {
    const { adapter, gameId, unmount } = await renderEditor({ prepareDraft: completeBoard })
    const registry = createDefaultRegistry()

    fireEvent.change(screen.getByLabelText(/game title/i), { target: { value: 'Cloud Review' } })
    fireEvent.change(finalQuestion(), { target: { value: 'Name a high cloud.' } })
    fireEvent.click(screen.getByTestId('authoring-save'))
    await waitFor(() => {
      expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/^saved$/i)
    })
    // Saved is not the same claim as playable.
    expect(validation()).not.toHaveTextContent(/can be played/i)
    expect(validation()).toHaveTextContent(/final still needs an answer/i)
    expect(play()).toBeDisabled()
    const savedIncomplete = await listSavedDefinitions(adapter)
    if (!savedIncomplete.ok) throw new Error('library could not be listed')
    expect(savedIncomplete.value.find((entry) => entry.gameId === gameId)).toEqual(
      expect.objectContaining({ playable: false, title: 'Cloud Review' }),
    )

    // Leave and come back: same Game, same content, same honest readiness.
    unmount()
    // Leaving releases the editor's storage handle asynchronously. Wait for that
    // release so the reopened editor boots its own handle, as a real revisit does.
    await waitFor(async () => {
      expect((await listSavedDefinitions(adapter)).ok).toBe(false)
    })
    mountEditor(adapter, gameId)
    await waitFor(() => {
      expect(screen.getByLabelText(/game title/i)).toHaveValue('Cloud Review')
    })
    expect(finalQuestion()).toHaveValue('Name a high cloud.')
    expect(finalAnswer()).toHaveValue('')
    expect(screen.queryAllByRole('button', { name: /, incomplete$/i })).toHaveLength(0)
    expect(validation()).toHaveTextContent(/final still needs an answer/i)
    expect(play()).toBeDisabled()

    // Finish Final: the normal Save → playable path works.
    fireEvent.change(finalAnswer(), { target: { value: 'Cirrus' } })
    expect(validation()).toHaveTextContent(/can be played/i)
    fireEvent.click(screen.getByTestId('authoring-save'))
    await waitFor(() => {
      expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/^saved$/i)
    })
    await waitFor(() => {
      expect(play()).toBeEnabled()
    })
    const played = await loadDefinition(adapter, gameId, registry)
    if (!played.ok) throw new Error('saved game could not be read back')
    expect(played.value.id).toBe(gameId)
    expect(played.value.rounds.map((round) => round.type)).toEqual(['category-board', 'final-wager'])
    const savedComplete = await listSavedDefinitions(adapter)
    if (!savedComplete.ok) throw new Error('library could not be listed')
    expect(savedComplete.value.find((entry) => entry.gameId === gameId)).toEqual(
      expect.objectContaining({ playable: true }),
    )
  })

  it('does not claim playable for any draft the canonical check refuses', async () => {
    // Readiness is the canonical check's answer, not only the draft validator's:
    // a blank game title is refused by the importer though the draft has no blocker.
    await renderEditor({
      prepareDraft: (draft) => {
        let next = completeBoard(draft)
        next = applyDraftCorrection(next, { kind: 'final-field', field: 'prompt', value: 'Name a high cloud.' })
        return applyDraftCorrection(next, { kind: 'final-field', field: 'answer', value: 'Cirrus' })
      },
    })
    expect(validation()).toHaveTextContent(/can be played/i)
    await waitFor(() => {
      expect(play()).toBeEnabled()
    })

    fireEvent.change(screen.getByLabelText(/game title/i), { target: { value: '' } })
    expect(validation()).not.toHaveTextContent(/can be played/i)
    expect(validation()).toHaveTextContent(/not ready to play/i)
    expect(play()).toBeDisabled()

    fireEvent.change(screen.getByLabelText(/game title/i), { target: { value: 'Cloud Review' } })
    expect(validation()).toHaveTextContent(/can be played/i)
  })
})
