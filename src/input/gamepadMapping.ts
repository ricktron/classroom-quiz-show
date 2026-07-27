import {
  isGamepadButtonIndex,
  isGamepadControllerIndex,
  controllerLabel,
} from './gamepadSource'
import { isLocalInputAction, type LocalInputAction } from './logicalAction'
import type { TeamDefinition } from '../game/teams/definition'

/**
 * The generic Gamepad MAPPING model (Slice 9).
 *
 * A mapping associates a **physical control** with a **team** and a **logical
 * action** — the same three-part separation the keyboard mapping uses, with the
 * physical part swapped and nothing else touched. That is the boundary paying
 * off: `teamId` and {@link LocalInputAction} are reused verbatim, and the engine
 * stays button-agnostic.
 *
 * | | Keyboard (Slice 8) | Gamepad (Slice 9) |
 * | --- | --- | --- |
 * | Physical identity | `code` (`KeyboardEvent.code`) | `controllerIndex` + `buttonIndex` |
 * | Team | `teamId` | `teamId` — unchanged |
 * | Meaning | `LocalInputAction` | `LocalInputAction` — unchanged |
 *
 * ## GENERIC, and it stays generic
 *
 * A physical control is two small non-negative integers. There is no model name,
 * no vendor id, no product id, no colour, no handset number and no device
 * profile here, and none is representable. Slice 10 owns all of that; a Slice 9
 * mapping cannot express any of it even by accident.
 *
 * ## Session-local, and NOT persisted
 *
 * The roadmap records Slice 9's storage impact as **none**, so a Gamepad mapping
 * is host configuration for the current page only: there is no storage module
 * beside this one, no `localStorage` key, no IndexedDB, no export, no game-file
 * field and nothing synced to the projector. **A Gamepad mapping is lost when the
 * host tab reloads**, and the host UI says so. That is a deliberate boundary
 * against Slice 10 (setup UX) and Slice 13 (persistence), not an oversight.
 *
 * Browser controller indices are why the boundary is easy to hold: an index is a
 * session-local locator that the browser auto-increments, and it is not stable
 * across a reload, a browser restart, a reconnect, a different USB port, a
 * different operating system or a different browser version. Persisting one would
 * be persisting a number that means something different tomorrow.
 *
 * ## Validation, not repair
 *
 * Same discipline as ADR-004 and the keyboard mapping: every problem is a
 * structured issue addressed to the exact binding index, nothing is dropped,
 * coerced, repaired or silently overwritten, and the host UI refuses to apply a
 * mapping that has issues.
 */

/** Current version of the mapping shape. Bumped only alongside a real migration. */
export const GAMEPAD_MAPPING_VERSION = 1 as const

/** A physical control: one button on one browser-session controller. */
export interface GamepadControlRef {
  /** Browser-session locator. NOT durable — see the module note above. */
  readonly controllerIndex: number
  readonly buttonIndex: number
}

/** One physical control bound to one team and one logical action. */
export interface GamepadBinding extends GamepadControlRef {
  /** The team this control speaks for. An authored `TeamId` value. */
  readonly teamId: string
  /** What pressing it means. */
  readonly action: LocalInputAction
}

/** A complete, versioned generic Gamepad mapping. */
export interface GamepadMapping {
  readonly version: typeof GAMEPAD_MAPPING_VERSION
  readonly bindings: readonly GamepadBinding[]
}

/**
 * The starting mapping: EMPTY.
 *
 * There is deliberately no default. A default would have to assume which button
 * of which controller means "buzz", and that assumption is exactly the
 * model-specific knowledge this slice is forbidden to invent. A teacher assigns
 * buttons by pressing them, or nothing is bound.
 */
export const EMPTY_GAMEPAD_MAPPING: GamepadMapping = Object.freeze({
  version: GAMEPAD_MAPPING_VERSION,
  bindings: Object.freeze([]) as readonly GamepadBinding[],
})

/** Every reason a mapping can be refused. Bounded and typed, never a free string. */
export const GAMEPAD_MAPPING_ISSUE_CODES = [
  'malformed-controller-index',
  'malformed-button-index',
  'duplicate-control',
  'unknown-team',
  'duplicate-team-primary',
  'malformed-action',
  'too-many-bindings',
] as const

export type GamepadMappingIssueCode = (typeof GAMEPAD_MAPPING_ISSUE_CODES)[number]

/** One structured problem, addressed to the binding that caused it. */
export interface GamepadMappingIssue {
  readonly code: GamepadMappingIssueCode
  /** Index into `bindings`, or `null` for a whole-mapping problem. */
  readonly bindingIndex: number | null
  /** Actionable, host-facing message. Host-only copy — never projected. */
  readonly message: string
}

export type GamepadMappingValidation =
  | { readonly ok: true; readonly mapping: GamepadMapping }
  | { readonly ok: false; readonly issues: readonly GamepadMappingIssue[] }

/**
 * Upper bound on bindings.
 *
 * `MAX_TEAMS` (8) primary controls plus the four ordinal secondary slots each
 * team could carry. Identical to the keyboard bound and for the identical reason:
 * a corrupted mapping produces a clean refusal rather than an unbounded loop.
 */
export const MAX_GAMEPAD_BINDINGS = 40

/** Do two logical actions mean the same thing? Exhaustive over the union. */
export function sameLocalInputAction(left: LocalInputAction, right: LocalInputAction): boolean {
  if (left.kind !== right.kind) return false
  if (left.kind === 'secondary' && right.kind === 'secondary') return left.slot === right.slot
  return true
}

/**
 * Validate a mapping against the loaded game's teams.
 *
 * Checks, in the order a host would want to hear about them:
 *  - every controller index is a bounded non-negative integer;
 *  - every button index is a bounded non-negative integer;
 *  - no physical control is assigned twice (BOTH are reported, neither wins);
 *  - every action is a recognized logical action;
 *  - every team exists in the loaded game;
 *  - no team has two primary buzz controls.
 *
 * Note what is deliberately NOT checked: whether the controller is currently
 * connected, and whether it has that many buttons. A mapping made while a
 * controller is plugged in must survive it being unplugged and plugged back in,
 * so "absent controller" and "absent button" are RESOLUTION facts (the binding
 * simply never fires, and the host UI says the controller is not connected) — not
 * validation failures that would delete a teacher's work.
 */
export function validateGamepadMapping(
  mapping: GamepadMapping,
  teams: readonly TeamDefinition[],
): GamepadMappingValidation {
  const issues: GamepadMappingIssue[] = []
  const bindings = mapping.bindings

  if (bindings.length > MAX_GAMEPAD_BINDINGS) {
    issues.push({
      code: 'too-many-bindings',
      bindingIndex: null,
      message: `A controller mapping may hold at most ${MAX_GAMEPAD_BINDINGS} bindings.`,
    })
    return { ok: false, issues }
  }

  const knownTeamIds = new Set(teams.map((team) => team.id as string))
  const seenControls = new Set<string>()
  const primaryByTeam = new Set<string>()

  bindings.forEach((binding, index) => {
    let controlIsUsable = true

    if (!isGamepadControllerIndex(binding.controllerIndex)) {
      controlIsUsable = false
      issues.push({
        code: 'malformed-controller-index',
        bindingIndex: index,
        message: 'That binding does not name a controller this version can use.',
      })
    }
    if (!isGamepadButtonIndex(binding.buttonIndex)) {
      controlIsUsable = false
      issues.push({
        code: 'malformed-button-index',
        bindingIndex: index,
        message: 'That binding does not name a button this version can use.',
      })
    }

    if (controlIsUsable) {
      const key = controlKey(binding)
      if (seenControls.has(key)) {
        issues.push({
          code: 'duplicate-control',
          bindingIndex: index,
          message: 'That button is already assigned. Each button may be used once.',
        })
      } else {
        seenControls.add(key)
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
      if (primaryByTeam.has(binding.teamId)) {
        issues.push({
          code: 'duplicate-team-primary',
          bindingIndex: index,
          message:
            'That team already has a buzz button on a controller. A team has one controller buzz button at a time.',
        })
      } else {
        primaryByTeam.add(binding.teamId)
      }
    }
  })

  if (issues.length > 0) return { ok: false, issues }
  return { ok: true, mapping }
}

function controlKey(control: GamepadControlRef): string {
  return `${control.controllerIndex}:${control.buttonIndex}`
}

/**
 * Find the binding for a pressed physical control, or `null`.
 *
 * A malformed control never resolves, even if a hand-built mapping contains one,
 * so the adapter cannot be made to act on a binding validation would have
 * refused.
 */
export function resolveGamepadBinding(
  mapping: GamepadMapping,
  control: GamepadControlRef,
): GamepadBinding | null {
  if (!isGamepadControllerIndex(control.controllerIndex)) return null
  if (!isGamepadButtonIndex(control.buttonIndex)) return null
  return (
    mapping.bindings.find(
      (binding) =>
        binding.controllerIndex === control.controllerIndex &&
        binding.buttonIndex === control.buttonIndex,
    ) ?? null
  )
}

/** The control bound to one team's one logical action, or `null`. */
export function gamepadControlForTeamAction(
  mapping: GamepadMapping,
  teamId: string,
  action: LocalInputAction,
): GamepadControlRef | null {
  const binding = mapping.bindings.find(
    (candidate) =>
      candidate.teamId === teamId && sameLocalInputAction(candidate.action, action),
  )
  if (binding === undefined) return null
  return { controllerIndex: binding.controllerIndex, buttonIndex: binding.buttonIndex }
}

/**
 * Return a mapping with one team's binding for one action set (or cleared with
 * `null`).
 *
 * PURE: it builds a new mapping and never mutates the input. It REPLACES that
 * team's existing binding for that action rather than adding a second — but it
 * does NOT steal a control already used by another team or another action, so the
 * result can still be invalid and the caller must validate. Refusing to repair
 * silently is the point, and it is why a conflicting capture is reported to the
 * teacher instead of quietly reassigning somebody else's button.
 */
export function withGamepadControlForTeamAction(
  mapping: GamepadMapping,
  teamId: string,
  action: LocalInputAction,
  control: GamepadControlRef | null,
): GamepadMapping {
  const kept = mapping.bindings.filter(
    (binding) => !(binding.teamId === teamId && sameLocalInputAction(binding.action, action)),
  )
  const bindings =
    control === null
      ? kept
      : [
          ...kept,
          {
            controllerIndex: control.controllerIndex,
            buttonIndex: control.buttonIndex,
            teamId,
            action,
          } as GamepadBinding,
        ]
  return { version: GAMEPAD_MAPPING_VERSION, bindings }
}

/**
 * Drop bindings whose team no longer exists.
 *
 * Used when the loaded game changes under the host panel. A RENAMED team keeps
 * its id and therefore its button; a REMOVED team's binding could never be valid
 * again, so it goes. This is the one place a mapping narrows automatically.
 */
export function pruneUnknownGamepadTeams(
  mapping: GamepadMapping,
  teams: readonly TeamDefinition[],
): GamepadMapping {
  const knownTeamIds = new Set(teams.map((team) => team.id as string))
  const bindings = mapping.bindings.filter((binding) => knownTeamIds.has(binding.teamId))
  if (bindings.length === mapping.bindings.length) return mapping
  return { version: GAMEPAD_MAPPING_VERSION, bindings }
}

/**
 * Host-facing description of a physical control. HOST-ONLY copy.
 *
 * Neutral and session-local by construction: a one-based controller number and a
 * one-based button number. Never a colour, never a model, never the browser's
 * device `id` string.
 */
export function describeGamepadControl(control: GamepadControlRef): string {
  return `${controllerLabel(control.controllerIndex)} · button ${control.buttonIndex + 1}`
}
