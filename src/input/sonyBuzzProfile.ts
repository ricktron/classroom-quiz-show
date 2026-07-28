import type { TeamDefinition } from '../game/teams/definition'
import {
  EMPTY_GAMEPAD_MAPPING,
  GAMEPAD_MAPPING_VERSION,
  sameLocalInputAction,
  validateGamepadMapping,
  type GamepadBinding,
  type GamepadControlRef,
  type GamepadMapping,
  type GamepadMappingIssue,
  type GamepadMappingValidation,
} from './gamepadMapping'
import { PRIMARY_BUZZ, type LocalInputAction } from './logicalAction'

/**
 * Recommended Sony Buzz! CAPTURE RECIPE (Slice 10).
 *
 * This is **not** a hard-coded browser button-index table. Browser button indices
 * for Sony Buzz! on macOS/Chrome are unknown until the owner performs physical
 * validation. The profile therefore captures the actual current-session
 * `controllerIndex + buttonIndex` the teacher presses for each physical prompt.
 *
 * That works whether the device appears as one Gamepad or several: each prompt
 * records whatever control was observed. Team assignment is always explicit —
 * never derived from controller index.
 *
 * Staged bindings stay session-local host state. They never enter localStorage,
 * IndexedDB, a game file, export, sync, or `PublicState`. They do not affect
 * gameplay until the teacher explicitly Applies a complete, validated profile
 * into the active {@link GamepadMapping}.
 */

/** One physical prompt on a Buzz! handset, mapped to a logical action. */
export interface SonyBuzzHandsetPrompt {
  /** Stable key for staged progress (not a colour enum in the engine). */
  readonly promptId: SonyBuzzPromptId
  /** Colour name stated in TEXT for accessibility — never colour-alone status. */
  readonly colourLabel: string
  /** Full host-facing prompt. Host-only copy. */
  readonly promptLabel: string
  /** Logical action this physical control should mean. */
  readonly action: LocalInputAction
}

export const SONY_BUZZ_PROMPT_IDS = [
  'large-red',
  'blue',
  'orange',
  'green',
  'yellow',
] as const

export type SonyBuzzPromptId = (typeof SONY_BUZZ_PROMPT_IDS)[number]

/**
 * The recommended capture recipe for one handset.
 *
 * Order is the guided workflow order. Indices are deliberately absent.
 */
export const SONY_BUZZ_HANDSET_PROMPTS: readonly SonyBuzzHandsetPrompt[] = [
  {
    promptId: 'large-red',
    colourLabel: 'red',
    promptLabel: 'Press the large red buzzer',
    action: PRIMARY_BUZZ,
  },
  {
    promptId: 'blue',
    colourLabel: 'blue',
    promptLabel: 'Press the blue button',
    action: { kind: 'secondary', slot: 'secondary1' },
  },
  {
    promptId: 'orange',
    colourLabel: 'orange',
    promptLabel: 'Press the orange button',
    action: { kind: 'secondary', slot: 'secondary2' },
  },
  {
    promptId: 'green',
    colourLabel: 'green',
    promptLabel: 'Press the green button',
    action: { kind: 'secondary', slot: 'secondary3' },
  },
  {
    promptId: 'yellow',
    colourLabel: 'yellow',
    promptLabel: 'Press the yellow button',
    action: { kind: 'secondary', slot: 'secondary4' },
  },
] as const satisfies readonly SonyBuzzHandsetPrompt[]

/** One staged physical capture for one prompt. */
export interface SonyBuzzStagedControl {
  readonly promptId: SonyBuzzPromptId
  readonly control: GamepadControlRef
}

/** In-progress staged profile for exactly one handset → one team. */
export interface SonyBuzzStagedProfile {
  /** Explicit teacher-chosen team. Never inferred from controller index. */
  readonly teamId: string
  readonly staged: readonly SonyBuzzStagedControl[]
}

export type SonyBuzzStageResult =
  | { readonly ok: true; readonly profile: SonyBuzzStagedProfile }
  | { readonly ok: false; readonly issues: readonly string[] }

export type SonyBuzzApplyResult =
  | { readonly ok: true; readonly mapping: GamepadMapping }
  | { readonly ok: false; readonly issues: readonly GamepadMappingIssue[] | readonly string[] }

/** Empty staged profile scaffold for a chosen team. */
export function emptySonyBuzzStagedProfile(teamId: string): SonyBuzzStagedProfile {
  return Object.freeze({ teamId, staged: Object.freeze([]) as readonly SonyBuzzStagedControl[] })
}

/** How many of the five prompts are already staged. */
export function sonyBuzzStagedProgress(profile: SonyBuzzStagedProfile): {
  readonly captured: number
  readonly total: number
  readonly nextPrompt: SonyBuzzHandsetPrompt | null
} {
  const capturedIds = new Set(profile.staged.map((entry) => entry.promptId))
  const nextPrompt =
    SONY_BUZZ_HANDSET_PROMPTS.find((prompt) => !capturedIds.has(prompt.promptId)) ?? null
  return {
    captured: profile.staged.length,
    total: SONY_BUZZ_HANDSET_PROMPTS.length,
    nextPrompt,
  }
}

/**
 * Stage one observed control for the next outstanding prompt.
 *
 * Refuses:
 * - unknown / blank team;
 * - a complete profile (nothing left to capture);
 * - a control already staged in this profile;
 * - a control already used in the active mapping (no silent steal);
 * - a duplicate prompt id (should not happen via nextPrompt, but fail closed).
 *
 * Does NOT write into the active mapping. Staging is preview-only until Apply.
 */
export function stageSonyBuzzCapture(
  profile: SonyBuzzStagedProfile,
  control: GamepadControlRef,
  teams: readonly TeamDefinition[],
  activeMapping: GamepadMapping,
): SonyBuzzStageResult {
  const issues: string[] = []
  if (typeof profile.teamId !== 'string' || profile.teamId.length === 0) {
    issues.push('Choose a team for this handset before capturing buttons.')
  } else if (!teams.some((team) => (team.id as string) === profile.teamId)) {
    issues.push('That team is not in this game.')
  }

  const progress = sonyBuzzStagedProgress(profile)
  if (progress.nextPrompt === null) {
    issues.push('All five buttons for this handset are already staged. Preview and Apply, or Discard.')
  }

  if (profile.staged.some((entry) => sameControl(entry.control, control))) {
    issues.push('That button is already staged in this handset profile.')
  }

  if (
    activeMapping.bindings.some(
      (binding) =>
        binding.controllerIndex === control.controllerIndex &&
        binding.buttonIndex === control.buttonIndex,
    )
  ) {
    issues.push(
      'That button is already assigned in the active controller mapping. Clear it first, or choose another button. Nothing was overwritten.',
    )
  }

  if (issues.length > 0 || progress.nextPrompt === null) {
    return { ok: false, issues }
  }

  const next: SonyBuzzStagedProfile = Object.freeze({
    teamId: profile.teamId,
    staged: Object.freeze([
      ...profile.staged,
      Object.freeze({ promptId: progress.nextPrompt.promptId, control: Object.freeze({ ...control }) }),
    ]),
  })
  return { ok: true, profile: next }
}

/** Drop the last staged capture, or leave the profile unchanged when empty. */
export function cancelLastSonyBuzzCapture(profile: SonyBuzzStagedProfile): SonyBuzzStagedProfile {
  if (profile.staged.length === 0) return profile
  return Object.freeze({
    teamId: profile.teamId,
    staged: Object.freeze(profile.staged.slice(0, -1)),
  })
}

/** Discard the whole staged profile for a team. Active mapping is untouched. */
export function discardSonyBuzzStagedProfile(teamId: string): SonyBuzzStagedProfile {
  return emptySonyBuzzStagedProfile(teamId)
}

/**
 * Build the five bindings this staged profile would contribute, or explain why not.
 *
 * Incomplete profiles are refused. Unknown prompt ids fail closed. Actions come
 * from the recipe, never from teacher free-text.
 */
export function bindingsFromSonyBuzzStagedProfile(
  profile: SonyBuzzStagedProfile,
): { readonly ok: true; readonly bindings: readonly GamepadBinding[] } | { readonly ok: false; readonly issues: readonly string[] } {
  if (profile.staged.length !== SONY_BUZZ_HANDSET_PROMPTS.length) {
    return {
      ok: false,
      issues: [
        `This handset profile is incomplete (${profile.staged.length} of ${SONY_BUZZ_HANDSET_PROMPTS.length} buttons). Capture every prompt before Apply.`,
      ],
    }
  }

  const byPrompt = new Map(profile.staged.map((entry) => [entry.promptId, entry.control]))
  const bindings: GamepadBinding[] = []
  const seenControls = new Set<string>()

  for (const prompt of SONY_BUZZ_HANDSET_PROMPTS) {
    const control = byPrompt.get(prompt.promptId)
    if (control === undefined) {
      return {
        ok: false,
        issues: [`Missing staged capture for the ${prompt.colourLabel} control.`],
      }
    }
    const key = `${control.controllerIndex}:${control.buttonIndex}`
    if (seenControls.has(key)) {
      return {
        ok: false,
        issues: ['Two prompts in this handset profile captured the same button. Discard and recapture.'],
      }
    }
    seenControls.add(key)
    bindings.push({
      controllerIndex: control.controllerIndex,
      buttonIndex: control.buttonIndex,
      teamId: profile.teamId,
      action: prompt.action,
    })
  }

  return { ok: true, bindings: Object.freeze(bindings) }
}

/**
 * Preview the mapping that Apply would produce, without mutating the active one.
 *
 * Replaces this team's existing Gamepad bindings for the recipe actions, then
 * validates through the existing Gamepad mapping discipline. Conflicts with
 * other teams' controls are reported — nothing is stolen or silently repaired.
 */
export function previewSonyBuzzApply(
  profile: SonyBuzzStagedProfile,
  activeMapping: GamepadMapping,
  teams: readonly TeamDefinition[],
): GamepadMappingValidation | { readonly ok: false; readonly issues: readonly string[] } {
  const built = bindingsFromSonyBuzzStagedProfile(profile)
  if (!built.ok) return built

  const recipeActions = SONY_BUZZ_HANDSET_PROMPTS.map((prompt) => prompt.action)
  const kept = activeMapping.bindings.filter(
    (binding) =>
      !(
        binding.teamId === profile.teamId &&
        recipeActions.some((action) => sameLocalInputAction(binding.action, action))
      ),
  )

  // Refuse to steal a control another team (or another leftover binding) still holds.
  for (const candidate of built.bindings) {
    const clash = kept.find(
      (binding) =>
        binding.controllerIndex === candidate.controllerIndex &&
        binding.buttonIndex === candidate.buttonIndex,
    )
    if (clash !== undefined) {
      return {
        ok: false,
        issues: [
          'A staged button is already assigned in the active mapping. Clear the conflicting assignment first. Nothing was overwritten.',
        ],
      }
    }
  }

  const next: GamepadMapping = {
    version: GAMEPAD_MAPPING_VERSION,
    bindings: [...kept, ...built.bindings],
  }
  return validateGamepadMapping(next, teams)
}

/**
 * Apply a complete staged profile into a new active mapping.
 *
 * On refusal, the caller's active mapping is unchanged (pure function).
 */
export function applySonyBuzzStagedProfile(
  profile: SonyBuzzStagedProfile,
  activeMapping: GamepadMapping,
  teams: readonly TeamDefinition[],
): SonyBuzzApplyResult {
  const preview = previewSonyBuzzApply(profile, activeMapping, teams)
  if (!preview.ok) return { ok: false, issues: preview.issues }
  return { ok: true, mapping: preview.mapping }
}

/** Host-facing preview lines for the staged profile. Host-only. */
export function describeSonyBuzzStagedProfile(profile: SonyBuzzStagedProfile): readonly string[] {
  const byPrompt = new Map(profile.staged.map((entry) => [entry.promptId, entry.control]))
  return SONY_BUZZ_HANDSET_PROMPTS.map((prompt) => {
    const control = byPrompt.get(prompt.promptId)
    if (control === undefined) {
      return `${prompt.colourLabel}: not captured`
    }
    return `${prompt.colourLabel}: Controller ${control.controllerIndex + 1} · button ${control.buttonIndex + 1}`
  })
}

function sameControl(left: GamepadControlRef, right: GamepadControlRef): boolean {
  return left.controllerIndex === right.controllerIndex && left.buttonIndex === right.buttonIndex
}

/** True when a mapping still equals the empty session default. Useful in tests. */
export function isEmptyGamepadMapping(mapping: GamepadMapping): boolean {
  return mapping.bindings.length === 0 && mapping.version === EMPTY_GAMEPAD_MAPPING.version
}
