/**
 * Session-local team-name selection engine (S04B).
 *
 * Game owns the reusable `teamNameBank`. This module owns only the class-run
 * deck: visible candidates, claims, and uniqueness. It never writes back into
 * a Game, draft, or saved definition.
 *
 * All mutations go through {@link applyTeamNameInputs} so simultaneous presses
 * resolve in one deterministic pass instead of depending on UI render order.
 */

import { MAX_TEAM_NAME_LENGTH } from '../game/teams/limits'

export const TEAM_NAME_CHOICE_COUNT = 4 as const
export const TEAM_NAME_BANK_TARGET = 96 as const
export const TEAM_NAME_BANK_WARNING_THRESHOLD = 64 as const

export const TEAM_NAME_CHOICE_COLORS = ['yellow', 'green', 'orange', 'blue'] as const
export type TeamNameChoiceColor = (typeof TEAM_NAME_CHOICE_COLORS)[number]

export type TeamNameInput =
  | { readonly kind: 'cycle'; readonly teamId: string }
  | { readonly kind: 'claim'; readonly teamId: string; readonly choiceIndex: 0 | 1 | 2 | 3 }
  | { readonly kind: 'manual'; readonly teamId: string; readonly name: string }
  | { readonly kind: 'reset'; readonly teamId: string }

export type TeamNameApplyStatus =
  | 'applied'
  | 'ignored'
  | 'rejected-unknown-team'
  | 'rejected-already-claimed'
  | 'rejected-red-never-selects'
  | 'rejected-missing-choice'
  | 'rejected-name-taken'
  | 'rejected-invalid-name'
  | 'rejected-empty-bank'

export interface TeamNameApplyItem {
  readonly input: TeamNameInput
  readonly status: TeamNameApplyStatus
  readonly claimedName?: string
}

export interface TeamNameSelectionView {
  readonly teamId: string
  readonly candidates: readonly string[]
  readonly claimedName: string | null
  readonly selectedChoiceIndex: 0 | 1 | 2 | 3 | null
  readonly exhaustedOnce: boolean
  readonly seenKeys: readonly string[]
}

export interface TeamNameSelectionState {
  readonly bank: readonly string[]
  readonly teamIds: readonly string[]
  readonly views: Readonly<Record<string, TeamNameSelectionView>>
}

export function normalizeTeamNameCandidate(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function teamNameUniquenessKey(name: string): string {
  return normalizeTeamNameCandidate(name).toLowerCase()
}

export function isValidSessionTeamName(name: string): boolean {
  const normalized = normalizeTeamNameCandidate(name)
  return normalized.length > 0 && normalized.length <= MAX_TEAM_NAME_LENGTH
}

export function sanitizeTeamNameBank(names: readonly string[]): string[] {
  const seen = new Set<string>()
  const bank: string[] = []
  for (const raw of names) {
    if (typeof raw !== 'string') continue
    const name = normalizeTeamNameCandidate(raw)
    if (!isValidSessionTeamName(name)) continue
    const key = teamNameUniquenessKey(name)
    if (seen.has(key)) continue
    seen.add(key)
    bank.push(name)
  }
  return bank
}

function emptyView(teamId: string): TeamNameSelectionView {
  return {
    teamId,
    candidates: [],
    claimedName: null,
    selectedChoiceIndex: null,
    exhaustedOnce: false,
    seenKeys: [],
  }
}

function reservedKeysForTeam(
  state: TeamNameSelectionState,
  teamId: string,
): Set<string> {
  const reserved = new Set<string>()
  for (const id of state.teamIds) {
    const view = state.views[id]
    if (!view) continue
    if (view.claimedName) {
      reserved.add(teamNameUniquenessKey(view.claimedName))
      continue
    }
    if (id === teamId) continue
    for (const candidate of view.candidates) {
      reserved.add(teamNameUniquenessKey(candidate))
    }
  }
  return reserved
}

function dealCandidates(
  state: TeamNameSelectionState,
  teamId: string,
  seenKeys: ReadonlySet<string>,
): { readonly candidates: string[]; readonly nextSeen: Set<string>; readonly wrapped: boolean } {
  const reserved = reservedKeysForTeam(state, teamId)
  const eligible = state.bank.filter((name) => !reserved.has(teamNameUniquenessKey(name)))
  if (eligible.length === 0) {
    return { candidates: [], nextSeen: new Set(seenKeys), wrapped: false }
  }

  let wrapped = false
  let pool = eligible.filter((name) => !seenKeys.has(teamNameUniquenessKey(name)))
  if (pool.length === 0) {
    wrapped = true
    pool = eligible
  }

  const candidates: string[] = []
  const nextSeen = wrapped ? new Set<string>() : new Set(seenKeys)
  for (const name of pool) {
    if (candidates.length >= TEAM_NAME_CHOICE_COUNT) break
    candidates.push(name)
    nextSeen.add(teamNameUniquenessKey(name))
  }
  return { candidates, nextSeen, wrapped }
}

export function createTeamNameSelectionState(input: {
  readonly bank: readonly string[]
  readonly teamIds: readonly string[]
}): TeamNameSelectionState {
  const bank = sanitizeTeamNameBank(input.bank)
  const teamIds = [...input.teamIds]
  let state: TeamNameSelectionState = {
    bank,
    teamIds,
    views: Object.fromEntries(teamIds.map((id) => [id, emptyView(id)])),
  }

  for (const teamId of teamIds) {
    const dealt = dealCandidates(state, teamId, new Set())
    state = {
      ...state,
      views: {
        ...state.views,
        [teamId]: {
          ...emptyView(teamId),
          candidates: dealt.candidates,
          exhaustedOnce: dealt.wrapped,
          seenKeys: [...dealt.nextSeen],
        },
      },
    }
  }
  return state
}

function kindRank(kind: TeamNameInput['kind']): number {
  if (kind === 'claim' || kind === 'manual') return 0
  if (kind === 'reset') return 1
  return 2
}

function sortInputs(
  state: TeamNameSelectionState,
  inputs: readonly TeamNameInput[],
): TeamNameInput[] {
  return [...inputs].sort((a, b) => {
    const aIndex = state.teamIds.indexOf(a.teamId)
    const bIndex = state.teamIds.indexOf(b.teamId)
    if (aIndex !== bIndex) return aIndex - bIndex
    return kindRank(a.kind) - kindRank(b.kind)
  })
}

function replaceView(
  state: TeamNameSelectionState,
  teamId: string,
  view: TeamNameSelectionView,
): TeamNameSelectionState {
  return {
    ...state,
    views: {
      ...state.views,
      [teamId]: view,
    },
  }
}

function applyOne(
  state: TeamNameSelectionState,
  input: TeamNameInput,
): { readonly state: TeamNameSelectionState; readonly item: TeamNameApplyItem } {
  if (!state.teamIds.includes(input.teamId)) {
    return { state, item: { input, status: 'rejected-unknown-team' } }
  }
  const view = state.views[input.teamId] ?? emptyView(input.teamId)

  if (input.kind === 'cycle') {
    if (view.claimedName) {
      return { state, item: { input, status: 'ignored' } }
    }
    if (state.bank.length === 0) {
      return { state, item: { input, status: 'rejected-empty-bank' } }
    }
    const dealt = dealCandidates(state, input.teamId, new Set(view.seenKeys))
    return {
      state: replaceView(state, input.teamId, {
        ...view,
        candidates: dealt.candidates,
        selectedChoiceIndex: null,
        exhaustedOnce: view.exhaustedOnce || dealt.wrapped,
        seenKeys: [...dealt.nextSeen],
      }),
      item: { input, status: 'applied' },
    }
  }

  if (input.kind === 'reset') {
    const cleared = replaceView(state, input.teamId, emptyView(input.teamId))
    const dealt = dealCandidates(cleared, input.teamId, new Set())
    return {
      state: replaceView(cleared, input.teamId, {
        ...emptyView(input.teamId),
        candidates: dealt.candidates,
        seenKeys: [...dealt.nextSeen],
      }),
      item: { input, status: 'applied' },
    }
  }

  if (input.kind === 'claim') {
    if (view.claimedName) {
      return { state, item: { input, status: 'rejected-already-claimed' } }
    }
    const name = view.candidates[input.choiceIndex]
    if (!name) {
      return { state, item: { input, status: 'rejected-missing-choice' } }
    }
    const key = teamNameUniquenessKey(name)
    for (const id of state.teamIds) {
      if (id === input.teamId) continue
      const other = state.views[id]
      if (other?.claimedName && teamNameUniquenessKey(other.claimedName) === key) {
        return { state, item: { input, status: 'rejected-name-taken' } }
      }
    }
    return {
      state: replaceView(state, input.teamId, {
        ...view,
        claimedName: name,
        selectedChoiceIndex: input.choiceIndex,
      }),
      item: { input, status: 'applied', claimedName: name },
    }
  }

  const name = normalizeTeamNameCandidate(input.name)
  if (!isValidSessionTeamName(name)) {
    return { state, item: { input, status: 'rejected-invalid-name' } }
  }
  const key = teamNameUniquenessKey(name)
  if (reservedKeysForTeam(state, input.teamId).has(key)) {
    return { state, item: { input, status: 'rejected-name-taken' } }
  }
  const choiceIndex = view.candidates.findIndex((candidate) => teamNameUniquenessKey(candidate) === key)
  return {
    state: replaceView(state, input.teamId, {
      ...view,
      claimedName: name,
      selectedChoiceIndex: choiceIndex >= 0 ? (choiceIndex as 0 | 1 | 2 | 3) : null,
    }),
    item: { input, status: 'applied', claimedName: name },
  }
}

export function applyTeamNameInputs(
  state: TeamNameSelectionState,
  inputs: readonly TeamNameInput[],
): { readonly state: TeamNameSelectionState; readonly results: readonly TeamNameApplyItem[] } {
  let next = state
  const results: TeamNameApplyItem[] = []
  for (const input of sortInputs(state, inputs)) {
    const applied = applyOne(next, input)
    next = applied.state
    results.push(applied.item)
  }
  return { state: next, results }
}

export function claimedSessionTeamNames(
  state: TeamNameSelectionState,
): Readonly<Record<string, string>> {
  const names: Record<string, string> = {}
  for (const teamId of state.teamIds) {
    const claimed = state.views[teamId]?.claimedName
    if (claimed) names[teamId] = claimed
  }
  return names
}

export function sessionTeamNamesAreUnique(names: readonly string[]): boolean {
  const seen = new Set<string>()
  for (const name of names) {
    const key = teamNameUniquenessKey(name)
    if (key.length === 0) return false
    if (seen.has(key)) return false
    seen.add(key)
  }
  return true
}

export function visibleCandidateKeys(state: TeamNameSelectionState): readonly string[] {
  const keys: string[] = []
  for (const teamId of state.teamIds) {
    const view = state.views[teamId]
    if (!view || view.claimedName) continue
    for (const candidate of view.candidates) keys.push(teamNameUniquenessKey(candidate))
  }
  return keys
}

export function visibleCandidatesAreGloballyUnique(state: TeamNameSelectionState): boolean {
  const keys = visibleCandidateKeys(state)
  return new Set(keys).size === keys.length
}

export interface TypedTeamNameRejection {
  readonly teamId: string
  readonly status: 'rejected-name-taken' | 'rejected-invalid-name'
}

export interface TypedTeamNameResolution {
  /** Selection with every typed name applied; unchanged when anything is rejected. */
  readonly state: TeamNameSelectionState
  /** True when at least one team's claimed name would change. */
  readonly changed: boolean
  readonly rejected: readonly TypedTeamNameRejection[]
}

/**
 * Court B CB-03: resolve the names teachers have TYPED (not yet committed) as one
 * batch, independent of team order.
 *
 * Each team's final name is its typed text when present (normalized, non-blank,
 * and not merely a re-capitalization of its own committed name), else its
 * committed name. A typed name is rejected when it is invalid, when another
 * team's FINAL name has the same identity, or when it is offered to a team that
 * stays unclaimed (the same reservation rule as {@link applyTeamNameInputs}).
 * Applying drafts one at a time in team order instead made a valid rename chain
 * (A→B while B→C) read as a duplicate.
 */
export function applyTypedTeamNames(
  state: TeamNameSelectionState,
  typed: Readonly<Record<string, string>>,
): TypedTeamNameResolution {
  const finalNames = new Map<string, string | null>()
  const newNames = new Map<string, string>()
  const rejected: TypedTeamNameRejection[] = []

  for (const teamId of state.teamIds) {
    const committed = state.views[teamId]?.claimedName ?? null
    finalNames.set(teamId, committed)
    const raw = typed[teamId]
    if (raw === undefined) continue
    const name = normalizeTeamNameCandidate(raw)
    if (name.length === 0) continue
    if (committed !== null && teamNameUniquenessKey(committed) === teamNameUniquenessKey(name)) {
      continue
    }
    if (!isValidSessionTeamName(name)) {
      rejected.push({ teamId, status: 'rejected-invalid-name' })
      continue
    }
    finalNames.set(teamId, name)
    newNames.set(teamId, name)
  }

  const keyCount = new Map<string, number>()
  for (const name of finalNames.values()) {
    if (name === null) continue
    const key = teamNameUniquenessKey(name)
    keyCount.set(key, (keyCount.get(key) ?? 0) + 1)
  }
  const offeredToUnclaimed = new Set<string>()
  for (const teamId of state.teamIds) {
    if (finalNames.get(teamId) !== null) continue
    for (const candidate of state.views[teamId]?.candidates ?? []) {
      offeredToUnclaimed.add(teamNameUniquenessKey(candidate))
    }
  }
  for (const [teamId, name] of newNames) {
    const key = teamNameUniquenessKey(name)
    if ((keyCount.get(key) ?? 0) > 1 || offeredToUnclaimed.has(key)) {
      rejected.push({ teamId, status: 'rejected-name-taken' })
    }
  }

  if (rejected.length > 0 || newNames.size === 0) {
    return { state, changed: false, rejected }
  }
  let next = state
  for (const [teamId, name] of newNames) {
    const view = next.views[teamId] ?? emptyView(teamId)
    const key = teamNameUniquenessKey(name)
    const choiceIndex = view.candidates.findIndex((candidate) => teamNameUniquenessKey(candidate) === key)
    next = replaceView(next, teamId, {
      ...view,
      claimedName: name,
      selectedChoiceIndex: choiceIndex >= 0 ? (choiceIndex as 0 | 1 | 2 | 3) : null,
    })
  }
  return { state: next, changed: true, rejected }
}
