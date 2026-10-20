import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { useClassSessionReset } from './useClassSessionReset'

/**
 * The per-class clearing mechanism the two input panels use instead of being
 * remounted (CBN-NEW-1).
 *
 * Those panels own the teacher's durable device setup — keyboard bindings,
 * controller mapping, receiver and handset evidence — which must survive a class
 * reset, so they cannot simply be keyed on the session like the gameplay panels.
 * This hook is what makes "clear only the per-class slice" safe, so the claims
 * it rests on are pinned here rather than only through the browser.
 */

/** A panel with one per-class slice and one durable slice. */
function Panel({ classSessionId }: { readonly classSessionId?: string | null }) {
  const [perClass, setPerClass] = useState('')
  const [durable, setDurable] = useState('')
  const [renders, setRenders] = useState(0)
  useClassSessionReset(classSessionId, () => {
    setPerClass('')
  })
  // Counts commits, so a hook that cleared on every pass would run away.
  if (renders < 50) void renders
  return (
    <div>
      <output data-testid="per-class">{perClass}</output>
      <output data-testid="durable">{durable}</output>
      <button type="button" onClick={() => setPerClass('this class buzzed')}>
        record play
      </button>
      <button type="button" onClick={() => setDurable('buzzer 1 is red')}>
        record setup
      </button>
      <button type="button" onClick={() => setRenders((count) => count + 1)}>
        rerender
      </button>
    </div>
  )
}

const perClass = () => screen.getByTestId('per-class')
const durable = () => screen.getByTestId('durable')
const fill = () => {
  fireEvent.click(screen.getByRole('button', { name: 'record play' }))
  fireEvent.click(screen.getByRole('button', { name: 'record setup' }))
}

describe('useClassSessionReset', () => {
  it('clears the per-class slice when the class session changes, and keeps the durable one', () => {
    const view = render(<Panel classSessionId="period-1" />)
    fill()
    expect(perClass()).toHaveTextContent('this class buzzed')

    view.rerender(<Panel classSessionId="period-2" />)
    expect(perClass()).toHaveTextContent('')
    expect(durable()).toHaveTextContent('buzzer 1 is red')
  })

  it('clears once, not on every later render of the same class', () => {
    const view = render(<Panel classSessionId="period-1" />)
    view.rerender(<Panel classSessionId="period-2" />)
    fill()

    // Same class from here on: re-rendering must not keep wiping what this class
    // has done. A hook without its guard would clear on every pass.
    view.rerender(<Panel classSessionId="period-2" />)
    fireEvent.click(screen.getByRole('button', { name: 'rerender' }))
    view.rerender(<Panel classSessionId="period-2" />)
    expect(perClass()).toHaveTextContent('this class buzzed')
  })

  it('never fires when no class session is supplied', () => {
    // Isolated panel tests render these panels without the prop; they have only
    // ever one class and must not be disturbed.
    const clear = vi.fn()
    function Bare() {
      useClassSessionReset(undefined, clear)
      return <output data-testid="per-class">bare</output>
    }
    const view = render(<Bare />)
    view.rerender(<Bare />)
    expect(clear).not.toHaveBeenCalled()
  })

  it('fires again on each further class, including back to a previous id', () => {
    const view = render(<Panel classSessionId="period-1" />)
    fill()
    view.rerender(<Panel classSessionId="period-2" />)
    expect(perClass()).toHaveTextContent('')

    fireEvent.click(screen.getByRole('button', { name: 'record play' }))
    view.rerender(<Panel classSessionId="period-3" />)
    expect(perClass()).toHaveTextContent('')

    fireEvent.click(screen.getByRole('button', { name: 'record play' }))
    view.rerender(<Panel classSessionId="period-1" />)
    expect(perClass()).toHaveTextContent('')
    expect(durable()).toHaveTextContent('buzzer 1 is red')
  })
})
