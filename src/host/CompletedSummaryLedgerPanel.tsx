import { useMemo, useState, type ReactNode } from 'react'
import {
  aggregateByGame,
  aggregateByTeam,
  aggregateForClassLabel,
  CLASS_LABEL_MAX_LENGTH,
  compareCompetitiveProfiles,
  groupByCompetitiveProfile,
  validateClassLabel,
  type CompetitiveProfileV1,
} from '../summary/completedSummary'
import type { CompletedSummaryListing } from '../persistence'
import type { CompletedSummaryRecordV1 } from '../summary/completedSummary'
import type { SessionSummaryV1 } from '../summary/contract'
import type { UseHostPersistence } from './useHostPersistence'
import { SessionSummaryView } from './SessionSummaryPanel'
import './CompletedSummaryLedgerPanel.css'

export interface CompletedSummaryLedgerPanelProps {
  readonly persistence: Pick<
    UseHostPersistence,
    | 'completedListings'
    | 'ledgerMessage'
    | 'leadership'
    | 'refreshCompletedLedger'
    | 'deleteCompletedRecord'
    | 'clearAllCompletedRecords'
    | 'updateCompletedClassLabel'
  >
}

type SortOrder = 'saved-newest' | 'saved-oldest' | 'game-title'

export function CompletedSummaryLedgerPanel({
  persistence,
}: CompletedSummaryLedgerPanelProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [gameFilter, setGameFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('saved-newest')
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [labelDraft, setLabelDraft] = useState('')
  const [labelError, setLabelError] = useState('')

  const validRecords = useMemo(
    () =>
      persistence.completedListings.flatMap((listing) =>
        listing.decoded.status === 'valid' ? [listing.decoded.record] : [],
      ),
    [persistence.completedListings],
  )
  const games = unique(validRecords.map((record) => record.summary.gameId))
  const classes = unique(
    validRecords.flatMap((record) => (record.classLabel === null ? [] : [record.classLabel])),
  )

  const filtersActive = gameFilter !== 'all' || classFilter !== 'all'

  /** Valid records after the active game/class filters — sole reporting selection. */
  const reportRecords = useMemo(
    () =>
      validRecords.filter((record) =>
        recordMatchesFilters(record, gameFilter, classFilter),
      ),
    [classFilter, gameFilter, validRecords],
  )

  const listings = useMemo(
    () =>
      persistence.completedListings
        .filter((listing) => matchesLedgerRowFilters(listing, gameFilter, classFilter))
        .slice()
        .sort((left, right) => compareListings(left, right, sortOrder)),
    [classFilter, gameFilter, persistence.completedListings, sortOrder],
  )

  /** Quarantined / unsupported records always remain discoverable. */
  const diagnosticListings = useMemo(
    () =>
      persistence.completedListings
        .filter((listing) => listing.decoded.status !== 'valid')
        .slice()
        .sort((left, right) => left.key.localeCompare(right.key)),
    [persistence.completedListings],
  )

  const selected = persistence.completedListings.find(({ key }) => key === selectedKey)
  const selectedRecord =
    selected?.decoded.status === 'valid' ? selected.decoded.record : undefined
  const selectedUnsupportedSummary =
    selected?.decoded.status === 'unsupported-profile-version' &&
    selected.decoded.summary !== undefined
      ? selected.decoded.summary
      : undefined
  const profileGroups = groupByCompetitiveProfile(reportRecords)
  const readOnly = persistence.leadership !== 'leader'

  async function deleteRecord(key: string): Promise<void> {
    if (confirmDeleteKey !== key) {
      setConfirmDeleteKey(key)
      return
    }
    const result = await persistence.deleteCompletedRecord(key)
    if (!result.ok) {
      // Keep confirmation and selection; failure copy lives in ledgerMessage.
      return
    }
    setConfirmDeleteKey(null)
    if (selectedKey === key) setSelectedKey(null)
  }

  async function clearRecords(): Promise<void> {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    const result = await persistence.clearAllCompletedRecords()
    if (!result.ok) {
      return
    }
    setConfirmClear(false)
    setSelectedKey(null)
  }

  async function saveLabel(): Promise<void> {
    if (!selectedRecord) return
    const candidate = labelDraft === '' ? null : labelDraft
    const checked = validateClassLabel(candidate)
    if (!checked.ok) {
      setLabelError(checked.message)
      return
    }
    const result = await persistence.updateCompletedClassLabel(
      selectedRecord.recordId,
      checked.value,
    )
    setLabelError(result.ok ? '' : result.message)
  }

  return (
    <section className="ledger" aria-labelledby="completed-ledger-title">
      <div className="foundation__tag">Completed summary ledger (Slice 16) — host-only</div>
      <h3 id="completed-ledger-title">Completed summary ledger</h3>
      <output className="host__note" data-testid="ledger-status">
        {persistence.ledgerMessage}
      </output>
      {readOnly && (
        <p className="ledger__warning">
          {persistence.leadership === 'follower'
            ? 'Another host tab owns persistence. Ledger changes are disabled here.'
            : 'This tab does not hold the persistence lease. Ledger changes are disabled until it becomes the leader.'}
        </p>
      )}
      <div className="ledger__actions">
        <button type="button" className="btn btn--secondary" onClick={() => void persistence.refreshCompletedLedger()}>
          Refresh ledger
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={readOnly || persistence.completedListings.length === 0}
          onClick={() => void clearRecords()}
        >
          {confirmClear ? 'Confirm clear all — no undo' : 'Clear all summaries'}
        </button>
        {confirmClear && (
          <button type="button" className="btn btn--secondary" onClick={() => setConfirmClear(false)}>
            Cancel clear
          </button>
        )}
      </div>

      <fieldset className="ledger__filters">
        <legend className="ledger__filters-legend">Ledger filters and sorting</legend>
        <label>
          Game
          <select
            value={gameFilter}
            onChange={(event) => setGameFilter(event.target.value)}
            aria-label="Filter by game"
          >
            <option value="all">All games</option>
            {games.map((gameId) => (
              <option key={gameId} value={gameId}>
                {gameId}
              </option>
            ))}
          </select>
        </label>
        <label>
          Class label
          <select
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            aria-label="Filter by class label"
          >
            <option value="all">All class labels</option>
            <option value="unlabeled">Unlabeled</option>
            {classes.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value as SortOrder)}
            aria-label="Sort completed summaries"
          >
            <option value="saved-newest">Saved newest first</option>
            <option value="saved-oldest">Saved oldest first</option>
            <option value="game-title">Game title</option>
          </select>
        </label>
      </fieldset>

      <table className="ledger__table">
        <caption>Host-private completed summary records and decode status</caption>
        <thead>
          <tr>
            <th scope="col">Saved</th>
            <th scope="col">Completed</th>
            <th scope="col">Game</th>
            <th scope="col">Class</th>
            <th scope="col">Status</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {listings.length === 0 ? (
            <tr>
              <td colSpan={6}>
                {persistence.completedListings.length === 0
                  ? 'No completed summaries are stored yet.'
                  : 'No completed summaries match these filters.'}
              </td>
            </tr>
          ) : listings.map((listing) => {
            const record = listing.decoded.status === 'valid' ? listing.decoded.record : null
            return (
              <tr key={listing.key}>
                <td>{record ? formatEpoch(record.savedAt) : '—'}</td>
                <td>
                  {record ? formatEpoch(record.summary.recordedCompletionAt) : '—'}
                </td>
                <td className="ledger__wrap">{record?.summary.gameTitle ?? listing.key}</td>
                <td className="ledger__wrap">{record?.classLabel ?? 'Unlabeled'}</td>
                <td>{statusLabel(listing)}</td>
                <td>
                  <button type="button" className="btn btn--secondary" onClick={() => {
                    setSelectedKey(listing.key)
                    setLabelDraft(record?.classLabel ?? '')
                    setLabelError('')
                  }}>
                    View details
                  </button>{' '}
                  <button
                    type="button"
                    className="btn btn--secondary"
                    disabled={readOnly}
                    onClick={() => void deleteRecord(listing.key)}
                  >
                    {confirmDeleteKey === listing.key ? 'Confirm delete — no undo' : 'Delete'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {diagnosticListings.length > 0 && (
        <section
          className="ledger__quarantine"
          aria-labelledby="ledger-quarantine-title"
          data-testid="ledger-quarantine"
        >
          <h4 id="ledger-quarantine-title">Unsupported and corrupt records</h4>
          <p>
            These records remain retained and deletable. They are never included in
            compatible reports
            {filtersActive
              ? '. Active game/class filters do not hide this quarantine list.'
              : '.'}
          </p>
          <ul>
            {diagnosticListings.map((listing) => (
              <li key={listing.key}>
                <code className="ledger__wrap">{listing.key}</code>
                {' — '}
                {statusLabel(listing)}
                {' '}
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    setSelectedKey(listing.key)
                    setLabelDraft('')
                    setLabelError('')
                  }}
                >
                  View details
                </button>
                {' '}
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={readOnly}
                  onClick={() => void deleteRecord(listing.key)}
                >
                  {confirmDeleteKey === listing.key ? 'Confirm delete — no undo' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {selected && (
        <section className="ledger__detail" aria-labelledby="ledger-detail-title">
          <h4 id="ledger-detail-title">Selected record</h4>
          {selectedRecord ? (
            <>
              <label htmlFor="ledger-class-label">Class label (optional)</label>
              <div className="ledger__label-editor">
                <input
                  id="ledger-class-label"
                  value={labelDraft}
                  maxLength={CLASS_LABEL_MAX_LENGTH + 1}
                  aria-describedby={labelError ? 'ledger-label-error' : undefined}
                  onChange={(event) => setLabelDraft(event.target.value)}
                />
                <button type="button" className="btn btn--secondary" disabled={readOnly} onClick={() => void saveLabel()}>
                  Save class label
                </button>
              </div>
              {labelError && <p id="ledger-label-error" role="alert">{labelError}</p>}
              <SessionSummaryView summary={selectedRecord.summary} />
            </>
          ) : selectedUnsupportedSummary ? (
            <UnsupportedProfileDetail
              storeKey={selected.key}
              version={
                selected.decoded.status === 'unsupported-profile-version'
                  ? selected.decoded.version
                  : 0
              }
              summary={selectedUnsupportedSummary}
            />
          ) : (
            <p>
              Record key <code className="ledger__wrap">{selected.key}</code> is{' '}
              {statusLabel(selected)}. Metrics are hidden because the record is not
              understood Session Summary V1 data under a known ledger envelope.
            </p>
          )}
        </section>
      )}

      <section className="ledger__reports" aria-labelledby="ledger-reports-title">
        <h4 id="ledger-reports-title">Compatible reports</h4>
        {profileGroups.length === 0 ? (
          <p data-testid="ledger-reports-empty">
            {reportRecords.length === 0 && validRecords.length > 0
              ? 'No valid completed summaries match the active filters, so no compatible reports are available.'
              : 'No valid records are available for compatible reports.'}
          </p>
        ) : profileGroups.map((group, index) => {
          const separation = explainProfileSeparation(profileGroups, index)
          const classLabels = classFilter === 'all'
            ? uniqueClassLabels(group.records.map((record) => record.classLabel))
            : [classFilter === 'unlabeled' ? null : classFilter]
          const classRollups = classLabels.map((label) =>
            aggregateForClassLabel(group.records, label),
          )
          return (
            <article
              className="ledger__profile"
              key={`${group.profile.game.canonicalDefinitionSha256}-${index}`}
              data-testid={`ledger-profile-group-${index + 1}`}
            >
              <h5>
                Profile group {index + 1}: {group.records.length} session
                {group.records.length === 1 ? '' : 's'}
              </h5>
              <p className="ledger__profile-identity">
                {profileIdentityCopy(group.profile)}
              </p>
              {separation.length > 0 && (
                <p>
                  Kept separate because: {separation.join(' ')}
                </p>
              )}
              <RollupTables
                games={aggregateByGame(group.records)}
                teams={aggregateByTeam(group.records)}
                classRollups={classRollups}
              />
            </article>
          )
        })}
      </section>
    </section>
  )
}

function UnsupportedProfileDetail({
  storeKey,
  version,
  summary,
}: {
  readonly storeKey: string
  readonly version: number
  readonly summary: SessionSummaryV1
}) {
  return (
    <>
      <p className="ledger__warning" role="alert" data-testid="unsupported-profile-warning">
        Competitive profile version {version} is unsupported. Comparison and
        aggregation are disabled for this record. The record is retained and may
        be deleted. Label editing is unavailable. Record key:{' '}
        <code className="ledger__wrap">{storeKey}</code>
      </p>
      <SessionSummaryView summary={summary} />
    </>
  )
}

function RollupTables({
  games,
  teams,
  classRollups,
}: {
  readonly games: ReturnType<typeof aggregateByGame>
  readonly teams: ReturnType<typeof aggregateByTeam>
  readonly classRollups: readonly ReturnType<typeof aggregateForClassLabel>[]
}) {
  return (
    <>
      <ul aria-label="Compatible class rollups" data-testid="ledger-class-rollups">
        {classRollups.map((rollup) => (
          <li key={rollup.classLabel ?? 'unlabeled'}>
            {rollup.classLabel ?? 'Unlabeled'}: {rollup.sessionCount} compatible sessions
          </li>
        ))}
      </ul>
      <table className="ledger__table" data-testid="ledger-game-rollup">
        <caption>Compatible game rollup</caption>
        <thead>
          <tr>
            <th scope="col">Game</th>
            <th scope="col">Sessions</th>
            <th scope="col">Score changes</th>
            <th scope="col">Buzzes</th>
          </tr>
        </thead>
        <tbody>
          {games.length === 0 ? (
            <tr><td colSpan={4}>No sessions in this filtered selection.</td></tr>
          ) : games.map((game) => (
            <tr key={game.gameId}>
              <td className="ledger__wrap">{game.gameTitle}</td>
              <td>{game.sessionCount}</td>
              <td>{game.totalScoreChangeCount}</td>
              <td>{game.totalAcceptedBuzzCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="ledger__table" data-testid="ledger-team-rollup">
        <caption>Compatible team rollup</caption>
        <thead>
          <tr>
            <th scope="col">Team</th>
            <th scope="col">Sessions</th>
            <th scope="col">Total final score</th>
            <th scope="col">Average final score</th>
          </tr>
        </thead>
        <tbody>
          {teams.length === 0 ? (
            <tr><td colSpan={4}>No sessions in this filtered selection.</td></tr>
          ) : teams.map((team) => (
            <tr key={team.teamId}>
              <td className="ledger__wrap">{team.teamName}</td>
              <td>{team.sessionCount}</td>
              <td>{signed(team.totalFinalScore)}</td>
              <td>{signed(team.averageFinalScorePerSession)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

function recordMatchesFilters(
  record: CompletedSummaryRecordV1,
  gameFilter: string,
  classFilter: string,
): boolean {
  if (gameFilter !== 'all' && record.summary.gameId !== gameFilter) return false
  if (classFilter === 'unlabeled') return record.classLabel === null
  return classFilter === 'all' || record.classLabel === classFilter
}

function matchesLedgerRowFilters(
  listing: CompletedSummaryListing,
  gameFilter: string,
  classFilter: string,
): boolean {
  // Valid rows follow the reporting selection. Diagnostic rows are shown in the
  // quarantine section instead of disappearing under filters.
  if (listing.decoded.status !== 'valid') return false
  return recordMatchesFilters(listing.decoded.record, gameFilter, classFilter)
}

function compareListings(
  left: CompletedSummaryListing,
  right: CompletedSummaryListing,
  order: SortOrder,
): number {
  const a = left.decoded.status === 'valid' ? left.decoded.record : null
  const b = right.decoded.status === 'valid' ? right.decoded.record : null
  if (order === 'game-title') {
    return (a?.summary.gameTitle ?? left.key).localeCompare(b?.summary.gameTitle ?? right.key)
  }
  const delta = (a?.savedAt ?? -1) - (b?.savedAt ?? -1)
  return order === 'saved-oldest' ? delta : -delta
}

function statusLabel(listing: CompletedSummaryListing): string {
  return listing.diagnostic === 'valid' ? 'Valid' : listing.diagnostic.replaceAll('-', ' ')
}

function reasonCopy(reason: ReturnType<typeof compareCompetitiveProfiles>['reasons'][number]): string {
  return reason.replaceAll('-', ' ')
}

function profileIdentityCopy(profile: CompetitiveProfileV1): string {
  const fingerprint = profile.game.canonicalDefinitionSha256.slice(0, 12)
  const rounds = profile.rounds
    .map((round) => `${round.authoredRoundType} (${round.summarySupport})`)
    .join(', ')
  return [
    `Game ${profile.game.gameId}`,
    `fingerprint ${fingerprint}…`,
    `teams ${profile.teams.orderedTeamIds.join(', ')}`,
    `rounds ${rounds || 'none'}`,
    `final ${profile.finalSemantics.presence}/${profile.finalSemantics.eligibilityMode}/${profile.finalSemantics.responseCaptureMode}`,
  ].join('; ')
}

function explainProfileSeparation(
  groups: readonly { readonly profile: CompetitiveProfileV1 }[],
  index: number,
): readonly string[] {
  if (index === 0) return []
  const current = groups[index]!
  const explanations: string[] = []
  for (let prior = 0; prior < index; prior += 1) {
    const comparison = compareCompetitiveProfiles(groups[prior]!.profile, current.profile)
    if (comparison.compatible) continue
    explanations.push(
      `vs profile group ${prior + 1}: ${comparison.reasons.map(reasonCopy).join(', ')}.`,
    )
  }
  return explanations
}

function formatEpoch(epochMs: number): ReactNode {
  const iso = new Date(epochMs).toISOString()
  const label = new Date(epochMs).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
  return <time dateTime={iso}>{label}</time>
}

function signed(value: number): string {
  if (value < 0) return `−${Math.abs(value)}`
  return String(value)
}

function unique(values: readonly string[]): readonly string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function uniqueClassLabels(values: readonly (string | null)[]): readonly (string | null)[] {
  return [...new Set(values)].sort((left, right) =>
    (left ?? '').localeCompare(right ?? ''),
  )
}
