import type { CompletedSummaryDecodeResult } from './codec'
import { COMPLETED_SUMMARY_RETENTION_LIMIT } from './constants'

export interface DecodedCompletedSummaryListing {
  readonly key: string
  readonly decoded: CompletedSummaryDecodeResult
}

export function selectCompletedSummaryKeysToKeep(
  listings: readonly DecodedCompletedSummaryListing[],
  limit = COMPLETED_SUMMARY_RETENTION_LIMIT,
): readonly string[] {
  if (!Number.isSafeInteger(limit) || limit < 0) return []
  return listings
    .filter(
      (
        listing,
      ): listing is DecodedCompletedSummaryListing & {
        readonly decoded: Extract<CompletedSummaryDecodeResult, { readonly status: 'valid' }>
      } => listing.decoded.status === 'valid',
    )
    .sort(
      (left, right) =>
        right.decoded.record.savedAt - left.decoded.record.savedAt ||
        left.decoded.record.recordId.localeCompare(right.decoded.record.recordId),
    )
    .slice(0, limit)
    .map((listing) => listing.key)
}

export function selectCompletedSummaryKeysToDelete(
  listings: readonly DecodedCompletedSummaryListing[],
  limit = COMPLETED_SUMMARY_RETENTION_LIMIT,
): readonly string[] {
  const keep = new Set(selectCompletedSummaryKeysToKeep(listings, limit))
  return listings
    .filter((listing) => listing.decoded.status === 'valid' && !keep.has(listing.key))
    .map((listing) => listing.key)
}
