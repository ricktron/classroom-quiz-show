import type { AuthoringDraft } from './types'

/** Stable content fingerprint used to invalidate stale approvals. */
export function draftContentFingerprint(draft: Omit<AuthoringDraft, 'contentFingerprint' | 'status' | 'issues'>): string {
  return JSON.stringify({
    version: draft.version,
    profile: draft.profile,
    workbookFormatVersion: draft.workbookFormatVersion,
    game: draft.game,
    board: draft.board,
    final: draft.final ?? null,
    teamNameBank: draft.game.teamNameBank ?? [],
  })
}
