import { useMemo, useState } from 'react'
import {
  aggregateByGame,
  aggregateByTeam,
  aggregateForClassLabel,
  CLASS_LABEL_MAX_LENGTH,
  compareCompetitiveProfiles,
  groupByCompetitiveProfile,
  validateClassLabel,
} from '../summary/completedSummary'
import type { CompletedSummaryListing } from '../persistence'
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
  const listings = useMemo(
    () =>
      persistence.completedListings
        .filter((listing) => matchesFilters(listing, gameFilter, classFilter))
        .slice()
        .sort((left, right) => compareListings(left, right, sortOrder)),
    [classFilter, gameFilter, persistence.completedListings, sortOrder],
  )
  const selected = persistence.completedListings.find(({ key }) => key === selectedKey)
  const selectedRecord =
    selected?.decoded.status === 'valid' ? selected.decoded.record : undefined
  const profileGroups = groupByCompetitiveProfile(validRecords)
  const readOnly = persistence.leadership === 'follower'

  async function deleteRecord(key: string): Promise<void> {
    if (confirmDeleteKey !== key) {
      setConfirmDeleteKey(key)
      return
    }
    await persistence.deleteCompletedRecord(key)
    setConfirmDeleteKey(null)
    if (selectedKey === key) setSelectedKey(null)
  }

  async function clearRecords(): Promise<void> {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    await persistence.clearAllCompletedRecords()
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
      <p className="host__note" role="status" data-testid="ledger-status">
        {persistence.ledgerMessage}
      </p>
      {readOnly && (
        <p className="ledger__warning">Another host tab owns persistence. Ledger changes are disabled here.</p>
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

      <div className="ledger__filters" role="group" aria-label="Ledger filters and sorting">
        <label>
          Game
          <select value={gameFilter} onChange={(event) => setGameFilter(event.target.value)}>
            <option value="all">All games</option>
            {games.map((gameId) => <option key={gameId} value={gameId}>{gameId}</option>)}
          </select>
        </label>
        <label>
          Class label
          <select value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
            <option value="all">All class labels</option>
            <option value="unlabeled">Unlabeled</option>
            {classes.map((label) => <option key={label} value={label}>{label}</option>)}
          </select>
        </label>
        <label>
          Sort
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)}>
            <option value="saved-newest">Saved newest first</option>
            <option value="saved-oldest">Saved oldest first</option>
            <option value="game-title">Game title</option>
          </select>
        </label>
      </div>

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
            <tr><td colSpan={6}>No completed summaries match these filters.</td></tr>
          ) : listings.map((listing) => {
            const record = listing.decoded.status === 'valid' ? listing.decoded.record : null
            return (
              <tr key={listing.key}>
                <td>{record?.savedAt ?? '—'}</td>
                <td>{record?.summary.recordedCompletionAt ?? '—'}</td>
                <td>{record?.summary.gameTitle ?? listing.key}</td>
                <td>{record?.classLabel ?? 'Unlabeled'}</td>
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
          ) : (
            <p>
              Record key <code>{selected.key}</code> is {statusLabel(selected)}. Metrics are
              hidden because the record is not valid Session Summary V1 data.
            </p>
          )}
        </section>
      )}

      <section className="ledger__reports" aria-labelledby="ledger-reports-title">
        <h4 id="ledger-reports-title">Compatible reports</h4>
        {profileGroups.length === 0 ? <p>No valid records are available.</p> : profileGroups.map((group, index) => {
          const comparison = index === 0
            ? null
            : compareCompetitiveProfiles(profileGroups[0]!.profile, group.profile)
          const classLabels = classFilter === 'all'
            ? uniqueClassLabels(group.records.map((record) => record.classLabel))
            : [classFilter === 'unlabeled' ? null : classFilter]
          const classRollups = classLabels.map((label) =>
            aggregateForClassLabel(group.records, label),
          )
          return (
            <article className="ledger__profile" key={`${group.profile.game.canonicalDefinitionSha256}-${index}`}>
              <h5>Profile group {index + 1}: {group.records.length} session{group.records.length === 1 ? '' : 's'}</h5>
              {comparison && !comparison.compatible && (
                <p>
                  Kept separate from profile group 1 because: {comparison.reasons.map(reasonCopy).join('; ')}.
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
      <ul aria-label="Compatible class rollups">
        {classRollups.map((rollup) => (
          <li key={rollup.classLabel ?? 'unlabeled'}>
            {rollup.classLabel ?? 'Unlabeled'}: {rollup.sessionCount} compatible sessions
          </li>
        ))}
      </ul>
      <table className="ledger__table">
        <caption>Compatible game rollup</caption>
        <thead><tr><th>Game</th><th>Sessions</th><th>Score changes</th><th>Buzzes</th></tr></thead>
        <tbody>{games.map((game) => (
          <tr key={game.gameId}><td>{game.gameTitle}</td><td>{game.sessionCount}</td><td>{game.totalScoreChangeCount}</td><td>{game.totalAcceptedBuzzCount}</td></tr>
        ))}</tbody>
      </table>
      <table className="ledger__table">
        <caption>Compatible team rollup</caption>
        <thead><tr><th>Team</th><th>Sessions</th><th>Total final score</th><th>Average final score</th></tr></thead>
        <tbody>{teams.map((team) => (
          <tr key={team.teamId}><td>{team.teamName}</td><td>{team.sessionCount}</td><td>{signed(team.totalFinalScore)}</td><td>{signed(team.averageFinalScorePerSession)}</td></tr>
        ))}</tbody>
      </table>
    </>
  )
}

function matchesFilters(
  listing: CompletedSummaryListing,
  gameFilter: string,
  classFilter: string,
): boolean {
  if (listing.decoded.status !== 'valid') return gameFilter === 'all' && classFilter === 'all'
  const record = listing.decoded.record
  if (gameFilter !== 'all' && record.summary.gameId !== gameFilter) return false
  if (classFilter === 'unlabeled') return record.classLabel === null
  return classFilter === 'all' || record.classLabel === classFilter
}

function compareListings(
  left: CompletedSummaryListing,
  right: CompletedSummaryListing,
  order: SortOrder,
): number {
  const a = left.decoded.status === 'valid' ? left.decoded.record : null
  const b = right.decoded.status === 'valid' ? right.decoded.record : null
  if (order === 'game-title') return (a?.summary.gameTitle ?? left.key).localeCompare(b?.summary.gameTitle ?? right.key)
  const delta = (a?.savedAt ?? -1) - (b?.savedAt ?? -1)
  return order === 'saved-oldest' ? delta : -delta
}

function statusLabel(listing: CompletedSummaryListing): string {
  return listing.diagnostic === 'valid' ? 'Valid' : listing.diagnostic.replaceAll('-', ' ')
}

function reasonCopy(reason: ReturnType<typeof compareCompetitiveProfiles>['reasons'][number]): string {
  return reason.replaceAll('-', ' ')
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
