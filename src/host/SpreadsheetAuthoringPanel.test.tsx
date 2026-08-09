import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createSessionStore } from '../state/store'
import { generateWorkbookTemplate } from '../authoring'
import { SpreadsheetAuthoringPanel } from './SpreadsheetAuthoringPanel'

function renderPanel(
  options: {
    hasSession?: boolean
    bytesByName?: Map<string, Uint8Array>
  } = {},
) {
  const store = createSessionStore()
  if (options.hasSession !== false) {
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 'session-1' })
  }
  const bytesByName = options.bytesByName ?? new Map<string, Uint8Array>()
  const downloadTemplate = vi.fn(() => ({ filename: 'mock.xlsx' }))
  const view = render(
    <SpreadsheetAuthoringPanel
      dispatch={(command) => store.dispatch(command)}
      registry={store.getRegistry()}
      hasSession={options.hasSession !== false}
      activeGame={store.getState().session?.game ?? null}
      downloadTemplate={downloadTemplate}
      readFileBytes={async (file) => {
        const bytes = bytesByName.get(file.name)
        if (!bytes) throw new Error(`missing bytes for ${file.name}`)
        return bytes
      }}
    />,
  )
  return { store, downloadTemplate, bytesByName, ...view }
}

async function uploadNamed(bytesByName: Map<string, Uint8Array>, filename: string, bytes: Uint8Array) {
  bytesByName.set(filename, bytes)
  const input = screen.getByTestId('spreadsheet-upload') as HTMLInputElement
  const file = new File([new Uint8Array(bytes)], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  fireEvent.change(input, { target: { files: [file] } })
  await waitFor(() => {
    expect(screen.getByTestId('spreadsheet-filename')).toHaveTextContent(filename)
  })
}

describe('SpreadsheetAuthoringPanel', () => {
  it('offers both template downloads', () => {
    const { downloadTemplate } = renderPanel()
    fireEvent.click(screen.getByTestId('spreadsheet-download-classic'))
    fireEvent.click(screen.getByTestId('spreadsheet-download-final'))
    expect(downloadTemplate).toHaveBeenCalledWith('classic-board')
    expect(downloadTemplate).toHaveBeenCalledWith('board-plus-final')
  })

  it(
    'uploads a valid classic workbook, reviews, requires approval, then loads',
    async () => {
    const { store, bytesByName } = renderPanel()
    const template = generateWorkbookTemplate('classic-board')
    await uploadNamed(bytesByName, template.filename, template.bytes)

    await waitFor(() => {
      expect(screen.getByTestId('spreadsheet-profile')).toHaveTextContent('classic-board')
      expect(screen.getByTestId('spreadsheet-review')).toBeInTheDocument()
    })

    expect(screen.getByTestId('spreadsheet-approve')).toBeEnabled()
    expect(screen.getByTestId('spreadsheet-trusted')).toHaveTextContent('none')

    fireEvent.click(screen.getByTestId('spreadsheet-approve'))
    await waitFor(() => {
      expect(screen.getByTestId('spreadsheet-trusted')).not.toHaveTextContent('none')
    })
    expect(store.getState().session?.game).toBeNull()

    fireEvent.click(screen.getByTestId('spreadsheet-load'))
    await waitFor(() => {
      expect(screen.getByTestId('spreadsheet-load-outcome')).toHaveTextContent('loaded')
    })
    expect(store.getState().session?.game?.definition.title).toContain('Earth')
    },
    20_000,
  )

  it(
    'clears stale success when a new workbook is selected',
    async () => {
      const { bytesByName } = renderPanel()
      const classic = generateWorkbookTemplate('classic-board')
      await uploadNamed(bytesByName, classic.filename, classic.bytes)
      await waitFor(() => expect(screen.getByTestId('spreadsheet-approve')).toBeEnabled(), {
        timeout: 15_000,
      })
      fireEvent.click(screen.getByTestId('spreadsheet-approve'))
      await waitFor(
        () => {
          expect(screen.getByTestId('spreadsheet-trusted')).not.toHaveTextContent('none')
        },
        { timeout: 15_000 },
      )

      const finalTemplate = generateWorkbookTemplate('board-plus-final')
      await uploadNamed(bytesByName, finalTemplate.filename, finalTemplate.bytes)
      await waitFor(
        () => {
          expect(screen.getByTestId('spreadsheet-profile')).toHaveTextContent('board-plus-final')
          expect(screen.getByTestId('spreadsheet-trusted')).toHaveTextContent('none')
        },
        { timeout: 15_000 },
      )
    },
    30_000,
  )

  it(
    'disables approval while blockers remain and shows diagnostics',
    async () => {
      const { bytesByName } = renderPanel()
      await uploadNamed(bytesByName, 'bad.xlsx', new Uint8Array([1, 2, 3, 4]))
      await waitFor(
        () => {
          expect(screen.getByTestId('spreadsheet-diagnostics')).toBeInTheDocument()
        },
        { timeout: 10_000 },
      )
      expect(screen.getByTestId('spreadsheet-approve')).toBeDisabled()
    },
    15_000,
  )

  it(
    'supports bounded correction and revalidation',
    async () => {
      const { bytesByName } = renderPanel()
      const template = generateWorkbookTemplate('classic-board')
      await uploadNamed(bytesByName, template.filename, template.bytes)
      await waitFor(() => expect(screen.getByTestId('spreadsheet-correct-title')).toBeInTheDocument(), {
        timeout: 15_000,
      })
      fireEvent.change(screen.getByTestId('spreadsheet-correct-title'), {
        target: { value: 'Corrected Title' },
      })
      expect(screen.getByTestId('spreadsheet-review-title')).toHaveTextContent('Corrected Title')
    },
    20_000,
  )
})
