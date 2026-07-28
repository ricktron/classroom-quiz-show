import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createSessionStore } from '../state/store'
import { importGameFromJsonText } from '../import/importGame'
import { boardGameFileText, imagePrompt, richBoardConfig } from '../test/categoryBoardFixtures'
import { gameFileText } from '../test/gameFileFixtures'
import { teamBoardGameFile, twoTeams } from '../test/teamFixtures'
import { GameExportPanel } from './GameExportPanel'
import type { GameDefinition } from '../game/gameDefinition'

function loadDefinition(text: string): GameDefinition {
  const imported = importGameFromJsonText(text)
  if (imported.status !== 'success') throw new Error('fixture import failed')
  return imported.definition
}

function renderExport(options: {
  definition?: GameDefinition | null
  download?: ReturnType<typeof vi.fn>
} = {}) {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 'session-1' })
  const definition = options.definition === undefined ? null : options.definition
  const download =
    options.download ??
    vi.fn((input: { filename: string; text: string }) => {
      void input
    })

  render(
    <GameExportPanel
      definition={definition}
      registry={store.getRegistry()}
      download={download}
    />,
  )

  return { store, download }
}

describe('GameExportPanel', () => {
  it('disables download and shows no-game state when nothing is loaded', () => {
    renderExport({ definition: null })
    expect(screen.getByTestId('export-no-game')).toHaveTextContent('No game loaded.')
    expect(screen.getByTestId('export-download')).toBeDisabled()
    expect(screen.queryByTestId('export-answer-warning')).toBeNull()
  })

  it('shows game identity summary when a game is loaded', () => {
    const definition = loadDefinition(
      JSON.stringify(
        teamBoardGameFile(twoTeams(), richBoardConfig(), {
          id: 'ecology-review',
          title: 'Ecology Review',
        }),
      ),
    )
    renderExport({ definition })
    expect(screen.getByTestId('export-game-title')).toHaveTextContent('Ecology Review')
    expect(screen.getByTestId('export-game-id')).toHaveTextContent('ecology-review')
    expect(screen.getByTestId('export-round-count')).toHaveTextContent('1')
    expect(screen.getByTestId('export-team-count')).toHaveTextContent('2')
    expect(screen.getByTestId('export-download')).toBeEnabled()
    expect(screen.getByRole('button', { name: /download game file/i })).toBeEnabled()
  })

  it('exports successfully and invokes the download adapter', () => {
    const definition = loadDefinition(gameFileText({ id: 'panel-export' }))
    const download = vi.fn()
    const { store } = renderExport({ definition, download })
    const beforeRevision = store.getState().revision
    const beforeHistory = store.getHistory().length

    fireEvent.click(screen.getByTestId('export-download'))

    expect(download).toHaveBeenCalledTimes(1)
    const [input] = download.mock.calls[0]!
    expect(input.filename).toBe('panel-export.classroom-quiz-show.json')
    expect(input.text.endsWith('\n')).toBe(true)
    expect(screen.getByTestId('export-result')).toHaveTextContent(
      'Export ready: panel-export.classroom-quiz-show.json',
    )
    expect(store.getState().revision).toBe(beforeRevision)
    expect(store.getHistory()).toHaveLength(beforeHistory)
  })

  it('shows export failure without downloading', () => {
    const base = loadDefinition(gameFileText({ id: 'fail-export' }))
    const bad = {
      ...base,
      rounds: [
        {
          ...base.rounds[0]!,
          type: 'not-a-real-round-type' as typeof base.rounds[0]['type'],
        },
      ],
    }
    const download = vi.fn()
    renderExport({ definition: bad, download })
    fireEvent.click(screen.getByTestId('export-download'))
    expect(download).not.toHaveBeenCalled()
    expect(screen.getByTestId('export-result')).toHaveTextContent(/export failed/i)
    expect(screen.getByTestId('export-issues')).toHaveTextContent('round-trip-import-failed')
  })

  it('reports download failure without claiming export success', () => {
    const definition = loadDefinition(gameFileText({ id: 'dl-fail' }))
    const download = vi.fn(() => {
      throw new Error('boom')
    })
    renderExport({ definition, download })
    fireEvent.click(screen.getByTestId('export-download'))
    expect(screen.getByTestId('export-result')).toHaveTextContent(/download failed/i)
    expect(screen.getByTestId('export-result')).not.toHaveTextContent(/export ready/i)
  })

  it('always shows the answer-key warning when a game is loaded', () => {
    const definition = loadDefinition(gameFileText({ id: 'warn' }))
    renderExport({ definition })
    expect(screen.getByTestId('export-answer-warning')).toHaveTextContent(
      /answer keys, alternates, and teacher notes/i,
    )
  })

  it('shows the media warning only when image prompts exist', () => {
    const plain = loadDefinition(gameFileText({ id: 'plain' }))
    renderExport({ definition: plain })
    expect(screen.queryByTestId('export-media-warning')).toBeNull()
  })

  it('shows the media warning when the loaded game has an image prompt', () => {
    const withMedia = loadDefinition(
      boardGameFileText(
        {
          categories: [
            {
              id: 'c',
              title: 'C',
              tiles: [
                {
                  id: 't1',
                  value: 100,
                  prompt: imagePrompt(),
                  answer: 'A',
                },
              ],
            },
          ],
        },
        { id: 'with-media' },
      ),
    )
    renderExport({ definition: withMedia })
    expect(screen.getByTestId('export-media-warning')).toHaveTextContent(
      /preserves media paths but does not include/i,
    )
  })

  it('repeated exports of the unchanged game produce identical bytes and filename', () => {
    const definition = loadDefinition(gameFileText({ id: 'repeat' }))
    const download = vi.fn()
    renderExport({ definition, download })
    fireEvent.click(screen.getByTestId('export-download'))
    fireEvent.click(screen.getByTestId('export-download'))
    expect(download).toHaveBeenCalledTimes(2)
    expect(download.mock.calls[0]![0]).toEqual(download.mock.calls[1]![0])
  })

  it('exposes an accessible heading and live status region', () => {
    renderExport({ definition: null })
    expect(screen.getByRole('heading', { name: /export portable game file/i })).toBeVisible()
    expect(screen.getByLabelText(/export status/i)).toBeVisible()
  })

  it('does not dispatch commands or mutate store state', () => {
    const definition = loadDefinition(gameFileText({ id: 'no-dispatch' }))
    const { store, download } = renderExport({ definition })
    const before = {
      revision: store.getState().revision,
      historyLength: store.getHistory().length,
      sessionId: store.getState().session?.sessionId,
    }
    fireEvent.click(screen.getByTestId('export-download'))
    expect(download).toHaveBeenCalled()
    expect(store.getState().revision).toBe(before.revision)
    expect(store.getHistory()).toHaveLength(before.historyLength)
    expect(store.getState().session?.sessionId).toBe(before.sessionId)
  })
})
