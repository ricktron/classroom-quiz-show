import { describe, expect, it } from 'vitest'
import { toPublicState } from '../state/sanitize'
import { INITIAL_PRIVATE_STATE, type PrivateState } from '../state/privateState'
import {
  HOST_RESUME_WELCOME_PREFIX,
  hostResumeWelcomeCopy,
} from './hostResumeWelcome'

/** Distinctive Host-private marker used to prove Welcome-back never enters PublicState. */
const DISTINCTIVE_PRIVATE_TITLE = 'SLICE_G_WELCOME_PRIVATE_TITLE_NEVER_ON_DISPLAY'

describe('hostResumeWelcomeCopy', () => {
  it('returns a generic fallback when no Game is loaded', () => {
    expect(
      hostResumeWelcomeCopy({
        gameTitle: null,
        playReady: false,
        roundLabel: null,
        namesComplete: false,
      }),
    ).toBe(HOST_RESUME_WELCOME_PREFIX)
  })

  it('orients setup landings with incomplete names', () => {
    expect(
      hostResumeWelcomeCopy({
        gameTitle: DISTINCTIVE_PRIVATE_TITLE,
        playReady: false,
        roundLabel: null,
        namesComplete: false,
      }),
    ).toBe(`Welcome back — ${DISTINCTIVE_PRIVATE_TITLE} · finish team names`)
  })

  it('orients setup landings when names are already complete', () => {
    expect(
      hostResumeWelcomeCopy({
        gameTitle: DISTINCTIVE_PRIVATE_TITLE,
        playReady: false,
        roundLabel: null,
        namesComplete: true,
      }),
    ).toBe(`Welcome back — ${DISTINCTIVE_PRIVATE_TITLE} · class setup`)
  })

  it('orients play landings with scores kept', () => {
    expect(
      hostResumeWelcomeCopy({
        gameTitle: DISTINCTIVE_PRIVATE_TITLE,
        playReady: true,
        roundLabel: null,
        namesComplete: true,
      }),
    ).toBe(`Welcome back — ${DISTINCTIVE_PRIVATE_TITLE} · scores kept`)
  })

  it('includes the Host round line when play posture has a selected round', () => {
    expect(
      hostResumeWelcomeCopy({
        gameTitle: DISTINCTIVE_PRIVATE_TITLE,
        playReady: true,
        roundLabel: 'Round 2 of 3',
        namesComplete: true,
      }),
    ).toBe(
      `Welcome back — ${DISTINCTIVE_PRIVATE_TITLE} · Round 2 of 3 · scores kept`,
    )
  })

  it('never leaks Welcome-back or distinctive private title into PublicState', () => {
    const welcome = hostResumeWelcomeCopy({
      gameTitle: DISTINCTIVE_PRIVATE_TITLE,
      playReady: false,
      roundLabel: null,
      namesComplete: false,
    })
    const privateState: PrivateState = {
      ...INITIAL_PRIVATE_STATE,
      revision: 1,
      session: {
        sessionId: 'sess-welcome-privacy',
        lifecycle: 'ready',
        counter: 1,
        publicStatusCode: 'session-ready',
        hostNotes: welcome,
        game: null,
      },
    }
    const publicJson = JSON.stringify(toPublicState(privateState))
    expect(publicJson).not.toContain(HOST_RESUME_WELCOME_PREFIX)
    expect(publicJson).not.toContain('Welcome back')
    expect(publicJson).not.toContain(DISTINCTIVE_PRIVATE_TITLE)
    expect(publicJson).not.toContain('finish team names')
    expect(publicJson).not.toContain('scores kept')
  })
})
