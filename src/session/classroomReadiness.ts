/**
 * Teacher-facing pre-play readiness. Product language, not a technical wall.
 *
 * Compact summary statuses are orientation, not a second settings toolbar.
 * Required, optional, readiness, fallback, and outcome stay distinct.
 */

export type ReadinessTone = 'ready' | 'optional' | 'warning'

export type CompactReadinessStatus = 'complete' | 'current' | 'optional' | 'skipped' | 'blocked'

export type SetupTaskId = 'teams' | 'names' | 'buzzers' | 'display' | 'sound'

export interface ReadinessItem {
  readonly id: 'teams' | 'names' | 'sony' | 'display' | 'audio'
  readonly label: string
  readonly detail: string
  readonly tone: ReadinessTone
}

export interface CompactReadinessItem {
  readonly id: SetupTaskId
  readonly label: string
  readonly mark: string
  readonly status: CompactReadinessStatus
  readonly statusWord: string
}

export interface ClassroomReadinessInput {
  readonly teamCount: number
  readonly namesAssigned: boolean
  readonly namesUnique: boolean
  readonly sonyReady: boolean
  readonly keyboardFallbackAvailable: boolean
  readonly displayOpen: boolean
  readonly audioUnderstood: boolean
  readonly audioMuted: boolean
}

export interface ClassroomSetupGuidanceInput extends ClassroomReadinessInput {
  readonly unnamedTeamLabels?: readonly string[]
  readonly buzzerSkipped?: boolean
  readonly repairActive?: boolean
  readonly focusOverride?: SetupTaskId | null
}

export function classroomReadinessItems(input: ClassroomReadinessInput): readonly ReadinessItem[] {
  const teamsReady = input.teamCount >= 1 && input.teamCount <= 8
  const namesReady = input.namesAssigned && input.namesUnique
  const sonyTone: ReadinessTone = input.sonyReady
    ? 'ready'
    : input.keyboardFallbackAvailable
      ? 'optional'
      : 'warning'
  return [
    {
      id: 'teams',
      label: 'Teams configured',
      detail: teamsReady
        ? `${input.teamCount} team${input.teamCount === 1 ? '' : 's'} for this class.`
        : 'Add 1–8 teams in the game editor before playing.',
      tone: teamsReady ? 'ready' : 'warning',
    },
    {
      id: 'names',
      label: namesReady ? 'Names chosen' : 'Names still needed',
      detail: namesReady
        ? 'Each team has a unique class name.'
        : 'Choose names with buzzers or type them. Keyboard always works.',
      tone: namesReady ? 'ready' : 'warning',
    },
    {
      id: 'sony',
      label: input.sonyReady ? 'Buzzers ready' : 'Buzzers optional',
      detail: input.sonyReady
        ? 'Buzzers are responding. Keyboard controls still work.'
        : 'Buzzers are optional. Keyboard controls still work.',
      tone: sonyTone,
    },
    {
      id: 'display',
      label: input.displayOpen ? 'Display ready' : 'Display not open yet',
      detail: input.displayOpen
        ? 'The audience display is open.'
        : 'Open the audience display on the projector when you are ready.',
      tone: input.displayOpen ? 'ready' : 'warning',
    },
    {
      id: 'audio',
      label: input.audioMuted ? 'Sound muted' : input.audioUnderstood ? 'Audio ready' : 'Audio not checked',
      detail: input.audioMuted
        ? 'All presentation sound is muted. Unmute when you want cues.'
        : input.audioUnderstood
          ? 'Sound is on. Mute all sounds is always available.'
          : 'Test sound or mute it so you know what the class will hear.',
      tone: input.audioUnderstood || input.audioMuted ? 'ready' : 'optional',
    },
  ]
}

export function canStartPlay(input: ClassroomReadinessInput): boolean {
  return input.teamCount >= 1 && input.teamCount <= 8 && input.namesAssigned && input.namesUnique
}

export function teamsAreReady(input: Pick<ClassroomReadinessInput, 'teamCount'>): boolean {
  return input.teamCount >= 1 && input.teamCount <= 8
}

export function namesAreReady(
  input: Pick<ClassroomReadinessInput, 'namesAssigned' | 'namesUnique'>,
): boolean {
  return input.namesAssigned && input.namesUnique
}

export function soundIsReady(
  input: Pick<ClassroomReadinessInput, 'audioUnderstood' | 'audioMuted'>,
): boolean {
  return input.audioUnderstood || input.audioMuted
}

/**
 * Required-state blocker for Play. Buzzers, Display, and sound never appear
 * here — they cannot strand the class.
 */
export function playBlockerExplanation(input: ClassroomSetupGuidanceInput): string | null {
  if (!teamsAreReady(input)) {
    return input.teamCount < 1
      ? 'This game still needs teams before you can play.'
      : 'This game has too many teams. Use 1–8 teams.'
  }
  if (!input.namesAssigned) {
    const unnamed = (input.unnamedTeamLabels ?? []).filter((label) => label.length > 0)
    if (unnamed.length === 1) return `${unnamed[0]} still needs a name.`
    if (unnamed.length === 2) return `${unnamed[0]} and ${unnamed[1]} still need names.`
    if (unnamed.length > 2) return `${unnamed.length} teams still need names.`
    return 'Each team still needs a name.'
  }
  if (!input.namesUnique) return 'Each team needs a different name.'
  return null
}

export function dominantSetupTask(input: ClassroomSetupGuidanceInput): SetupTaskId | 'play' {
  if (input.focusOverride) return input.focusOverride
  if (!teamsAreReady(input)) return 'teams'
  if (!namesAreReady(input)) return 'names'
  if (input.repairActive) return 'buzzers'
  if (!input.sonyReady && !input.buzzerSkipped) return 'buzzers'
  if (!input.displayOpen) return 'display'
  if (!soundIsReady(input)) return 'sound'
  return 'play'
}

function statusWord(status: CompactReadinessStatus): string {
  switch (status) {
    case 'complete':
      return 'complete'
    case 'current':
      return 'needs attention'
    case 'optional':
      return 'optional'
    case 'skipped':
      return 'skipped'
    case 'blocked':
      return 'blocked'
  }
}

function markFor(status: CompactReadinessStatus): string {
  switch (status) {
    case 'complete':
      return '✓'
    case 'current':
      return '●'
    case 'optional':
      return '○'
    case 'skipped':
      return '–'
    case 'blocked':
      return '!'
  }
}

export function compactReadinessItems(
  input: ClassroomSetupGuidanceInput,
): readonly CompactReadinessItem[] {
  const current = dominantSetupTask(input)
  const teamsStatus: CompactReadinessStatus = teamsAreReady(input)
    ? current === 'teams'
      ? 'current'
      : 'complete'
    : 'blocked'
  const namesStatus: CompactReadinessStatus = !teamsAreReady(input)
    ? 'blocked'
    : namesAreReady(input)
      ? current === 'names'
        ? 'current'
        : 'complete'
      : current === 'names'
        ? 'current'
        : 'blocked'
  const buzzerStatus: CompactReadinessStatus = input.sonyReady
    ? 'complete'
    : input.buzzerSkipped
      ? 'skipped'
      : current === 'buzzers'
        ? 'current'
        : 'optional'
  const displayStatus: CompactReadinessStatus = input.displayOpen
    ? 'complete'
    : current === 'display'
      ? 'current'
      : 'optional'
  const soundStatus: CompactReadinessStatus = soundIsReady(input)
    ? 'complete'
    : current === 'sound'
      ? 'current'
      : 'optional'

  const items: readonly (readonly [SetupTaskId, string, CompactReadinessStatus])[] = [
    ['teams', 'Teams', teamsStatus],
    ['names', 'Names', namesStatus],
    ['buzzers', 'Buzzers', buzzerStatus],
    ['display', 'Display', displayStatus],
    ['sound', 'Sound', soundStatus],
  ]
  return items.map(([id, label, status]) => ({
    id,
    label,
    mark: markFor(status),
    status,
    statusWord: statusWord(status),
  }))
}

export function currentTaskTitle(task: SetupTaskId | 'play'): string {
  switch (task) {
    case 'teams':
      return 'Finish teams'
    case 'names':
      return 'Choose team names'
    case 'buzzers':
      return 'Check buzzers'
    case 'display':
      return 'Check display'
    case 'sound':
      return 'Check sound'
    case 'play':
      return 'Ready to play'
  }
}
