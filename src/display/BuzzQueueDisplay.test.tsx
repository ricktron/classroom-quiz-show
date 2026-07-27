import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BuzzQueueDisplay } from './BuzzQueueDisplay'
import type { PublicBuzzState, PublicTeamsState } from '../state/publicState'
import { FORBIDDEN_DISPLAY_LABELS } from '../test/leakLabels'

/**
 * The projector buzz panel (Slice 8).
 *
 * The claims proved here:
 *  - the class can read WHO is answering, in words;
 *  - the waiting queue is a COUNT, never a list and never an order;
 *  - "nobody has buzzed" renders nothing at all, so the projector is not sharing
 *    the clue with an empty panel;
 *  - "everyone has had a turn" is visibly different from "nobody has buzzed";
 *  - nothing host-only, and nothing about a key or a device, can appear.
 */

const TEAMS: PublicTeamsState = {
  status: 'available',
  teams: [
    { key: 't0', name: 'Red Team', accent: 'crimson', score: 0 },
    { key: 't1', name: 'Blue Team', accent: 'azure', score: 200 },
  ],
}

function renderBuzz(buzz: PublicBuzzState, teams: PublicTeamsState | null = TEAMS) {
  return render(<BuzzQueueDisplay buzz={buzz} teams={teams} />)
}

describe('what the class can read', () => {
  it('renders nothing at all until somebody buzzes', () => {
    const { container } = renderBuzz({ status: 'none' })
    expect(container).toBeEmptyDOMElement()
  })

  it('names the team that is answering', () => {
    renderBuzz({ status: 'active', activeTeamKey: 't1', waitingCount: 0 })
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('Blue Team')
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-status', 'active')
  })

  it('states the waiting queue as a count, in words', () => {
    renderBuzz({ status: 'active', activeTeamKey: 't0', waitingCount: 0 })
    expect(screen.getByTestId('bqd-waiting')).toHaveTextContent('No teams waiting')
  })

  it('pluralizes the count correctly', () => {
    const { rerender } = renderBuzz({ status: 'active', activeTeamKey: 't0', waitingCount: 1 })
    expect(screen.getByTestId('bqd-waiting')).toHaveTextContent('1 team waiting')
    rerender(
      <BuzzQueueDisplay
        buzz={{ status: 'active', activeTeamKey: 't0', waitingCount: 3 }}
        teams={TEAMS}
      />,
    )
    expect(screen.getByTestId('bqd-waiting')).toHaveTextContent('3 teams waiting')
  })

  it('says explicitly when everybody who buzzed has had a turn', () => {
    renderBuzz({ status: 'exhausted' })
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('No one left to answer')
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-status', 'exhausted')
  })

  it('falls back to neutral copy when the scoreboard cannot name the team', () => {
    renderBuzz({ status: 'active', activeTeamKey: 't0', waitingCount: 0 }, { status: 'unavailable' })
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('A team is answering')
    renderBuzz({ status: 'active', activeTeamKey: 't9', waitingCount: 0 })
    expect(screen.getAllByTestId('bqd-active')[1]).toHaveTextContent('A team is answering')
  })
})

describe('accessibility', () => {
  /**
   * Colour must never be the carrier. Stripping every class from the panel must
   * leave the same information readable, which is what this asserts: the state is
   * in the TEXT, not in the styling.
   */
  it('states every situation in text, not by colour alone', () => {
    const { container, rerender } = renderBuzz({
      status: 'active',
      activeTeamKey: 't0',
      waitingCount: 2,
    })
    expect(container.textContent).toContain('Answering')
    expect(container.textContent).toContain('Red Team')
    expect(container.textContent).toContain('2 teams waiting')
    rerender(<BuzzQueueDisplay buzz={{ status: 'exhausted' }} teams={TEAMS} />)
    expect(container.textContent).toContain('No one left to answer')
  })

  it('is read-only — the projector authors nothing', () => {
    const { container } = renderBuzz({ status: 'active', activeTeamKey: 't0', waitingCount: 1 })
    expect(container.querySelectorAll('button, input, select, textarea, a')).toHaveLength(0)
  })
})

describe('privacy', () => {
  it('renders no host-only label at any status', () => {
    for (const buzz of [
      { status: 'active', activeTeamKey: 't0', waitingCount: 2 },
      { status: 'exhausted' },
    ] as PublicBuzzState[]) {
      const { container, unmount } = renderBuzz(buzz)
      const html = (container.innerHTML ?? '').toLowerCase()
      for (const label of FORBIDDEN_DISPLAY_LABELS) {
        expect(html, `must not contain "${label}"`).not.toContain(label.toLowerCase())
      }
      unmount()
    }
  })

  it('renders nothing about a key, a mapping or a device', () => {
    const { container } = renderBuzz({ status: 'active', activeTeamKey: 't0', waitingCount: 2 })
    const html = container.innerHTML.toLowerCase()
    for (const forbidden of [
      'buzz key',
      'digit',
      'keyboard',
      'mapping',
      'gamepad',
      'controller',
      'device',
      'sony',
      'webhid',
      'mark incorrect',
      'pass and advance',
    ]) {
      expect(html, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  /**
   * The ordered waiting list is host-only. A count is published; the identities
   * and the order behind the active team are not, which is what stops the
   * projector from becoming a reaction-time ranking.
   */
  it('never names a waiting team', () => {
    const { container } = renderBuzz({ status: 'active', activeTeamKey: 't0', waitingCount: 1 })
    expect(container.textContent).toContain('Red Team')
    expect(container.textContent).not.toContain('Blue Team')
  })
})
