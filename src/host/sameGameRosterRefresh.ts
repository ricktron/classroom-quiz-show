/**
 * Same-Game library roster refresh ownership (MENUS Slice E).
 *
 * Host `?play=` may compare the live Session team signature against the saved
 * library definition after authoring. Only the **latest** in-flight attempt may
 * continue after `loadLibraryRecord` resolves and may call `loadSaved`.
 *
 * Stale completions must not produce replacement commands when:
 * - a newer attempt superseded this one (Strict Mode double-invoke, re-entry);
 * - `playGameId` no longer matches the request;
 * - Session store epoch drifted (Resume / remount);
 * - the live team signature changed under the request.
 *
 * Confirmation to replace remains owned by the existing `loadSaved` /
 * `confirmedReplace` substrate — this helper only answers "may this attempt act?".
 */

export interface SameGameRosterRefreshOwnership {
  readonly attempt: number
  readonly latestAttempt: number
  readonly requestPlayGameId: string
  readonly currentPlayGameId: string | null
  readonly requestStoreEpoch: number
  readonly currentStoreEpoch: number
  readonly requestLiveTeamSig: string
  readonly currentLiveTeamSig: string
}

/** True only when this attempt still owns the same-Game roster refresh. */
export function ownsSameGameRosterRefresh(input: SameGameRosterRefreshOwnership): boolean {
  if (input.attempt !== input.latestAttempt) return false
  if (input.currentPlayGameId === null) return false
  if (input.requestPlayGameId !== input.currentPlayGameId) return false
  if (input.requestStoreEpoch !== input.currentStoreEpoch) return false
  if (input.requestLiveTeamSig !== input.currentLiveTeamSig) return false
  return true
}
