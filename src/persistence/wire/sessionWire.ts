import { exportGameDefinition } from '../../export/exportGame'
import { importGameFromJsonText } from '../../import/importGame'
import type { RoundRegistry } from '../../game/registry'
import { isScoreAdjustmentMode, isScoreSource, type ScoreSource } from '../../game/teams/scoring'
import {
  isResponseInterruptionSource,
  type ResponseInterruptionSource,
} from '../../game/timing/responsePhase'
import {
  isActiveResponseResolution,
  type ActiveResponseResolution,
} from '../../game/timing/buzzQueue'
import { isInstant } from '../../time/clock'
import { EVENT_TYPES, type RoundSupport, type SessionEvent } from '../../state/events'
import { replay } from '../../state/reducer'
import {
  PERSISTENCE_WIRE_FORMAT,
  PERSISTENCE_WIRE_VERSION,
} from '../constants'
import { persistenceErr, persistenceOk, type PersistenceResult } from '../results'
import { isPublicStatusCode } from '../../state/status'

type WireEvent = Record<string, unknown>

export interface ActiveSessionRecord {
  readonly format: typeof PERSISTENCE_WIRE_FORMAT
  readonly schemaVersion: typeof PERSISTENCE_WIRE_VERSION
  readonly savedAt: number
  readonly events: readonly unknown[]
}

export interface SessionWireOptions {
  readonly registry?: RoundRegistry
}

export function encodeSessionHistory(
  events: readonly SessionEvent[],
  savedAt: number,
  options: SessionWireOptions = {},
): PersistenceResult<ActiveSessionRecord> {
  if (!isInstant(savedAt)) {
    return persistenceErr('invalid', 'Active session savedAt is not a valid instant.')
  }

  const wireEvents: WireEvent[] = []
  for (const event of events) {
    const encoded = encodeEvent(event, options)
    if (!encoded.ok) return encoded
    wireEvents.push(encoded.value)
  }

  return persistenceOk(Object.freeze({
    format: PERSISTENCE_WIRE_FORMAT,
    schemaVersion: PERSISTENCE_WIRE_VERSION,
    savedAt,
    events: wireEvents,
  }))
}

export function decodeSessionHistory(
  input: unknown,
  options: SessionWireOptions = {},
): PersistenceResult<readonly SessionEvent[]> {
  const envelope = readEnvelope(input)
  if (!envelope.ok) return envelope

  const events: SessionEvent[] = []
  for (let index = 0; index < envelope.value.events.length; index += 1) {
    const decoded = decodeEvent(envelope.value.events[index], index, options)
    if (!decoded.ok) return decoded
    events.push(decoded.value)
  }

  return persistenceOk(events)
}

export function encodeActiveSessionRecord(
  events: readonly SessionEvent[],
  savedAt: number,
  options: SessionWireOptions = {},
): PersistenceResult<ActiveSessionRecord> {
  return encodeSessionHistory(events, savedAt, options)
}

export function decodeActiveSessionRecord(
  input: unknown,
  options: SessionWireOptions = {},
): PersistenceResult<{ readonly events: readonly SessionEvent[]; readonly savedAt: number }> {
  const envelope = readEnvelope(input)
  if (!envelope.ok) return envelope
  const history = decodeSessionHistory(input, options)
  if (!history.ok) return history
  return persistenceOk({ events: history.value, savedAt: envelope.value.savedAt })
}

export function isResumableHistory(events: readonly SessionEvent[]): boolean {
  if (events.length === 0) return false
  const state = replay(events)
  if (!state.session) return false
  return state.session.game?.gameLifecycle !== 'ended'
}

function encodeEvent(
  event: SessionEvent,
  options: SessionWireOptions,
): PersistenceResult<WireEvent> {
  const base = {
    id: event.id,
    type: event.type,
    seq: event.seq,
    occurredAt: event.occurredAt,
    reversible: event.reversible,
  }

  switch (event.type) {
    case 'SESSION_INITIALIZED':
      return persistenceOk({ ...base, sessionId: event.sessionId })
    case 'PUBLIC_STATUS_SET':
      return persistenceOk({ ...base, code: event.code })
    case 'SEQUENCE_ADVANCED':
    case 'WAITING_MARKED':
    case 'GAME_SESSION_ENDED':
    case 'CATEGORY_BOARD_PROMPT_REVEALED':
    case 'CATEGORY_BOARD_RETURNED':
    case 'RESPONSE_PHASE_ARMED':
    case 'RESPONSE_PHASE_DISARMED':
    case 'RESPONSE_PHASE_RESET':
      return persistenceOk({ ...base, ...roundOnlyPayload(event) })
    case 'HOST_NOTE_SET':
      return persistenceOk({ ...base, note: event.note })
    case 'EVENT_UNDONE':
      return persistenceOk({ ...base, targetEventId: event.targetEventId })
    case 'GAME_INITIALIZED': {
      const exported = exportGameDefinition(event.definition, { registry: options.registry })
      if (exported.status !== 'success') {
        return persistenceErr('invalid', 'GAME_INITIALIZED definition could not be exported.')
      }
      return persistenceOk({ ...base, definitionJson: exported.jsonText })
    }
    case 'CURRENT_ROUND_SELECTED':
    case 'ROUND_ADVANCED':
      return persistenceOk({
        ...base,
        roundIndex: event.roundIndex,
        roundId: event.roundId,
        support: event.support,
      })
    case 'CATEGORY_BOARD_TILE_SELECTED':
    case 'CATEGORY_BOARD_ANSWER_REVEALED':
      return persistenceOk({ ...base, roundId: event.roundId, tileId: event.tileId })
    case 'TEAM_SCORE_ADJUSTED':
      return persistenceOk({
        ...base,
        teamId: event.teamId,
        delta: event.delta,
        mode: event.mode,
        source: event.source,
      })
    case 'RESPONSE_TIMER_STARTED':
      return persistenceOk({
        ...base,
        roundId: event.roundId,
        timerId: event.timerId,
        durationMs: event.durationMs,
        startedAt: event.startedAt,
        deadline: event.deadline,
      })
    case 'RESPONSE_TIMER_PAUSED':
      return persistenceOk({
        ...base,
        roundId: event.roundId,
        timerId: event.timerId,
        remainingMs: event.remainingMs,
      })
    case 'RESPONSE_TIMER_RESUMED':
      return persistenceOk({
        ...base,
        roundId: event.roundId,
        timerId: event.timerId,
        resumedAt: event.resumedAt,
        deadline: event.deadline,
      })
    case 'RESPONSE_TIMER_INTERRUPTED':
      return persistenceOk({
        ...base,
        roundId: event.roundId,
        timerId: event.timerId,
        source: event.source,
        remainingMs: event.remainingMs,
      })
    case 'RESPONSE_TIMER_EXPIRED':
      return persistenceOk({
        ...base,
        roundId: event.roundId,
        timerId: event.timerId,
        deadline: event.deadline,
      })
    case 'TEAM_BUZZED':
      return persistenceOk({
        ...base,
        roundId: event.roundId,
        tileId: event.tileId,
        teamId: event.teamId,
      })
    case 'ACTIVE_RESPONSE_RESOLVED':
      return persistenceOk({
        ...base,
        roundId: event.roundId,
        tileId: event.tileId,
        teamId: event.teamId,
        resolution: event.resolution,
      })
  }
}

function roundOnlyPayload(event: SessionEvent): Record<string, string> {
  return 'roundId' in event ? { roundId: event.roundId } : {}
}

function readEnvelope(input: unknown): PersistenceResult<ActiveSessionRecord> {
  if (!isRecord(input)) {
    return persistenceErr('corrupt', 'Persistence session record is not an object.')
  }
  if (input.format !== PERSISTENCE_WIRE_FORMAT) {
    return persistenceErr('corrupt', 'Persistence session record has an unknown format.')
  }
  if (input.schemaVersion !== PERSISTENCE_WIRE_VERSION) {
    return persistenceErr('unsupported-version', 'Persistence session version is not supported.')
  }
  if (!isInstant(input.savedAt)) {
    return persistenceErr('corrupt', 'Persistence session savedAt is invalid.')
  }
  if (!Array.isArray(input.events)) {
    return persistenceErr('corrupt', 'Persistence session events are invalid.')
  }
  return persistenceOk({
    format: PERSISTENCE_WIRE_FORMAT,
    schemaVersion: PERSISTENCE_WIRE_VERSION,
    savedAt: input.savedAt,
    events: input.events,
  })
}

function decodeEvent(
  input: unknown,
  index: number,
  options: SessionWireOptions,
): PersistenceResult<SessionEvent> {
  if (!isRecord(input)) return persistenceErr('corrupt', 'Persistence event is not an object.')
  const base = readBase(input, index)
  if (!base.ok) return base
  const { type } = base.value

  switch (type) {
    case 'SESSION_INITIALIZED':
      if (!hasExactKeys(input, [...BASE_KEYS, 'sessionId'])) return corruptEvent(type)
      if (!isNonEmptyString(input.sessionId)) return corruptEvent(type)
      return persistenceOk({ ...base.value, type, reversible: false, sessionId: input.sessionId })
    case 'PUBLIC_STATUS_SET':
      if (!hasExactKeys(input, [...BASE_KEYS, 'code'])) return corruptEvent(type)
      if (!isPublicStatusCode(input.code)) return corruptEvent(type)
      return persistenceOk({ ...base.value, type, reversible: true, code: input.code })
    case 'SEQUENCE_ADVANCED':
    case 'WAITING_MARKED':
      if (!hasExactKeys(input, BASE_KEYS)) return corruptEvent(type)
      return persistenceOk({ ...base.value, type, reversible: true })
    case 'HOST_NOTE_SET':
      if (!hasExactKeys(input, [...BASE_KEYS, 'note'])) return corruptEvent(type)
      if (typeof input.note !== 'string') return corruptEvent(type)
      return persistenceOk({ ...base.value, type, reversible: true, note: input.note })
    case 'EVENT_UNDONE':
      if (!hasExactKeys(input, [...BASE_KEYS, 'targetEventId'])) return corruptEvent(type)
      if (!isEventId(input.targetEventId)) return corruptEvent(type)
      return persistenceOk({ ...base.value, type, reversible: false, targetEventId: input.targetEventId })
    case 'GAME_INITIALIZED': {
      if (!hasExactKeys(input, [...BASE_KEYS, 'definitionJson'])) return corruptEvent(type)
      if (typeof input.definitionJson !== 'string') return corruptEvent(type)
      const imported = importGameFromJsonText(input.definitionJson, { registry: options.registry })
      if (imported.status !== 'success') {
        return persistenceErr('corrupt', 'GAME_INITIALIZED definitionJson failed import.')
      }
      return persistenceOk({ ...base.value, type, reversible: false, definition: imported.definition })
    }
    case 'CURRENT_ROUND_SELECTED':
    case 'ROUND_ADVANCED': {
      if (!hasExactKeys(input, [...BASE_KEYS, 'roundIndex', 'roundId', 'support'])) {
        return corruptEvent(type)
      }
      if (!isNonNegativeInteger(input.roundIndex)) return corruptEvent(type)
      if (!isNonEmptyString(input.roundId)) return corruptEvent(type)
      if (!isRoundSupport(input.support)) return corruptEvent(type)
      return persistenceOk({
        ...base.value,
        type,
        reversible: true,
        roundIndex: input.roundIndex,
        roundId: input.roundId,
        support: input.support,
      })
    }
    case 'GAME_SESSION_ENDED':
      if (!hasExactKeys(input, BASE_KEYS)) return corruptEvent(type)
      return persistenceOk({ ...base.value, type, reversible: false })
    case 'CATEGORY_BOARD_TILE_SELECTED':
    case 'CATEGORY_BOARD_ANSWER_REVEALED':
    case 'TEAM_BUZZED': {
      const keys = type === 'TEAM_BUZZED'
        ? [...BASE_KEYS, 'roundId', 'tileId', 'teamId']
        : [...BASE_KEYS, 'roundId', 'tileId']
      if (!hasExactKeys(input, keys)) return corruptEvent(type)
      if (!isNonEmptyString(input.roundId) || !isNonEmptyString(input.tileId)) return corruptEvent(type)
      if (type === 'TEAM_BUZZED') {
        if (!isNonEmptyString(input.teamId)) return corruptEvent(type)
        return persistenceOk({
          ...base.value,
          type,
          reversible: true,
          roundId: input.roundId,
          tileId: input.tileId,
          teamId: input.teamId,
        })
      }
      return persistenceOk({
        ...base.value,
        type,
        reversible: true,
        roundId: input.roundId,
        tileId: input.tileId,
      })
    }
    case 'CATEGORY_BOARD_PROMPT_REVEALED':
    case 'CATEGORY_BOARD_RETURNED':
    case 'RESPONSE_PHASE_ARMED':
    case 'RESPONSE_PHASE_DISARMED':
    case 'RESPONSE_PHASE_RESET':
      if (!hasExactKeys(input, [...BASE_KEYS, 'roundId'])) return corruptEvent(type)
      if (!isNonEmptyString(input.roundId)) return corruptEvent(type)
      return persistenceOk({ ...base.value, type, reversible: true, roundId: input.roundId })
    case 'TEAM_SCORE_ADJUSTED': {
      if (!hasExactKeys(input, [...BASE_KEYS, 'teamId', 'delta', 'mode', 'source'])) {
        return corruptEvent(type)
      }
      if (!isNonEmptyString(input.teamId)) return corruptEvent(type)
      if (!isScoreDeltaLike(input.delta)) return corruptEvent(type)
      if (!isScoreAdjustmentMode(input.mode)) return corruptEvent(type)
      if (!isScoreSource(input.source)) return corruptEvent(type)
      return persistenceOk({
        ...base.value,
        type,
        reversible: true,
        teamId: input.teamId,
        delta: input.delta,
        mode: input.mode,
        source: cloneScoreSource(input.source),
      })
    }
    case 'RESPONSE_TIMER_STARTED': {
      if (!hasExactKeys(input, [...BASE_KEYS, 'roundId', 'timerId', 'durationMs', 'startedAt', 'deadline'])) {
        return corruptEvent(type)
      }
      const startedAt = input.startedAt
      const deadline = input.deadline
      if (!isTimerCommon(input)) return corruptEvent(type)
      if (!isInstant(startedAt) || !isInstant(deadline)) return corruptEvent(type)
      return persistenceOk({
        ...base.value,
        type,
        reversible: true,
        roundId: input.roundId,
        timerId: input.timerId,
        durationMs: input.durationMs,
        startedAt,
        deadline,
      })
    }
    case 'RESPONSE_TIMER_PAUSED': {
      if (!hasExactKeys(input, [...BASE_KEYS, 'roundId', 'timerId', 'remainingMs'])) return corruptEvent(type)
      const remainingMs = input.remainingMs
      if (!isRoundTimerId(input) || !isNonNegativeInteger(remainingMs)) return corruptEvent(type)
      return persistenceOk({
        ...base.value,
        type,
        reversible: true,
        roundId: input.roundId,
        timerId: input.timerId,
        remainingMs,
      })
    }
    case 'RESPONSE_TIMER_RESUMED': {
      if (!hasExactKeys(input, [...BASE_KEYS, 'roundId', 'timerId', 'resumedAt', 'deadline'])) return corruptEvent(type)
      const resumedAt = input.resumedAt
      const deadline = input.deadline
      if (!isRoundTimerId(input) || !isInstant(resumedAt) || !isInstant(deadline)) {
        return corruptEvent(type)
      }
      return persistenceOk({
        ...base.value,
        type,
        reversible: true,
        roundId: input.roundId,
        timerId: input.timerId,
        resumedAt,
        deadline,
      })
    }
    case 'RESPONSE_TIMER_INTERRUPTED': {
      if (!hasExactKeys(input, [...BASE_KEYS, 'roundId', 'timerId', 'source', 'remainingMs'])) {
        return corruptEvent(type)
      }
      const source = input.source
      const remainingMs = input.remainingMs
      if (!isRoundTimerId(input)) return corruptEvent(type)
      if (!isResponseInterruptionSource(source)) return corruptEvent(type)
      if (!isNonNegativeInteger(remainingMs)) return corruptEvent(type)
      return persistenceOk({
        ...base.value,
        type,
        reversible: true,
        roundId: input.roundId,
        timerId: input.timerId,
        source: cloneInterruptionSource(source),
        remainingMs,
      })
    }
    case 'RESPONSE_TIMER_EXPIRED': {
      if (!hasExactKeys(input, [...BASE_KEYS, 'roundId', 'timerId', 'deadline'])) return corruptEvent(type)
      const deadline = input.deadline
      if (!isRoundTimerId(input) || !isInstant(deadline)) return corruptEvent(type)
      return persistenceOk({
        ...base.value,
        type,
        reversible: true,
        roundId: input.roundId,
        timerId: input.timerId,
        deadline,
      })
    }
    case 'ACTIVE_RESPONSE_RESOLVED': {
      if (!hasExactKeys(input, [...BASE_KEYS, 'roundId', 'tileId', 'teamId', 'resolution'])) {
        return corruptEvent(type)
      }
      if (!isNonEmptyString(input.roundId) || !isNonEmptyString(input.tileId)) return corruptEvent(type)
      if (!isNonEmptyString(input.teamId)) return corruptEvent(type)
      if (!isActiveResponseResolution(input.resolution)) return corruptEvent(type)
      return persistenceOk({
        ...base.value,
        type,
        reversible: true,
        roundId: input.roundId,
        tileId: input.tileId,
        teamId: input.teamId,
        resolution: cloneResolution(input.resolution),
      })
    }
  }
}

const BASE_KEYS = ['id', 'type', 'seq', 'occurredAt', 'reversible'] as const

function readBase(input: Record<string, unknown>, index: number): PersistenceResult<{
  readonly id: string
  readonly type: SessionEvent['type']
  readonly seq: number
  readonly occurredAt: number
  readonly reversible: boolean
}> {
  if (!isKnownEventType(input.type)) return persistenceErr('corrupt', 'Persistence event type is invalid.')
  if (!isNonNegativeInteger(input.seq) || input.seq !== index) {
    return persistenceErr('corrupt', 'Persistence event sequence is not contiguous.')
  }
  if (input.id !== `evt-${index}`) return persistenceErr('corrupt', 'Persistence event id does not match its sequence.')
  if (!isInstant(input.occurredAt)) return persistenceErr('corrupt', 'Persistence event occurredAt is invalid.')
  if (typeof input.reversible !== 'boolean') return persistenceErr('corrupt', 'Persistence event reversibility is invalid.')
  if (input.reversible !== reversibleFor(input.type)) {
    return persistenceErr('corrupt', 'Persistence event reversibility does not match its type.')
  }
  return persistenceOk({
    id: `evt-${index}`,
    type: input.type,
    seq: index,
    occurredAt: input.occurredAt,
    reversible: input.reversible,
  })
}

function reversibleFor(type: SessionEvent['type']): boolean {
  return ![
    'SESSION_INITIALIZED',
    'EVENT_UNDONE',
    'GAME_INITIALIZED',
    'GAME_SESSION_ENDED',
  ].includes(type)
}

function corruptEvent(type: string): PersistenceResult<never> {
  return persistenceErr('corrupt', `Persistence event ${type} is malformed.`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareKeys(a: string, b: string): number {
  return a.localeCompare(b)
}

function hasExactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(record).sort(compareKeys)
  const expected = [...keys].sort(compareKeys)
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function isKnownEventType(value: unknown): value is SessionEvent['type'] {
  return typeof value === 'string' && (EVENT_TYPES as readonly string[]).includes(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isEventId(value: unknown): value is string {
  return typeof value === 'string' && /^evt-\d+$/.test(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
}

function isScoreDeltaLike(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value !== 0
}

function isRoundSupport(value: unknown): value is RoundSupport {
  return value === 'supported' || value === 'unsupported'
}

function isRoundTimerId(input: Record<string, unknown>): input is {
  readonly roundId: string
  readonly timerId: string
} {
  return isNonEmptyString(input.roundId) && isNonEmptyString(input.timerId)
}

function isTimerCommon(input: Record<string, unknown>): input is {
  readonly roundId: string
  readonly timerId: string
  readonly durationMs: number
} {
  const durationMs = input.durationMs
  return isRoundTimerId(input) && isNonNegativeInteger(durationMs) && durationMs > 0
}

function cloneScoreSource(source: ScoreSource): ScoreSource {
  return source.kind === 'manual'
    ? { kind: 'manual' }
    : { kind: 'category-board-tile', roundId: source.roundId, tileId: source.tileId }
}

function cloneInterruptionSource(source: ResponseInterruptionSource): ResponseInterruptionSource {
  return { kind: source.kind }
}

function cloneResolution(resolution: ActiveResponseResolution): ActiveResponseResolution {
  return { kind: resolution.kind }
}
