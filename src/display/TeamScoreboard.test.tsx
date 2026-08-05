import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeamScoreboard } from './TeamScoreboard'
import { DisplayRoute } from '../routes/DisplayRoute'
import { TEAM_ACCENTS } from '../game/teams/accents'
import { FORBIDDEN_DISPLAY_LABELS } from '../test/leakLabels'
import type { PublicTeam, PublicTeamsState } from '../state/publicState'

/**
 * The projector scoreboard — component behaviour (Slice 6).
 *
 * The claims proved here:
 *  - it renders exactly the DTO it is handed and computes nothing;
 *  - authored order is preserved and never re-sorted by score;
 *  - a negative total renders and READS correctly;
 *  - no information is carried by colour alone;
 *  - a payload it cannot trust becomes the neutral "Scores unavailable" panel;
 *  - no host control, mode vocabulary, score history or private label enters the
 *    DOM at all.
 */

function team(overrides: Partial<PublicTeam> = {}): PublicTeam {
  return { key: 't0', name: 'Red Team', accent: 'crimson', score: 0, ...overrides }
}

function available(teams: readonly PublicTeam[]): PublicTeamsState {
  return { status: 'available', teams }
}

const TWO: PublicTeamsState = available([
  team({ key: 't0', name: 'Red Team', accent: 'crimson', score: 300 }),
  team({ key: 't1', name: 'Blue Team', accent: 'azure', score: -100 }),
])

describe('rendering the scoreboard', () => {
  it('renders every team name and score', () => {
    render(<TeamScoreboard teams={TWO} />)
    expect(screen.getByText('Red Team')).toBeInTheDocument()
    expect(screen.getByText('Blue Team')).toBeInTheDocument()
    expect(screen.getByTestId('tsb-score-t0')).toHaveTextContent('300')
    expect(screen.getByTestId('tsb-score-t1')).toHaveTextContent('-100')
  })

  it('preserves the projected order exactly', () => {
    render(<TeamScoreboard teams={TWO} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Red Team')
    expect(items[1]).toHaveTextContent('Blue Team')
  })

  it('gives the list a heading, so the region is announced as scores', () => {
    render(<TeamScoreboard teams={TWO} />)
    expect(screen.getByRole('heading', { name: /scores/i })).toBeInTheDocument()
  })

  it('reads a negative score in words, not as a bare hyphen', () => {
    render(<TeamScoreboard teams={TWO} />)
    expect(screen.getByLabelText('Blue Team: minus 100 points')).toBeInTheDocument()
    expect(screen.getByLabelText('Red Team: 300 points')).toBeInTheDocument()
  })

  it('renders a single team, and eight teams, without complaint', () => {
    const { unmount } = render(<TeamScoreboard teams={available([team()])} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    unmount()

    const eight = TEAM_ACCENTS.map((accent, index) =>
      team({ key: `t${index}`, name: `Team ${index + 1}`, accent, score: index * 50 }),
    )
    render(<TeamScoreboard teams={available(eight)} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
  })

  it('covers stress sizes: long names, extreme scores, ties, duplicate accents, authored order', () => {
    const longName = "Ms. Garnett's 4th Period Titans of Earth"
    const stress = available([
      team({ key: 't0', name: longName, accent: 'crimson', score: 1000000 }),
      team({ key: 't1', name: 'Tie A', accent: 'azure', score: 100 }),
      team({ key: 't2', name: 'Tie B', accent: 'azure', score: 100 }),
      team({ key: 't3', name: 'Low', accent: 'crimson', score: -1000000 }),
      team({ key: 't4', name: 'Five', accent: 'emerald', score: 5 }),
      team({ key: 't5', name: 'Six', accent: 'amber', score: 6 }),
      team({ key: 't6', name: 'Seven', accent: 'violet', score: 7 }),
      team({ key: 't7', name: 'Eight', accent: 'teal', score: 8 }),
    ])
    render(<TeamScoreboard teams={stress} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(8)
    expect(items[0]).toHaveTextContent(longName)
    expect(items[0]).toHaveTextContent('1000000')
    expect(items[3]).toHaveTextContent('-1000000')
    expect(screen.getByLabelText(`${longName}: 1000000 points`)).toBeInTheDocument()
    expect(screen.getByLabelText('Low: minus 1000000 points')).toBeInTheDocument()
    // Authored order, not score order (1,000,000 is first; -1,000,000 is fourth).
    expect(items.map((el) => el.textContent)).toEqual([
      expect.stringContaining(longName),
      expect.stringContaining('Tie A'),
      expect.stringContaining('Tie B'),
      expect.stringContaining('Low'),
      expect.stringContaining('Five'),
      expect.stringContaining('Six'),
      expect.stringContaining('Seven'),
      expect.stringContaining('Eight'),
    ])
  })

  it.each([1, 4, 5, 6, 7, 8] as const)('renders %i teams without reordering', (count) => {
    const teams = Array.from({ length: count }, (_, index) =>
      team({
        key: `t${index}`,
        name: `Team ${index + 1}`,
        accent: TEAM_ACCENTS[index % TEAM_ACCENTS.length],
        score: (count - index) * 100,
      }),
    )
    render(<TeamScoreboard teams={available(teams)} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(count)
    expect(items[0]).toHaveTextContent('Team 1')
    expect(items[count - 1]).toHaveTextContent(`Team ${count}`)
  })
})

describe('colour is never the only signal', () => {
  it('names every team as TEXT, not just as an accent', () => {
    render(<TeamScoreboard teams={TWO} />)
    for (const name of ['Red Team', 'Blue Team']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('hides the accent bar from assistive technology', () => {
    const { container } = render(<TeamScoreboard teams={TWO} />)
    const bars = container.querySelectorAll('.tsb__accent-bar')
    expect(bars).toHaveLength(2)
    for (const bar of bars) expect(bar).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows a negative total with a minus sign in the text itself', () => {
    render(<TeamScoreboard teams={TWO} />)
    // Not only the `--negative` colour class: the character is in the content.
    expect(screen.getByTestId('tsb-score-t1').textContent).toContain('-')
  })

  it('maps every application accent to a class, and unknown tokens to none', () => {
    const { container, unmount } = render(
      <TeamScoreboard
        teams={available(
          TEAM_ACCENTS.map((accent, index) => team({ key: `t${index}`, accent })),
        )}
      />,
    )
    for (const accent of TEAM_ACCENTS) {
      expect(container.querySelector(`.accent--${accent}`)).not.toBeNull()
    }
    unmount()

    // A token the display does not know yields NO class — never an injected value.
    const { container: other } = render(
      <TeamScoreboard teams={available([team({ accent: 'ultraviolet' })])} />,
    )
    const item = other.querySelector('.tsb__team')
    expect(item?.className).toBe('tsb__team')
  })
})

describe('failing closed', () => {
  it('shows the neutral panel for the unavailable status', () => {
    render(<TeamScoreboard teams={{ status: 'unavailable' }} />)
    expect(screen.getByTestId('tsb-unavailable')).toHaveTextContent(/scores unavailable/i)
    expect(screen.queryByRole('listitem')).toBeNull()
  })

  it('shows the neutral panel for an empty available list', () => {
    render(<TeamScoreboard teams={available([])} />)
    expect(screen.getByTestId('tsb-unavailable')).toBeInTheDocument()
  })

  it('shows the neutral panel for an unrecognized status, without crashing', () => {
    render(<TeamScoreboard teams={{ status: 'weird' } as unknown as PublicTeamsState} />)
    expect(screen.getByTestId('tsb-unavailable')).toBeInTheDocument()
  })

  it('reveals nothing about WHY it is unavailable', () => {
    render(<TeamScoreboard teams={{ status: 'unavailable' }} />)
    const text = screen.getByTestId('tsb-unavailable').textContent ?? ''
    for (const leak of ['NaN', 'invalid', 'corrupt', 'error', 'schema']) {
      expect(text.toLowerCase()).not.toContain(leak.toLowerCase())
    }
  })
})

describe('nothing private or interactive enters the DOM', () => {
  it('renders no control of any kind', () => {
    render(<TeamScoreboard teams={TWO} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('contains none of the forbidden host labels', () => {
    const { container } = render(<TeamScoreboard teams={TWO} />)
    const html = (container.innerHTML ?? '').toLowerCase()
    for (const label of FORBIDDEN_DISPLAY_LABELS) {
      expect(html, `must not contain "${label}"`).not.toContain(label.toLowerCase())
    }
  })

  it('contains no adjustment mode vocabulary or event history', () => {
    const { container } = render(<TeamScoreboard teams={TWO} />)
    const html = container.innerHTML
    for (const forbidden of [
      'full-credit',
      'partial-credit',
      'manual-correction',
      'deduction',
      'TEAM_SCORE_ADJUSTED',
      'EVENT_UNDONE',
      'delta',
    ]) {
      expect(html).not.toContain(forbidden)
    }
  })
})

describe('inside the display route', () => {
  it('renders no scoreboard at all before the host has published teams', () => {
    render(<DisplayRoute />)
    // The initial public state has `teams: null`, so there is no scores region and
    // the word "score" never appears on a fresh projector.
    expect(screen.queryByTestId('display-scores')).toBeNull()
    expect(screen.queryByTestId('tsb')).toBeNull()
    expect((document.body.textContent ?? '').toLowerCase()).not.toContain('score')
  })
})
