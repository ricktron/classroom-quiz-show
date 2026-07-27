import {
  KEYBOARD_MAPPING_VERSION,
  MAX_KEYBOARD_BINDINGS,
  defaultKeyboardMapping,
  pruneUnknownTeams,
  validateKeyboardMapping,
  type KeyboardBinding,
  type KeyboardMapping,
} from './keyboardMapping'
import { isLocalInputAction } from './logicalAction'
import type { TeamDefinition } from '../game/teams/definition'

/**
 * Local persistence for keyboard mappings (Slice 8).
 *
 * ## What this is, and firmly is not
 *
 * Keyboard mappings are **host-device configuration**. They are stored apart
 * from every other kind of truth in this project, and the separation is the
 * decision, not an implementation detail:
 *
 * | Kind of truth | Where it lives | This module? |
 * | --- | --- | --- |
 * | Authored game content | the imported `GameDefinition` | no |
 * | Session history | the in-memory append-only event log | no |
 * | Portable export | Slice 12 | no |
 * | Session persistence & recovery | Slice 13 | **no** |
 * | Which key this laptop's team 3 presses | here | yes |
 *
 * **This is not the start of Slice 13.** No event, no revision, no game state and
 * no session identity is stored — only a version and a list of
 * `{ code, teamId, action }` triples for the machine the teacher is sitting at.
 * Clearing it loses a keyboard preference and nothing else.
 *
 * ## Fail safe, never repair
 *
 * Stored data is untrusted input, so it is parsed defensively and validated with
 * exactly the same validator the editor uses. Anything wrong — absent, corrupt
 * JSON, wrong version, wrong shape, a reserved key, a duplicate, a team this game
 * does not have — resolves to the DEFAULT mapping rather than to a partially
 * repaired one. A half-honoured mapping would leave a teacher with some buzzers
 * working and no way to tell which.
 *
 * The single exception is a team that has been REMOVED from the loaded game:
 * those bindings can never be valid again, so they are pruned and the rest of the
 * mapping is kept (`pruneUnknownTeams`). A RENAMED team keeps its id and keeps
 * its key.
 *
 * ## Privacy
 *
 * No student identity is stored, and none is representable: a binding names a
 * TEAM id, which is authored content, exactly as every score does. Nothing here
 * is networked, synced, or sent anywhere; there is no account and no cloud path.
 */

/**
 * Storage key. Versioned in the key itself so a future format lands beside this
 * one instead of being read as though it were this one.
 */
export const KEYBOARD_MAPPING_STORAGE_KEY = 'classroom-quiz-show:input:keyboard-mapping:v1'

/** The minimal storage surface this module needs. `window.localStorage` satisfies it. */
export interface LocalConfigStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/** Why a stored mapping was not used. Typed so the host can say something useful. */
export const KEYBOARD_MAPPING_LOAD_OUTCOMES = [
  'loaded',
  'pruned',
  'absent',
  'unreadable',
  'unsupported-version',
  'malformed',
  'invalid',
] as const

export type KeyboardMappingLoadOutcome = (typeof KEYBOARD_MAPPING_LOAD_OUTCOMES)[number]

export interface KeyboardMappingLoadResult {
  readonly mapping: KeyboardMapping
  readonly outcome: KeyboardMappingLoadOutcome
  /** True when `mapping` is the generated default rather than stored data. */
  readonly usedDefault: boolean
}

/** Host-facing explanation of a load outcome. Host-only copy — never projected. */
export const KEYBOARD_MAPPING_LOAD_MESSAGE: Readonly<
  Record<KeyboardMappingLoadOutcome, string>
> = {
  loaded: 'Buzz keys restored from this device.',
  pruned:
    'Buzz keys restored from this device. Keys for teams that are no longer in this game were removed.',
  absent: 'Using the default buzz keys for this game.',
  unreadable: 'This device’s saved buzz keys could not be read, so the defaults are in use.',
  'unsupported-version':
    'This device’s saved buzz keys are in an older format, so the defaults are in use.',
  malformed: 'This device’s saved buzz keys were not readable, so the defaults are in use.',
  invalid: 'This device’s saved buzz keys are no longer valid, so the defaults are in use.',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Read an unknown parsed value as a mapping, or `null`.
 *
 * Strict and total: it validates the version, the array, and every binding's
 * shape before anything downstream sees it. It performs no coercion — a numeric
 * `code`, a missing `action` or an extra field on a binding all fail rather than
 * being tidied up.
 */
export function readStoredKeyboardMapping(value: unknown): KeyboardMapping | null {
  if (!isRecord(value)) return null
  if (value.version !== KEYBOARD_MAPPING_VERSION) return null
  if (!Array.isArray(value.bindings)) return null
  if (value.bindings.length > MAX_KEYBOARD_BINDINGS) return null

  const bindings: KeyboardBinding[] = []
  for (const raw of value.bindings) {
    if (!isRecord(raw)) return null
    if (typeof raw.code !== 'string' || raw.code.length === 0) return null
    if (typeof raw.teamId !== 'string' || raw.teamId.length === 0) return null
    if (!isLocalInputAction(raw.action)) return null
    // Rebuilt field by field so a stored object cannot carry an unexpected extra
    // property into the running mapping.
    bindings.push(
      raw.action.kind === 'primary-buzz'
        ? { code: raw.code, teamId: raw.teamId, action: { kind: 'primary-buzz' } }
        : { code: raw.code, teamId: raw.teamId, action: { kind: 'secondary', slot: raw.action.slot } },
    )
  }
  return { version: KEYBOARD_MAPPING_VERSION, bindings }
}

/**
 * Load this device's mapping for the given teams, falling back to the default.
 *
 * TOTAL — it never throws, whatever the storage does (a private-mode browser
 * that throws on access, a quota error, a value someone pasted by hand).
 */
export function loadKeyboardMapping(
  storage: LocalConfigStorage | null,
  teams: readonly TeamDefinition[],
): KeyboardMappingLoadResult {
  const fallback = defaultKeyboardMapping(teams)
  if (!storage) return { mapping: fallback, outcome: 'absent', usedDefault: true }

  let raw: string | null
  try {
    raw = storage.getItem(KEYBOARD_MAPPING_STORAGE_KEY)
  } catch {
    return { mapping: fallback, outcome: 'unreadable', usedDefault: true }
  }
  if (raw === null) return { mapping: fallback, outcome: 'absent', usedDefault: true }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { mapping: fallback, outcome: 'malformed', usedDefault: true }
  }

  // Distinguish "an older/newer format" from "nonsense", because the two mean
  // different things to a teacher and only one of them is a defect. A value that
  // is not even an object with a version — an array, a number, a bare string — is
  // nonsense, not an old format, and is reported as such.
  if (
    isRecord(parsed) &&
    !Array.isArray(parsed) &&
    parsed.version !== undefined &&
    parsed.version !== KEYBOARD_MAPPING_VERSION
  ) {
    return { mapping: fallback, outcome: 'unsupported-version', usedDefault: true }
  }

  const stored = readStoredKeyboardMapping(parsed)
  if (stored === null) return { mapping: fallback, outcome: 'malformed', usedDefault: true }

  const pruned = pruneUnknownTeams(stored, teams)
  const validation = validateKeyboardMapping(pruned, teams)
  if (!validation.ok) return { mapping: fallback, outcome: 'invalid', usedDefault: true }

  return {
    mapping: validation.mapping,
    outcome: pruned === stored ? 'loaded' : 'pruned',
    usedDefault: false,
  }
}

/**
 * Persist a mapping to this device. Returns whether it was written.
 *
 * TOTAL — a full quota or a storage-denying browser returns `false` rather than
 * throwing, and the host says so instead of pretending the mapping was saved.
 */
export function saveKeyboardMapping(
  storage: LocalConfigStorage | null,
  mapping: KeyboardMapping,
): boolean {
  if (!storage) return false
  try {
    storage.setItem(KEYBOARD_MAPPING_STORAGE_KEY, JSON.stringify(mapping))
    return true
  } catch {
    return false
  }
}

/** Forget this device's mapping. Total, like its siblings. */
export function clearKeyboardMapping(storage: LocalConfigStorage | null): boolean {
  if (!storage) return false
  try {
    storage.removeItem(KEYBOARD_MAPPING_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

/**
 * The browser's local storage, or `null` when it is unavailable.
 *
 * Never throws: Safari private mode and some managed-device policies make even
 * *touching* `localStorage` throw, and a buzzer mapping is not worth crashing a
 * lesson over. `null` degrades to "defaults, not persisted", which is a fully
 * usable state — the app remains offline-capable and hardware-free either way.
 */
export function browserLocalConfigStorage(): LocalConfigStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}
