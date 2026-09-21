import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { BuzzQueueDisplay } from './BuzzQueueDisplay'
import type { PublicBuzzState, PublicTeamsState } from '../state/publicState'
import { FORBIDDEN_DISPLAY_LABELS } from '../test/leakLabels'
import { MAX_TEAM_NAME_LENGTH, MAX_TEAMS } from '../game/teams/limits'
import { TEAM_ACCENTS, teamAccentClass } from '../game/teams/accents'

/**
 * The projector buzz panel (Slice 8 + S05 buzz/active-claim choreography).
 *
 * The claims proved here:
 *  - the class can read WHO is answering, in words;
 *  - the waiting queue is a COUNT, never a list and never an order;
 *  - "nobody has buzzed" renders nothing at all, so the projector is not sharing
 *    the clue with an empty panel;
 *  - "everyone has had a turn" is visibly different from "nobody has buzzed";
 *  - acknowledgement is owned by semantic activeKey transitions (not every buzz
 *    object update); catch-up remount seeds without fabricating a claim;
 *  - nothing host-only, and nothing about a key or a device, can appear.
 */

const TEAMS: PublicTeamsState = {
  status: 'available',
  teams: [
    { key: 't0', name: 'Red Team', accent: 'crimson', score: 0 },
    { key: 't1', name: 'Blue Team', accent: 'azure', score: 200 },
  ],
}

const LONG_NAME = `A${'b'.repeat(MAX_TEAM_NAME_LENGTH - 1)}`

const EIGHT_TEAMS: PublicTeamsState = {
  status: 'available',
  teams: Array.from({ length: MAX_TEAMS }, (_, index) => ({
    key: `t${index}`,
    name: index === 0 ? LONG_NAME : `Team ${index + 1}`,
    accent: TEAM_ACCENTS[index] ?? 'slate',
    score: index * 100,
  })),
}

function renderBuzz(buzz: PublicBuzzState, teams: PublicTeamsState | null = TEAMS) {
  return render(<BuzzQueueDisplay buzz={buzz} teams={teams} />)
}

afterEach(() => {
  vi.useRealTimers()
})

describe('what the class can read', () => {
  it('renders nothing at all until somebody buzzes', () => {
    const { container } = renderBuzz({ status: 'none' })
    expect(container).toBeEmptyDOMElement()
  })

  it('names the team that is answering', () => {
    renderBuzz({ status: 'active', activeTeamKey: 't1', waitingCount: 0 })
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('Blue Team')
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-status', 'active')
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-active-key', 't1')
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
    expect(screen.getByTestId('bqd')).toHaveTextContent(/response closed/i)
  })

  it('falls back to neutral copy when the scoreboard cannot name the team', () => {
    renderBuzz({ status: 'active', activeTeamKey: 't0', waitingCount: 0 }, { status: 'unavailable' })
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('A team is answering')
    renderBuzz({ status: 'active', activeTeamKey: 't9', waitingCount: 0 })
    expect(screen.getAllByTestId('bqd-active')[1]).toHaveTextContent('A team is answering')
  })

  it('keeps a schema-max team name fully visible', () => {
    renderBuzz({ status: 'active', activeTeamKey: 't0', waitingCount: 7 }, EIGHT_TEAMS)
    expect(screen.getByTestId('bqd-active')).toHaveTextContent(LONG_NAME)
    expect(screen.getByTestId('bqd-waiting')).toHaveTextContent('7 teams waiting')
  })

  it('applies the canonical public team accent class as a supplemental cue', () => {
    renderBuzz({ status: 'active', activeTeamKey: 't0', waitingCount: 0 })
    const panel = screen.getByTestId('bqd')
    expect(panel).toHaveClass(teamAccentClass('crimson'))
    expect(panel).toHaveAttribute('data-accent', 'crimson')
  })
})

describe('active-claim transitions', () => {
  it('seeds remount into already-active without fabricating a claim', () => {
    renderBuzz({ status: 'active', activeTeamKey: 't0', waitingCount: 1 })
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('Red Team')
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'false')
    expect(screen.getByTestId('bqd')).not.toHaveClass('bqd--claim-changed')
  })

  it('acknowledges observed none → active without delaying the name', () => {
    vi.useFakeTimers()
    const { rerender, container } = renderBuzz({ status: 'none' })
    expect(container).toBeEmptyDOMElement()

    rerender(
      <BuzzQueueDisplay
        buzz={{ status: 'active', activeTeamKey: 't0', waitingCount: 1 }}
        teams={TEAMS}
      />,
    )
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('Red Team')
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')
    expect(screen.getByTestId('bqd')).toHaveClass('bqd--claim-changed')
  })

  it('does not cancel acknowledgement when only waitingCount changes', () => {
    vi.useFakeTimers()
    const { rerender } = renderBuzz({ status: 'none' })
    rerender(
      <BuzzQueueDisplay
        buzz={{ status: 'active', activeTeamKey: 't0', waitingCount: 1 }}
        teams={TEAMS}
      />,
    )
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')

    rerender(
      <BuzzQueueDisplay
        buzz={{ status: 'active', activeTeamKey: 't0', waitingCount: 3 }}
        teams={TEAMS}
      />,
    )
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('Red Team')
    expect(screen.getByTestId('bqd-waiting')).toHaveTextContent('3 teams waiting')
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')
    expect(screen.getByTestId('bqd')).toHaveClass('bqd--claim-changed')
  })

  it('acknowledges an active-team key change without delaying the new name', () => {
    vi.useFakeTimers()
    const { rerender } = renderBuzz({ status: 'active', activeTeamKey: 't0', waitingCount: 1 })
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('Red Team')
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'false')

    rerender(
      <BuzzQueueDisplay
        buzz={{ status: 'active', activeTeamKey: 't1', waitingCount: 0 }}
        teams={TEAMS}
      />,
    )

    expect(screen.getByTestId('bqd-active')).toHaveTextContent('Blue Team')
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-active-key', 't1')
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')
    expect(screen.getByTestId('bqd')).toHaveClass('bqd--claim-changed')
    expect(screen.getByTestId('bqd')).not.toHaveTextContent('Red Team')

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'false')
  })

  it('restarts acknowledgement ownership on rapid promotion before hold ends', () => {
    vi.useFakeTimers()
    const { rerender } = renderBuzz({ status: 'none' })
    rerender(
      <BuzzQueueDisplay
        buzz={{ status: 'active', activeTeamKey: 't0', waitingCount: 1 }}
        teams={TEAMS}
      />,
    )
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')

    rerender(
      <BuzzQueueDisplay
        buzz={{ status: 'active', activeTeamKey: 't1', waitingCount: 0 }}
        teams={TEAMS}
      />,
    )
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('Blue Team')
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')

    act(() => {
      vi.advanceTimersByTime(420)
    })
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'false')
  })

  it('walks none → active A → active B → exhausted with coherent waiting counts', () => {
    vi.useFakeTimers()
    const { rerender, container } = renderBuzz({ status: 'none' })
    expect(container).toBeEmptyDOMElement()

    rerender(
      <BuzzQueueDisplay
        buzz={{ status: 'active', activeTeamKey: 't0', waitingCount: 1 }}
        teams={TEAMS}
      />,
    )
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('Red Team')
    expect(screen.getByTestId('bqd-waiting')).toHaveTextContent('1 team waiting')
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')

    act(() => {
      vi.advanceTimersByTime(500)
    })

    rerender(
      <BuzzQueueDisplay
        buzz={{ status: 'active', activeTeamKey: 't1', waitingCount: 0 }}
        teams={TEAMS}
      />,
    )
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('Blue Team')
    expect(screen.getByTestId('bqd-waiting')).toHaveTextContent('No teams waiting')
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')
    expect(container.textContent).not.toContain('Red Team')

    rerender(<BuzzQueueDisplay buzz={{ status: 'exhausted' }} teams={TEAMS} />)
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-status', 'exhausted')
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('No one left to answer')
    expect(screen.queryByTestId('bqd-waiting')).toBeNull()
  })

  it('documents claim hold (420ms) outlasting --dur-emphasized (320ms) without CSS var reads', () => {
    // CLAIM_CHANGE_HOLD_MS is a numeric constant chosen to outlast the CSS
    // animation token --dur-emphasized (320ms). This test locks the ownership
    // duration; it does not read getComputedStyle/--dur-* at runtime.
    vi.useFakeTimers()
    const { rerender } = renderBuzz({ status: 'none' })
    rerender(
      <BuzzQueueDisplay
        buzz={{ status: 'active', activeTeamKey: 't0', waitingCount: 0 }}
        teams={TEAMS}
      />,
    )
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')

    act(() => {
      vi.advanceTimersByTime(320)
    })
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'false')
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
    expect(container.textContent).toContain('Response closed')
  })

  it('is read-only — the projector authors nothing', () => {
    const { container } = renderBuzz({ status: 'active', activeTeamKey: 't0', waitingCount: 1 })
    expect(container.querySelectorAll('button, input, select, textarea, a')).toHaveLength(0)
  })

  it('exposes polite live region on the active name', () => {
    renderBuzz({ status: 'active', activeTeamKey: 't0', waitingCount: 0 })
    expect(screen.getByTestId('bqd-active')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByTestId('bqd')).toHaveAttribute('aria-label', 'Buzz status')
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

  it('never names waiting identities across a promotion transition', () => {
    const { rerender, container } = renderBuzz({
      status: 'active',
      activeTeamKey: 't0',
      waitingCount: 1,
    })
    expect(container.textContent).not.toContain('Blue Team')

    rerender(
      <BuzzQueueDisplay
        buzz={{ status: 'active', activeTeamKey: 't1', waitingCount: 0 }}
        teams={TEAMS}
      />,
    )
    expect(container.textContent).toContain('Blue Team')
    expect(container.textContent).not.toContain('Red Team')
  })
})
