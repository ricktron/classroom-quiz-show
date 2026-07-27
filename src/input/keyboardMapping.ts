import {
  DEFAULT_PRIMARY_KEY_CODES,
  isReservedKeyCode,
  isSupportedKeyCode,
} from './keyboardKeys'
import {
  isLocalInputAction,
  PRIMARY_BUZZ,
  type LocalInputAction,
} from './logicalAction'
import type { TeamDefinition } from '../game/teams/definition'

/**
 * The keyboard MAPPING model (Slice 8).
 *
 * A mapping associates a **physical input identity** (a `KeyboardEvent.code`)
 * with a **team** and a **logical action**. It is host-device configuration: it
 * is not authored game content, it is not session history, and it never enters
 * the event log or `PublicState` (`ROADMAP-AMENDMENT-001` §5.6).
 *
 * Keeping the three parts separate is what makes the engine button-agnostic. A
 * later gamepad mapping replaces `code: string` with whatever identifies a
 * physical control there, and reuses `teamId` + {@link LocalInputAction}
 * unchanged.
 *
 * ## Validation, not repair
 *
 * `validateKeyboardMapping` follows the ADR-004 discipline the import pipeline
 * established: every problem is reported as a structured issue with the exact
 * binding index, nothing is silently dropped, nothing is coerced into validity,
 * and nothing is overwritten. The host UI shows the issues and refuses to apply
 * the mapping; only `loadStoredKeyboardMapping` (a different boundary, reading
 * untrusted persisted data) is allowed to fall back, and it falls back to
 * defaults wholesale rather than to a half-repaired mapping.
 */

/** Current version of the mapping shape. Bumped only alongside a real migration. */
export const KEYBOARD_MAPPING_VERSION = 1 as const

/** One physical key bound to one team and one logical action. */
export interface KeyboardBinding {
  /** Physical key position (`KeyboardEvent.code`). Host-private, never durable. */
  readonly code: string
  /** The team this key speaks for. An authored `TeamId` value. */
  readonly teamId: string
  /** What pressing it means. */
  readonly action: LocalInputAction
}

/** A complete, versioned keyboard mapping. */
export interface KeyboardMapping {
  readonly version: typeof KEYBOARD_MAPPING_VERSION
  readonly bindings: readonly KeyboardBinding[]
}

/** The mapping used when a game has no teams, or nothing is configured. */
export const EMPTY_KEYBOARD_MAPPING: KeyboardMapping = Object.freeze({
  version: KEYBOARD_MAPPING_VERSION,
  bindings: Object.freeze([]) as readonly KeyboardBinding[],
})

/** Every reason a mapping can be refused. Bounded and typed, never a free string. */
export const KEYBOARD_MAPPING_ISSUE_CODES = [
  'unsupported-key',
  'reserved-key',
  'duplicate-key',
  'unknown-team',
  'duplicate-team-primary',
  'malformed-action',
  'too-many-bindings',
] as const

export type KeyboardMappingIssueCode = (typeof KEYBOARD_MAPPING_ISSUE_CODES)[number]

/** One structured problem with a mapping, addressed to the binding that caused it. */
export interface KeyboardMappingIssue {
  readonly code: KeyboardMappingIssueCode
  /** Index into `bindings`, or `null` for a whole-mapping problem. */
  readonly bindingIndex: number | null
  /** Actionable, host-facing message. Host-only copy. */
  readonly message: string
}

export type KeyboardMappingValidation =
  | { readonly ok: true; readonly mapping: KeyboardMapping }
  | { readonly ok: false; readonly issues: readonly KeyboardMappingIssue[] }

/**
 * Upper bound on bindings.
 *
 * `MAX_TEAMS` (8) primary keys plus the four ordinal secondary slots each team
 * could one day carry. It exists so a corrupted or hostile stored mapping
 * produces a clean refusal rather than an unbounded loop.
 */
export const MAX_KEYBOARD_BINDINGS = 40

/**
 * Validate a mapping against the loaded game's teams.
 *
 * Checks, in the order a host would want to hear about them:
 *  - every key is a supported physical-key code;
 *  - no key is reserved for host operation;
 *  - no key is assigned twice (no silent overwriting — both are reported);
 *  - every action is a recognized logical action;
 *  - every team exists in the loaded game;
 *  - no team has two primary buzz keys.
 */
export function validateKeyboardMapping(
  mapping: KeyboardMapping,
  teams: readonly TeamDefinition[],
): KeyboardMappingValidation {
  const issues: KeyboardMappingIssue[] = []
  const bindings = mapping.bindings

  if (bindings.length > MAX_KEYBOARD_BINDINGS) {
    issues.push({
      code: 'too-many-bindings',
      bindingIndex: null,
      message: `A mapping may hold at most ${MAX_KEYBOARD_BINDINGS} bindings.`,
    })
    return { ok: false, issues }
  }

  const knownTeamIds = new Set(teams.map((team) => team.id as string))
  const seenCodes = new Map<string, number>()
  const primaryByTeam = new Map<string, number>()

  bindings.forEach((binding, index) => {
    if (!isSupportedKeyCode(binding.code)) {
      issues.push({
        code: 'unsupported-key',
        bindingIndex: index,
        message: 'That key cannot be used. Choose a letter, number or function key.',
      })
    } else if (isReservedKeyCode(binding.code)) {
      issues.push({
        code: 'reserved-key',
        bindingIndex: index,
        message:
          'That key is reserved for operating the host screen (focus, activation, cancel or reload).',
      })
    } else {
      const first = seenCodes.get(binding.code)
      if (first === undefined) {
        seenCodes.set(binding.code, index)
      } else {
        issues.push({
          code: 'duplicate-key',
          bindingIndex: index,
          message: 'That key is already assigned. Each key may be used once.',
        })
      }
    }

    if (!isLocalInputAction(binding.action)) {
      issues.push({
        code: 'malformed-action',
        bindingIndex: index,
        message: 'That binding does not name a recognized input action.',
      })
      return
    }

    if (typeof binding.teamId !== 'string' || !knownTeamIds.has(binding.teamId)) {
      issues.push({
        code: 'unknown-team',
        bindingIndex: index,
        message: 'That binding names a team this game does not have.',
      })
      return
    }

    if (binding.action.kind === 'primary-buzz') {
      const first = primaryByTeam.get(binding.teamId)
      if (first === undefined) {
        primaryByTeam.set(binding.teamId, index)
      } else {
        issues.push({
          code: 'duplicate-team-primary',
          bindingIndex: index,
          message: 'That team already has a buzz key. A team has one buzz key at a time.',
        })
      }
    }
  })

  if (issues.length > 0) return { ok: false, issues }
  return { ok: true, mapping }
}

/**
 * The default mapping: one digit-row key per team, in authored team order.
 *
 * Safe (every code is bindable and unreserved), understandable ("team one presses
 * 1"), and bounded — a game with more teams than {@link DEFAULT_PRIMARY_KEY_CODES}
 * simply leaves the surplus teams unbound rather than inventing a key, and the
 * host UI shows them as "not assigned". `MAX_TEAMS` is 8, so that case is
 * unreachable today; it is handled anyway rather than assumed away.
 */
export function defaultKeyboardMapping(teams: readonly TeamDefinition[]): KeyboardMapping {
  const bindings: KeyboardBinding[] = []
  teams.forEach((team, index) => {
    const code = DEFAULT_PRIMARY_KEY_CODES[index]
    if (code === undefined) return
    bindings.push({ code, teamId: team.id as string, action: PRIMARY_BUZZ })
  })
  return { version: KEYBOARD_MAPPING_VERSION, bindings }
}

/**
 * Find the binding for a pressed key, or `null`.
 *
 * A reserved or unsupported code never resolves, even if a hand-edited stored
 * mapping contains one — the adapter therefore cannot be made to act on a key
 * that validation would have refused.
 */
export function resolveKeyboardBinding(
  mapping: KeyboardMapping,
  code: string,
): KeyboardBinding | null {
  if (!isSupportedKeyCode(code) || isReservedKeyCode(code)) return null
  return mapping.bindings.find((binding) => binding.code === code) ?? null
}

/** The primary buzz key assigned to a team, or `null` when it has none. */
export function primaryKeyForTeam(mapping: KeyboardMapping, teamId: string): string | null {
  const binding = mapping.bindings.find(
    (candidate) => candidate.teamId === teamId && candidate.action.kind === 'primary-buzz',
  )
  return binding ? binding.code : null
}

/**
 * Return a mapping with one team's primary buzz key set (or cleared with `null`).
 *
 * PURE: it builds a new mapping and never mutates the input. It replaces that
 * team's existing primary binding rather than adding a second — but it does NOT
 * steal a key already used by another team, so the result can still be invalid
 * and the caller must validate. Refusing to repair silently is the point.
 */
export function withPrimaryKeyForTeam(
  mapping: KeyboardMapping,
  teamId: string,
  code: string | null,
): KeyboardMapping {
  const kept = mapping.bindings.filter(
    (binding) => !(binding.teamId === teamId && binding.action.kind === 'primary-buzz'),
  )
  const bindings =
    code === null ? kept : [...kept, { code, teamId, action: PRIMARY_BUZZ } as KeyboardBinding]
  return { version: KEYBOARD_MAPPING_VERSION, bindings }
}

/**
 * Drop bindings whose team no longer exists.
 *
 * Used when a mapping is read back after the loaded game changed — a renamed
 * team keeps its id and therefore its key, while a REMOVED team's binding is
 * dropped rather than left pointing at nothing. This is the one place a mapping
 * is narrowed automatically, and it removes only bindings that could never be
 * valid again.
 */
export function pruneUnknownTeams(
  mapping: KeyboardMapping,
  teams: readonly TeamDefinition[],
): KeyboardMapping {
  const knownTeamIds = new Set(teams.map((team) => team.id as string))
  const bindings = mapping.bindings.filter((binding) => knownTeamIds.has(binding.teamId))
  if (bindings.length === mapping.bindings.length) return mapping
  return { version: KEYBOARD_MAPPING_VERSION, bindings }
}
