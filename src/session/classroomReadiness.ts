/**
 * Teacher-facing pre-play readiness. Product language, not a technical wall.
 *
 * Compact summary statuses are orientation, not a second settings toolbar.
 * Required, optional, readiness, fallback, and outcome stay distinct.
 *
 * Ready ≡ canStartPlay (teams 1–8 + Session names assigned + unique).
 * Optional Buzzers / Display / Sound never revoke Ready or own "needs attention".
 *
 * Sony buzzer readiness must use the same teacher-summary layers as the
 * detailed Sony setup section — never a coarser parallel "ready" claim.
 */

import {
  classSetupSonyBuzzClaimsResponding,
  classSetupSonyBuzzFullyReady,
  teacherSummaryLabel,
  type SonyBuzzTeacherSummary,
} from '../input/sonyBuzzTeacherReadiness'

export type ReadinessTone = 'ready' | 'optional' | 'warning'

/** Teacher-facing compact status vocabulary — no "Current". */
export type CompactReadinessStatus =
  | 'complete'
  | 'optional'
  | 'skipped'
  | 'needs-attention'
  | 'blocked'

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
  readonly detail: string
}

export interface ClassroomReadinessInput {
  readonly teamCount: number
  readonly namesAssigned: boolean
  readonly namesUnique: boolean
  /**
   * True only when Sony teacher-summary is `sony-buzz-ready`.
   * Prefer deriving via {@link classSetupSonyBuzzFullyReady}.
   */
  readonly sonyReady: boolean
  /**
   * Same classification published by the detailed Sony readiness layers.
   * When present, Class Setup copy must not claim more than this summary.
   */
  readonly sonyTeacherSummary?: SonyBuzzTeacherSummary | null
  readonly keyboardFallbackAvailable: boolean
  readonly displayOpen: boolean
  readonly audioUnderstood: boolean
  readonly audioMuted: boolean
}

export interface ClassroomSetupGuidanceInput extends ClassroomReadinessInput {
  readonly unnamedTeamLabels?: readonly string[]
  readonly buzzerSkipped?: boolean
  readonly repairActive?: boolean
  /**
   * Supported Namtai Wbuzz Gamepad detected (lifted from GamepadInputHostPanel).
   * Presence only — never alone “buzzers ready.”
   */
  readonly wbuzzPresent?: boolean
  /**
   * @deprecated B+F: expansion is UI-only. Ignored by readiness status /
   * dominant Ready selector. Kept optional for call-site compatibility.
   */
  readonly focusOverride?: SetupTaskId | null
}

/**
 * True when Class Setup may truthfully claim supported buzzer hardware is in
 * play (receiver connected / controllers path or lifted Wbuzz presence) — still
 * optional for Start. Does **not** treat unsupported/failed/disconnected as
 * “present” (those still allow Skip).
 */
export function classSetupBuzzerHardwarePresent(input: {
  readonly wbuzzPresent?: boolean
  readonly sonyTeacherSummary?: SonyBuzzTeacherSummary | null
}): boolean {
  if (input.wbuzzPresent) return true
  const summary = input.sonyTeacherSummary
  if (summary == null) return false
  return (
    summary === 'receiver-waiting-for-controllers' ||
    summary === 'controllers-need-team-setup' ||
    summary === 'sony-buzz-ready'
  )
}

/** Skip remains available only when no supported hardware presence is claimed. */
export function classSetupMayOfferBuzzerSkip(input: {
  readonly sonyReady: boolean
  readonly buzzerSkipped?: boolean
  readonly wbuzzPresent?: boolean
  readonly sonyTeacherSummary?: SonyBuzzTeacherSummary | null
}): boolean {
  if (resolvedSonyFullyReady(input)) return false
  if (input.buzzerSkipped) return false
  return !classSetupBuzzerHardwarePresent(input)
}

function resolvedSonyFullyReady(input: {
  readonly sonyReady: boolean
  readonly sonyTeacherSummary?: SonyBuzzTeacherSummary | null
}): boolean {
  if (input.sonyTeacherSummary != null) {
    return classSetupSonyBuzzFullyReady(input.sonyTeacherSummary)
  }
  return input.sonyReady
}

function sonyReadinessPresentation(input: ClassroomReadinessInput): {
  readonly label: string
  readonly detail: string
  readonly tone: ReadinessTone
} {
  const fullyReady = resolvedSonyFullyReady(input)
  const summary = input.sonyTeacherSummary ?? null
  if (fullyReady) {
    return {
      label: 'Buzzers ready',
      detail: `${teacherSummaryLabel('sony-buzz-ready')} Keyboard controls still work.`,
      tone: 'ready',
    }
  }
  if (summary != null) {
    const detail = teacherSummaryLabel(summary)
    const withKeyboard = /keyboard/i.test(detail)
      ? detail
      : `${detail} Keyboard controls still work.`
    return {
      label: 'Buzzers optional',
      detail: withKeyboard,
      tone: input.keyboardFallbackAvailable ? 'optional' : 'warning',
    }
  }
  return {
    label: 'Buzzers optional',
    detail: 'Buzzers are optional. Keyboard controls still work.',
    tone: input.keyboardFallbackAvailable ? 'optional' : 'warning',
  }
}

/** Semantic probe: does this Class Setup input claim controllers are responding? */
export function classSetupClaimsControllersResponding(input: ClassroomReadinessInput): boolean {
  if (input.sonyTeacherSummary != null) {
    return classSetupSonyBuzzClaimsResponding(input.sonyTeacherSummary)
  }
  // Without a shared summary, a true sonyReady historically over-claimed
  // responding. H6 requires the summary path for honest responding claims.
  return false
}

export function classroomReadinessItems(input: ClassroomReadinessInput): readonly ReadinessItem[] {
  const teamsReady = input.teamCount >= 1 && input.teamCount <= 8
  const namesReady = input.namesAssigned && input.namesUnique
  const sony = sonyReadinessPresentation(input)
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
      label: sony.label,
      detail: sony.detail,
      tone: sony.tone,
    },
    {
      id: 'display',
      label: input.displayOpen ? 'Window open' : 'Window not open',
      detail: input.displayOpen
        ? 'The audience display window is open.'
        : 'Open the audience display when you are ready.',
      tone: input.displayOpen ? 'ready' : 'optional',
    },
    {
      id: 'audio',
      label: soundFactLabel(input),
      detail: input.audioMuted
        ? 'All presentation sound is muted. Unmute when you want cues.'
        : input.audioUnderstood
          ? 'Sound was tested. Mute all sounds is always available.'
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

/** Teacher-facing sound fact — never “Sound is ready” confidence language. */
export function soundFactLabel(
  input: Pick<ClassroomReadinessInput, 'audioUnderstood' | 'audioMuted'>,
): string {
  if (input.audioMuted) return 'Sound muted'
  if (input.audioUnderstood) return 'Sound tested'
  return 'Sound not tested'
}

/** Teacher-facing display window fact — never “Display ready”. */
export function displayFactLabel(input: Pick<ClassroomReadinessInput, 'displayOpen'>): string {
  return input.displayOpen ? 'Window open' : 'Window not open'
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

/**
 * Required-task emphasis for the setup workspace.
 * Returns `'play'` (Ready) whenever {@link canStartPlay} — optionals never gate Ready.
 * Does not consult focusOverride / teacher expand state.
 * Does **not** choose the initial Class Setup row — use
 * {@link defaultSetupWorkflowTask} for ordinary workflow selection.
 */
export function dominantSetupTask(input: ClassroomSetupGuidanceInput): SetupTaskId | 'play' {
  if (canStartPlay(input)) return 'play'
  if (!teamsAreReady(input)) return 'teams'
  if (!namesAreReady(input)) return 'names'
  return 'play'
}

/**
 * Ordinary Class Setup initial / next workflow selection (expansion default).
 *
 * Prefer Buzzers when that optional step is still open (not ready, not skipped),
 * then Teams, then Names. Separate from {@link dominantSetupTask} / Start
 * readiness — Buzzers never gate {@link canStartPlay}. Returns `'play'` when
 * required work is complete (Ready overview; no default expansion).
 */
export function defaultSetupWorkflowTask(
  input: ClassroomSetupGuidanceInput,
): SetupTaskId | 'play' {
  if (canStartPlay(input)) return 'play'
  const sonyReady = resolvedSonyFullyReady(input)
  if (!sonyReady && !input.buzzerSkipped) return 'buzzers'
  if (!teamsAreReady(input)) return 'teams'
  if (!namesAreReady(input)) return 'names'
  return 'play'
}

/**
 * Optional chore suggestion after Ready. Never drives Ready heading or
 * Start Game dominance. Null when required unmet or all optionals settled.
 */
export function optionalSetupChore(input: ClassroomSetupGuidanceInput): SetupTaskId | null {
  if (!canStartPlay(input)) return null
  if (input.repairActive) return 'buzzers'
  const sonyReady = resolvedSonyFullyReady(input)
  if (!sonyReady && !input.buzzerSkipped) return 'buzzers'
  if (!input.displayOpen) return 'display'
  if (!soundIsReady(input)) return 'sound'
  return null
}

/** Unresolved optional facts for the Ready exception / status line. */
export function unresolvedOptionalFacts(input: ClassroomSetupGuidanceInput): readonly string[] {
  if (!canStartPlay(input)) return []
  const facts: string[] = []
  const sonyReady = resolvedSonyFullyReady(input)
  if (!sonyReady && !input.buzzerSkipped) {
    facts.push('Buzzers not set up (optional)')
  } else if (input.buzzerSkipped && !sonyReady) {
    facts.push('Buzzers skipped')
  }
  if (!input.displayOpen) facts.push('Audience display window not open')
  // Muted / tested are settled sound facts; only untested remains unresolved.
  if (!input.audioMuted && !input.audioUnderstood) facts.push('Sound not tested')
  return facts
}

function statusWord(status: CompactReadinessStatus): string {
  switch (status) {
    case 'complete':
      return 'complete'
    case 'needs-attention':
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
    case 'needs-attention':
      return '●'
    case 'optional':
      return '○'
    case 'skipped':
      return '–'
    case 'blocked':
      return '!'
  }
}

function namesDetail(input: ClassroomSetupGuidanceInput): string {
  if (namesAreReady(input)) return 'Each team has a unique class name.'
  if (!teamsAreReady(input)) return 'Finish teams before choosing names.'
  const unnamed = (input.unnamedTeamLabels ?? []).filter((label) => label.length > 0)
  if (unnamed.length > 0 && input.teamCount > 0) {
    const named = Math.max(0, input.teamCount - unnamed.length)
    return `${named} of ${input.teamCount} named`
  }
  if (!input.namesUnique) return 'Each team needs a different name.'
  return 'Choose names with buzzers or type them.'
}

function buzzersDetail(input: ClassroomSetupGuidanceInput): string {
  if (resolvedSonyFullyReady(input)) {
    return 'Buzzers ready. Keyboard still works.'
  }
  if (input.buzzerSkipped) return 'Skipped for this class. Keyboard works.'
  if (input.sonyTeacherSummary != null) {
    return teacherSummaryLabel(input.sonyTeacherSummary)
  }
  if (input.wbuzzPresent) {
    return 'Supported buzzers detected. Check them below — keyboard still works.'
  }
  return 'Optional. Keyboard controls still work.'
}

function teamsDetail(input: ClassroomSetupGuidanceInput): string {
  if (!teamsAreReady(input)) {
    return 'Needs 1–8 teams in Game settings'
  }
  const count = `${input.teamCount} team${input.teamCount === 1 ? '' : 's'} in this Game`
  if (classSetupBuzzerHardwarePresent(input)) {
    return `${count} · buzzers detected · keyboard available`
  }
  return count
}

export function compactReadinessItems(
  input: ClassroomSetupGuidanceInput,
): readonly CompactReadinessItem[] {
  const sonyReady = resolvedSonyFullyReady(input)
  const teamsStatus: CompactReadinessStatus = teamsAreReady(input) ? 'complete' : 'blocked'
  const namesStatus: CompactReadinessStatus = !teamsAreReady(input)
    ? 'blocked'
    : namesAreReady(input)
      ? 'complete'
      : 'needs-attention'
  // Optionals never own "needs attention" merely for being next chore.
  const buzzerStatus: CompactReadinessStatus = sonyReady
    ? 'complete'
    : input.buzzerSkipped
      ? 'skipped'
      : 'optional'
  const displayStatus: CompactReadinessStatus = input.displayOpen ? 'complete' : 'optional'
  const soundStatus: CompactReadinessStatus = soundIsReady(input) ? 'complete' : 'optional'

  // I-REPAIR-1: Buzzers before Names (preferred: Buzzers → Teams → Names → Display → Sound).
  const items: readonly (readonly [SetupTaskId, string, CompactReadinessStatus, string])[] = [
    ['buzzers', 'Buzzers', buzzerStatus, buzzersDetail(input)],
    ['teams', 'Teams', teamsStatus, teamsDetail(input)],
    ['names', 'Names', namesStatus, namesDetail(input)],
    ['display', 'Display', displayStatus, displayFactLabel(input)],
    ['sound', 'Sound', soundStatus, soundFactLabel(input)],
  ]
  return items.map(([id, label, status, detail]) => ({
    id,
    label,
    mark: markFor(status),
    status,
    statusWord: statusWord(status),
    detail,
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
      return 'Ready'
  }
}

/** Task-panel copy for the buzzers step — never stronger than the shared summary. */
export function classSetupBuzzerTaskCopy(input: {
  readonly sonyReady: boolean
  readonly sonyTeacherSummary?: SonyBuzzTeacherSummary | null
  readonly wbuzzPresent?: boolean
}): string {
  if (resolvedSonyFullyReady(input)) {
    return 'Buzzers are ready. You can check them below, or play.'
  }
  if (input.sonyTeacherSummary != null) {
    const summary = teacherSummaryLabel(input.sonyTeacherSummary)
    if (classSetupSonyBuzzClaimsResponding(input.sonyTeacherSummary)) {
      return `${summary} Keyboard controls still work.`
    }
    return `${summary} Use Check buzzers below if you want them, or keep setting up with the keyboard.`
  }
  if (input.wbuzzPresent) {
    return 'Supported buzzers are detected. Check them below to confirm each handset — keyboard controls still work.'
  }
  return 'Buzzers are optional. Connect them below if you want them, or keep setting up with the keyboard.'
}
