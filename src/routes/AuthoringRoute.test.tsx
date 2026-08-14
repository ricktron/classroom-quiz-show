import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { createNewLibraryGame } from '../library/gameLibrary'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { AuthoringRoute } from './AuthoringRoute'
import { editPath } from './paths'

async function renderEditor() {
  const adapter = createMemoryPersistenceAdapter()
  await adapter.open()
  const registry = createDefaultRegistry()
  const created = await createNewLibraryGame(adapter, registry)
  if (!created.ok) throw new Error(created.message)
  const gameId = created.value.definition.id
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>Home page</p> },
      {
        path: '/edit/:gameId',
        element: (
          <AuthoringRoute
            persistenceOptions={{
              createAdapter: () => adapter,
              tabId: 'authoring-test',
              broadcastChannel: null,
            }}
          />
        ),
      },
    ],
    { initialEntries: [editPath(gameId)] },
  )
  render(<RouterProvider router={router} />)
  await waitFor(() => {
    expect(screen.getByLabelText(/game title/i)).toBeInTheDocument()
  })
  return { adapter, gameId }
}

describe('in-app board authoring', () => {
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
})
