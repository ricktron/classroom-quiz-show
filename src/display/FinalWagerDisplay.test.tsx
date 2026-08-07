import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FinalWagerDisplay } from './FinalWagerDisplay'
import {
  PUBLIC_BOARD_KIND,
  PUBLIC_FINAL_KIND,
  type PublicRoundState,
  type PublicTeamsState,
} from '../state/publicState'
import { FORBIDDEN_DISPLAY_LABELS } from '../test/leakLabels'

/**
 * The projector Final renderer (Slice 14).
 *
 * The load-bearing claims proved here:
 *  - every stage renders from the DTO alone, in WORDS, with no colour-only state;
 *  - content that is not in the DTO is not in the DOM — not hidden by CSS, not
 *    present in an attribute, simply absent;
 *  - an unknown or impossible payload renders the neutral unavailable panel.
 */

const TEAMS: PublicTeamsState = {
  status: 'available',
  teams: [
    { key: 't0', name: 'Red Team', accent: 'crimson', score: 300 },
    { key: 't1', name: 'Blue Team', accent: 'azure', score: 100 },
  ],
}

const PROMPT = { kind: 'text', text: 'Which process drives plate motion?' } as const

function renderFinal(round: PublicRoundState, teams: PublicTeamsState | null = TEAMS) {
  return render(<FinalWagerDisplay round={round} teams={teams} />)
}

describe('each Final stage renders from the DTO alone', () => {
  it('shows a neutral setup panel', () => {
    renderFinal({ kind: PUBLIC_FINAL_KIND, stage: 'setup' })
    expect(screen.getByTestId('fwd-setup')).toBeInTheDocument()
    expect(screen.getByText(/getting ready/i)).toBeInTheDocument()
  })

  it('shows the wager stage with no wager amounts (countdown owned by Final Signal Rail)', () => {
    renderFinal({
      kind: PUBLIC_FINAL_KIND,
      stage: 'wager-entry',
      timer: { status: 'running', durationMs: 60_000, deadline: Date.now() + 60_000 },
    })
    expect(screen.getByTestId('fwd-wager-entry')).toBeInTheDocument()
    expect(screen.getByText(/place your wagers/i)).toBeInTheDocument()
    // Primary Final countdown moved to SignalRail (Slice 18 R1) — leaf must not duplicate it.
    expect(screen.queryByTestId('fwd-timer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('fwd-reveal-wager')).not.toBeInTheDocument()
  })

  it('renders no Final leaf clock for an idle wager window', () => {
    renderFinal({
      kind: PUBLIC_FINAL_KIND,
      stage: 'wager-entry',
      timer: { status: 'idle' },
    })
    expect(screen.queryByTestId('fwd-timer')).not.toBeInTheDocument()
  })

  it('states a locked wager phase in words', () => {
    renderFinal({ kind: PUBLIC_FINAL_KIND, stage: 'wagers-locked' })
    expect(screen.getByText(/wagers are locked/i)).toBeInTheDocument()
  })

  it('shows the question once the response window is open', () => {
    renderFinal({
      kind: PUBLIC_FINAL_KIND,
      stage: 'response-entry',
      prompt: PROMPT,
      timer: { status: 'running', durationMs: 30_000, deadline: Date.now() + 30_000 },
    })
    expect(screen.getByTestId('fwd-prompt')).toHaveTextContent('Which process drives plate motion?')
    expect(screen.queryByTestId('fwd-answer')).not.toBeInTheDocument()
  })

  it('keeps the question in view beside the revealed answer', () => {
    renderFinal({
      kind: PUBLIC_FINAL_KIND,
      stage: 'answer-revealed',
      prompt: PROMPT,
      answer: 'Mantle convection',
    })
    expect(screen.getByTestId('fwd-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('fwd-answer')).toHaveTextContent('Mantle convection')
  })

  it('names the revealed team from the public scoreboard, never from an id', () => {
    renderFinal({
      kind: PUBLIC_FINAL_KIND,
      stage: 'team-reveal',
      prompt: PROMPT,
      answer: 'Mantle convection',
      reveal: {
        teamKey: 't1',
        response: { kind: 'exact', text: 'Convection currents' },
        wager: 50,
        settlement: null,
      },
    })
    expect(screen.getByTestId('fwd-reveal-team')).toHaveTextContent('Blue Team')
    expect(screen.getByTestId('fwd-reveal-response')).toHaveTextContent('Convection currents')
    expect(screen.getByTestId('fwd-reveal-wager')).toHaveTextContent('50')
    // Correctness is not rendered before settlement, and no element holds it.
    expect(screen.queryByTestId('fwd-reveal-outcome')).not.toBeInTheDocument()
  })

  it('states the outcome and the signed points in words once settled', () => {
    renderFinal({
      kind: PUBLIC_FINAL_KIND,
      stage: 'team-reveal',
      prompt: PROMPT,
      answer: 'Mantle convection',
      reveal: {
        teamKey: 't1',
        response: { kind: 'not-captured' },
        wager: 50,
        settlement: { outcome: 'incorrect', delta: -50 },
      },
    })
    const outcome = screen.getByTestId('fwd-reveal-outcome')
    expect(outcome).toHaveTextContent('Incorrect')
    expect(outcome).toHaveTextContent('-50')
  })

  it.each([
    ['not-captured', /answered \(wording not recorded\)/i],
    ['no-response', /no response/i],
  ] as const)('states a %s response in words', (kind, pattern) => {
    renderFinal({
      kind: PUBLIC_FINAL_KIND,
      stage: 'team-reveal',
      prompt: PROMPT,
      answer: 'A',
      reveal: { teamKey: 't0', response: { kind }, wager: 0, settlement: null },
    })
    expect(screen.getByTestId('fwd-reveal-response')).toHaveTextContent(pattern)
  })

  it('shows a tied resolution and a unique-leader resolution differently', () => {
    const { unmount } = renderFinal({
      kind: PUBLIC_FINAL_KIND,
      stage: 'resolution',
      prompt: PROMPT,
      answer: 'A',
      reveal: null,
      outcome: 'tied',
    })
    expect(screen.getByTestId('fwd-outcome')).toHaveTextContent(/the lead is tied/i)
    unmount()
    renderFinal({
      kind: PUBLIC_FINAL_KIND,
      stage: 'resolution',
      prompt: null,
      answer: null,
      reveal: null,
      outcome: 'unique-leader',
    })
    expect(screen.getByTestId('fwd-outcome')).toHaveTextContent(/all wagers settled/i)
    expect(screen.queryByTestId('fwd-prompt')).not.toBeInTheDocument()
  })

  it('shows a neutral sudden-death panel with no team named', () => {
    renderFinal({ kind: PUBLIC_FINAL_KIND, stage: 'sudden-death' })
    expect(screen.getByTestId('fwd-sudden-death')).toBeInTheDocument()
    expect(screen.queryByText(/red team/i)).not.toBeInTheDocument()
  })

  it('states a completed game, and a completed tie differently', () => {
    const { unmount } = renderFinal({
      kind: PUBLIC_FINAL_KIND,
      stage: 'complete',
      outcome: 'tied',
    })
    expect(screen.getByTestId('fwd-outcome')).toHaveTextContent(/a tie/i)
    unmount()
    renderFinal({ kind: PUBLIC_FINAL_KIND, stage: 'complete', outcome: 'unique-leader' })
    expect(screen.getByTestId('fwd-outcome')).toHaveTextContent(/game complete/i)
  })
})

describe('it fails closed', () => {
  it('renders the neutral panel for a board payload', () => {
    renderFinal({ kind: PUBLIC_BOARD_KIND, stage: 'board', categories: [] })
    expect(screen.getByTestId('fwd-unavailable')).toBeInTheDocument()
  })

  it('falls back to a neutral team label when the scoreboard is unavailable', () => {
    renderFinal(
      {
        kind: PUBLIC_FINAL_KIND,
        stage: 'team-reveal',
        prompt: PROMPT,
        answer: 'A',
        reveal: { teamKey: 't9', response: { kind: 'no-response' }, wager: 0, settlement: null },
      },
      { status: 'unavailable' },
    )
    expect(screen.getByTestId('fwd-reveal-team')).toHaveTextContent('Team')
  })
})

describe('no host-only label reaches the projector', () => {
  it('renders none of the permanent forbidden labels at any stage', () => {
    const stages: PublicRoundState[] = [
      { kind: PUBLIC_FINAL_KIND, stage: 'setup' },
      { kind: PUBLIC_FINAL_KIND, stage: 'wager-entry', timer: { status: 'idle' } },
      { kind: PUBLIC_FINAL_KIND, stage: 'wagers-locked' },
      {
        kind: PUBLIC_FINAL_KIND,
        stage: 'response-entry',
        prompt: PROMPT,
        timer: { status: 'idle' },
      },
      { kind: PUBLIC_FINAL_KIND, stage: 'answer-revealed', prompt: PROMPT, answer: 'A' },
      {
        kind: PUBLIC_FINAL_KIND,
        stage: 'team-reveal',
        prompt: PROMPT,
        answer: 'A',
        reveal: {
          teamKey: 't0',
          response: { kind: 'not-captured' },
          wager: 10,
          settlement: { outcome: 'correct', delta: 10 },
        },
      },
      { kind: PUBLIC_FINAL_KIND, stage: 'sudden-death' },
      { kind: PUBLIC_FINAL_KIND, stage: 'complete', outcome: 'unique-leader' },
    ]
    for (const stage of stages) {
      const { container, unmount } = renderFinal(stage)
      const html = container.innerHTML.toLowerCase()
      for (const label of FORBIDDEN_DISPLAY_LABELS) {
        expect(html, `stage ${stage.stage} must not contain "${label}"`).not.toContain(
          label.toLowerCase(),
        )
      }
      unmount()
    }
  })
})
