import { describe, expect, it } from 'vitest'
import { timerConfigSchema } from './schema'
import {
  DEFAULT_TIMER_CONFIG,
  TimerConfigError,
  createTimerConfig,
  isResponseSeconds,
  isTimerConfig,
  responseDurationMs,
} from './timerConfig'
import {
  DEFAULT_RESPONSE_SECONDS,
  HOST_DURATION_PRESET_SECONDS,
  MAX_RESPONSE_SECONDS,
  MIN_RESPONSE_SECONDS,
  MS_PER_SECOND,
} from './limits'
import {
  INITIAL_RESPONSE_PHASE_STATE,
  isInitialResponsePhase,
  isLiveTimer,
  remainingMsAt,
  remainingSecondsAt,
  RESPONSE_TIMER_STATUSES,
  type ResponseTimerState,
} from './responsePhase'
import { EMPTY_BUZZ_QUEUE } from './buzzQueue'
import { createGameDefinition } from '../gameDefinition'
import { placeholderRound } from '../roundDefinition'
import { describeRemaining, formatRemaining, remainingSeconds } from '../../time/duration'

/**
 * The timing domain (Slice 7): authored configuration, the response-phase model,
 * and the pure derivations both the host and the projector rely on.
 *
 * Everything here is a pure function of its arguments. No test in this file waits
 * for real time to pass, because nothing in the domain reads a clock.
 */

const AT = 1_000_000

describe('authored timer configuration', () => {
  it('accepts a whole number of seconds inside the documented bounds', () => {
    expect(timerConfigSchema.safeParse({ responseSeconds: 30 }).success).toBe(true)
    expect(timerConfigSchema.safeParse({ responseSeconds: MIN_RESPONSE_SECONDS }).success).toBe(true)
    expect(timerConfigSchema.safeParse({ responseSeconds: MAX_RESPONSE_SECONDS }).success).toBe(true)
  })

  it('rejects out-of-range, fractional, non-numeric and missing values', () => {
    for (const value of [
      MIN_RESPONSE_SECONDS - 1,
      MAX_RESPONSE_SECONDS + 1,
      0,
      -30,
      30.5,
      '30',
      null,
      Number.NaN,
      Number.POSITIVE_INFINITY,
    ]) {
      expect(
        timerConfigSchema.safeParse({ responseSeconds: value }).success,
        `should reject ${String(value)}`,
      ).toBe(false)
    }
    expect(timerConfigSchema.safeParse({}).success).toBe(false)
  })

  it('rejects an unknown field rather than dropping it', () => {
    const parsed = timerConfigSchema.safeParse({ responseSeconds: 30, warningSeconds: 5 })
    expect(parsed.success).toBe(false)
  })

  it('coerces nothing and defaults nothing at the schema boundary', () => {
    // A `.default()` here would make the import boundary report a value nobody
    // authored. The default belongs to the trusted constructor, visibly.
    expect(timerConfigSchema.safeParse(undefined).success).toBe(false)
  })

  it('applies the documented default only for an ABSENT block', () => {
    expect(createTimerConfig(undefined)).toEqual({ responseSeconds: DEFAULT_RESPONSE_SECONDS })
    expect(createTimerConfig(undefined)).toBe(DEFAULT_TIMER_CONFIG)
  })

  it('throws rather than repairing a present-but-invalid block', () => {
    expect(() => createTimerConfig({ responseSeconds: 1 })).toThrow(TimerConfigError)
    expect(() => createTimerConfig({ responseSeconds: '30' })).toThrow(TimerConfigError)
    expect(() => createTimerConfig(null)).toThrow(TimerConfigError)
  })

  it('freezes what it builds', () => {
    const config = createTimerConfig({ responseSeconds: 45 })
    expect(Object.isFrozen(config)).toBe(true)
    expect(config.responseSeconds).toBe(45)
  })

  it('guards a config at the trust boundary', () => {
    expect(isTimerConfig({ responseSeconds: 30 })).toBe(true)
    expect(isTimerConfig({ responseSeconds: 1 })).toBe(false)
    expect(isTimerConfig({})).toBe(false)
    expect(isTimerConfig(null)).toBe(false)
    expect(isTimerConfig('30')).toBe(false)
  })

  it('guards a duration with the same rule the schema uses', () => {
    expect(isResponseSeconds(MIN_RESPONSE_SECONDS)).toBe(true)
    expect(isResponseSeconds(MAX_RESPONSE_SECONDS)).toBe(true)
    expect(isResponseSeconds(MIN_RESPONSE_SECONDS - 1)).toBe(false)
    expect(isResponseSeconds(MAX_RESPONSE_SECONDS + 1)).toBe(false)
    expect(isResponseSeconds(30.5)).toBe(false)
  })

  it('converts to milliseconds exactly', () => {
    expect(responseDurationMs(30)).toBe(30 * MS_PER_SECOND)
    expect(responseDurationMs(MAX_RESPONSE_SECONDS)).toBe(600_000)
  })

  it('offers only in-bounds host presets', () => {
    for (const seconds of HOST_DURATION_PRESET_SECONDS) {
      expect(isResponseSeconds(seconds), `preset ${seconds}`).toBe(true)
    }
  })
})

describe('a game definition always carries timing', () => {
  it('defaults when none is authored, so no consumer handles "no timer settings"', () => {
    const definition = createGameDefinition({
      id: 'g',
      title: 'G',
      rounds: [placeholderRound('r1', 'R1')],
    })
    expect(definition.timer).toEqual({ responseSeconds: DEFAULT_RESPONSE_SECONDS })
  })

  it('keeps an authored value verbatim', () => {
    const definition = createGameDefinition({
      id: 'g',
      title: 'G',
      rounds: [],
      timer: { responseSeconds: 90 },
    })
    expect(definition.timer.responseSeconds).toBe(90)
  })

  it('rejects an authored value it cannot accept, rather than falling back', () => {
    expect(() =>
      createGameDefinition({ id: 'g', title: 'G', rounds: [], timer: { responseSeconds: 2 } }),
    ).toThrow(TimerConfigError)
  })

  it('is deep-frozen along with the rest of the definition', () => {
    const definition = createGameDefinition({ id: 'g', title: 'G', rounds: [] })
    expect(Object.isFrozen(definition.timer)).toBe(true)
  })
})

describe('the response-phase model', () => {
  const running: ResponseTimerState = {
    status: 'running',
    timerId: 'tmr-1',
    durationMs: 30_000,
    startedAt: AT,
    deadline: AT + 30_000,
  }

  it('enumerates exactly five statuses', () => {
    expect(RESPONSE_TIMER_STATUSES).toEqual([
      'idle',
      'running',
      'paused',
      'expired',
      'interrupted',
    ])
  })

  it('starts disarmed with no timer', () => {
    expect(INITIAL_RESPONSE_PHASE_STATE).toEqual({
      armed: false,
      timer: { status: 'idle' },
      // Slice 8: a fresh phase also has an empty queue.
      queue: { order: [], resolvedCount: 0 },
    })
    expect(isInitialResponsePhase(INITIAL_RESPONSE_PHASE_STATE)).toBe(true)
    expect(
      isInitialResponsePhase({ armed: true, timer: { status: 'idle' }, queue: EMPTY_BUZZ_QUEUE }),
    ).toBe(false)
    expect(
      isInitialResponsePhase({ armed: false, timer: running, queue: EMPTY_BUZZ_QUEUE }),
    ).toBe(false)
    // A phase holding a queue is not initial even when disarmed and un-timed.
    expect(
      isInitialResponsePhase({
        armed: false,
        timer: { status: 'idle' },
        queue: { order: ['t-red'], resolvedCount: 0 },
      }),
    ).toBe(false)
  })

  it('knows which states are still live', () => {
    expect(isLiveTimer(running)).toBe(true)
    expect(isLiveTimer({ status: 'paused', timerId: 't', durationMs: 1, remainingMs: 1 })).toBe(true)
    expect(isLiveTimer({ status: 'idle' })).toBe(false)
    expect(
      isLiveTimer({ status: 'expired', timerId: 't', durationMs: 1, deadline: 2 }),
    ).toBe(false)
  })

  it('derives remaining time from durable facts plus a supplied instant', () => {
    expect(remainingMsAt(running, AT)).toBe(30_000)
    expect(remainingMsAt(running, AT + 29_000)).toBe(1_000)
    expect(remainingMsAt(running, AT + 30_000)).toBe(0)
  })

  it('clamps rather than showing a negative or an impossible countdown', () => {
    expect(remainingMsAt(running, AT + 90_000)).toBe(0)
    expect(remainingMsAt(running, AT - 90_000)).toBe(30_000)
    expect(remainingMsAt(running, Number.NaN)).toBe(0)
  })

  it('freezes a paused or interrupted timer against the passage of time', () => {
    const paused: ResponseTimerState = {
      status: 'paused',
      timerId: 'tmr-1',
      durationMs: 30_000,
      remainingMs: 12_000,
    }
    expect(remainingMsAt(paused, AT)).toBe(12_000)
    // A week later, the same number. This is what makes replay safe while paused.
    expect(remainingMsAt(paused, AT + 604_800_000)).toBe(12_000)
  })

  it('reports zero for an idle or expired timer', () => {
    expect(remainingMsAt({ status: 'idle' }, AT)).toBe(0)
    expect(
      remainingMsAt({ status: 'expired', timerId: 't', durationMs: 30_000, deadline: AT }, AT),
    ).toBe(0)
  })

  it('rounds seconds UP so the number reaches zero exactly when the window does', () => {
    expect(remainingSecondsAt(running, AT + 29_001)).toBe(1)
    expect(remainingSecondsAt(running, AT + 30_000)).toBe(0)
    expect(remainingSeconds(1)).toBe(1)
    expect(remainingSeconds(0)).toBe(0)
    expect(remainingSeconds(-500)).toBe(0)
  })
})

describe('duration formatting', () => {
  it('renders M:SS in fixed ASCII, with no locale', () => {
    expect(formatRemaining(0)).toBe('0:00')
    expect(formatRemaining(1_000)).toBe('0:01')
    expect(formatRemaining(9_500)).toBe('0:10')
    expect(formatRemaining(60_000)).toBe('1:00')
    expect(formatRemaining(65_000)).toBe('1:05')
    expect(formatRemaining(600_000)).toBe('10:00')
    expect(formatRemaining(-5_000)).toBe('0:00')
  })

  it('spells the duration out for screen readers, because "1:05" is ambiguous', () => {
    expect(describeRemaining(0)).toBe('0 seconds')
    expect(describeRemaining(1_000)).toBe('1 second')
    expect(describeRemaining(45_000)).toBe('45 seconds')
    expect(describeRemaining(60_000)).toBe('1 minute')
    expect(describeRemaining(65_000)).toBe('1 minute 5 seconds')
    expect(describeRemaining(125_000)).toBe('2 minutes 5 seconds')
  })
})
