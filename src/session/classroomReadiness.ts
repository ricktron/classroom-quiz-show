/**
 * Teacher-facing pre-play readiness. Product language, not a technical wall.
 */

export type ReadinessTone = 'ready' | 'optional' | 'warning'

export interface ReadinessItem {
  readonly id: 'teams' | 'names' | 'sony' | 'display' | 'audio'
  readonly label: string
  readonly detail: string
  readonly tone: ReadinessTone
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
      label: input.sonyReady ? 'Sony ready' : 'Keyboard fallback available',
      detail: input.sonyReady
        ? 'Supported buzzers are connected. Keyboard remains available.'
        : 'Buzzers are optional. The class can play from the keyboard.',
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
