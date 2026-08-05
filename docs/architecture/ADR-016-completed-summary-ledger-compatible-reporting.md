# ADR-016 — Completed Summary Ledger and Compatible Reporting

**Status:** Accepted (Slice 16 — `CQS-SLICE-16-SUMMARY-LEDGER`; Complete)
**Date:** 2026-08-04
**Supersedes:** nothing. **Superseded by:** nothing.
**Related:** ADR-002 (state/event/sync core) · ADR-012 (portable export) ·
ADR-013 (local persistence & recovery) · ADR-015 (Session Summary Contract) ·
[`../decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md`](../decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md)
· delivery PR [#40](https://github.com/ricktron/classroom-quiz-show/pull/40)
(squash `bc3cea65cab8db1481b0b2420be580cc69932f3d`) ·
[`../receipts/2026-08-04-slice-16-local-verification.md`](../receipts/2026-08-04-slice-16-local-verification.md)
· [`../receipts/2026-08-04-slice-16-semantic-review-r1.md`](../receipts/2026-08-04-slice-16-semantic-review-r1.md)

---

## 1. Context and scope

Slice 15 derives one truthful, host-private `SessionSummaryV1` from authoritative
history and replay, but deliberately stores nothing. Teachers also need a small,
local history of completed summaries and reports that never combine sessions
whose game, team, scoring, round-support, or Final semantics differ.

Slice 16 adds that bounded ledger. It remains local-first, host-private, and
privacy-minimized. It does not store the event history, create a second gameplay
authority, add a public protocol, or begin the future full completed-game archive.

## 2. Binding owner decisions A–G

The implementation follows these decisions as one indivisible contract:

- **A — Completion capture.** When an accepted command appends
  `GAME_SESSION_ENDED`, automatically derive and save the completed record and
  delete `activeSessions/current`. A failed save leaves the in-memory summary
  visible and offers retry; it must not claim durable success.
- **B — Retention.** Keep the newest **50 valid** completed records by `savedAt`,
  with `recordId` as the deterministic tie-break. Invalid or unsupported records
  are diagnosable and are not counted toward or deleted by automatic retention.
- **C — Deletion.** Support delete-one and clear-all. Both are host-only,
  irreversible, and require explicit confirmation in the UI.
- **D — Class label.** Each record may have an optional host-private
  `classLabel`; `null` means unlabeled. A non-null label is 1–80 characters,
  non-whitespace, already trimmed, and never silently trimmed or truncated.
- **E — Team continuity.** Cross-session team comparison requires the same
  competitive profile, the same canonical game-definition fingerprint, and the
  same ordered authored team IDs. Team name is presentation, not identity.
- **F — Report scope.** Provide saved detail, a ledger list, and compatible
  game/team/class rollups with filters, sorting, and visible incompatibility
  explanations. Do not add assessment, grading, mastery, or individual reports.
- **G — Unknown versions.** Unknown ledger-envelope, Session Summary, or
  competitive-profile versions fail closed. They are listed diagnostically where
  safe, never reinterpreted, migrated speculatively, or included in metrics.

## 3. Completed-summary record envelope

The browser-local ledger record is:

```jsonc
{
  "kind": "classroom-quiz-show/completed-summary-record",
  "version": 1,
  "recordId": "session-id",
  "savedAt": 0,
  "classLabel": null,
  "competitiveProfile": {},
  "summary": {}
}
```

`recordId` is the summary's session id. `summary` is exactly Session Summary
Contract V1. At the outer envelope boundary the decoder inspects only
object-ness, kind, and numeric version so an unknown future envelope version is
classified as `unsupported-envelope-version` without requiring V1 exact keys or
trusting nested fields. Only after confirming envelope version **1** does it
require exact V1 keys, validate nested V1 shapes, and require record, summary,
and profile identities to agree. On read, the persistence boundary also requires
`IndexedDB key = recordId = summary.sessionId`; a mismatched key fails closed as
a quarantined corrupt diagnostic and is never silently moved or rewritten.

## 4. Competitive Profile V1

Compatibility is represented by
`classroom-quiz-show/competitive-profile`, version **1**. It records only the
semantic facts needed to decide whether rollups are valid:

- Session Summary contract kind and version;
- game id and canonical definition SHA-256;
- scoring kind/version (`integer-points`, version 1);
- team count, ordered authored team IDs, and the fixed identity semantics
  `authored-team-id-within-exact-definition`;
- authored round types in order and whether Summary V1 supports each;
- Final presence, eligibility mode, and response-capture mode.

The profile is derived from the same completed authoritative history as the
summary. If replay, summary derivation, canonical export, or hashing is
unavailable, record construction fails closed.

## 5. Canonical fingerprint

The definition fingerprint reuses Slice 12's existing
`exportGameDefinition(definition)` path. SHA-256 is computed over the exact UTF-8
bytes of the exporter's returned `jsonText`, including its canonical ordering and
trailing newline. There is no parallel serializer, normalized object hash, title
hash, or game-id-only shortcut.

Web Crypto and `TextEncoder` are boundary dependencies. If canonical export or
SHA-256 is unavailable or malformed, no profile or completed record is saved.

## 6. Exact compatibility

Two records are compatible only when **all** semantic profile fields match
exactly:

1. profile kind/version;
2. summary-contract kind/version;
3. game id;
4. canonical-definition fingerprint;
5. scoring kind/version;
6. team count, ordered authored IDs, and identity semantics;
7. ordered round types and summary-support classifications;
8. Final presence, eligibility mode, and response-capture mode.

Any mismatch keeps records in separate profile groups. Reports expose bounded
mismatch reasons (`profile-contract`, `summary-contract`, `game-id`,
`definition-fingerprint`, `scoring`, `teams`, `rounds`, `final-semantics`).
Matching title, class label, team name, or game id alone is never compatibility
proof.

## 7. IndexedDB v1 → v2 migration

The existing database moves from schema version **1** to **2** and adds one
object store:

| Store | Purpose |
| --- | --- |
| `savedDefinitions` | Existing canonical saved definitions |
| `activeSessions` | Existing unfinished-session recovery |
| `coordination` | Existing host-writer lease |
| `completedSummaries` | New privacy-minimized completed-summary records |

Upgrade creates only missing stores and preserves all existing v1 data. An
upgrade blocked by another open tab is reported as a host-private failure; it is
not bypassed with another database or storage authority.

## 8. Active recovery and completed ledger are separate

`activeSessions/current` remains unfinished-session recovery: a versioned event
history reconstructed through replay. `completedSummaries` contains immutable
summary/profile records, not resumable gameplay.

A completed record can never be offered as recovery. An active recovery record
can never be listed or aggregated as a completion. Saved definitions,
coordination, active recovery, and the completed ledger remain four distinct
concerns in one host-local database.

## 9. Atomic completion transaction

Completion advances the active-session write generation before enqueueing its
terminal write. One transaction spanning `completedSummaries` and
`activeSessions`:

1. puts the encoded completed record under its `recordId`; and
2. deletes `activeSessions/current`.

Both effects commit or neither does. This prevents a durable completion without
active cleanup and prevents cleanup without the durable completed record. A
same-session retry is idempotent at the record key.

Retention runs **only after** that transaction succeeds and runs as a separate
transaction. Therefore retention failure cannot roll back or erase the newly
saved completion; the host is told that save succeeded while cleanup failed.

## 10. Retention, deletion, labels, and team identity

Automatic retention sorts valid records newest-first by `savedAt`, then by
`recordId`, and deletes valid records beyond 50. Corrupt and unsupported-version
records remain visible for diagnosis and deliberate deletion.

Delete-one and clear-all operate only on `completedSummaries`, honor the existing
host-writer lease, and do not alter saved definitions or active recovery.
Class-label updates rewrite only a valid V1 record after strict validation.
Labels filter reports but do not establish compatibility.

Team rollups key teams by authored team id, preserve the first compatible
summary's authored order, and are permitted only inside an exact profile group.
Renaming a team changes the canonical definition fingerprint; reordered or
changed authored IDs also make profiles incompatible.

## 11. Report scope

The host-only surface provides:

- a ledger list with saved time, completion time, game, optional class label,
  decode status, and actions;
- saved Session Summary V1 detail for a selected valid record;
- bounded saved Session Summary V1 detail for
  `unsupported-profile-version` when the ledger envelope and Summary V1 are
  strictly understood — with a prominent warning that comparison and aggregation
  remain disabled and label editing stays unavailable;
- game and class-label filters that define one reporting selection applied
  before competitive-profile grouping and before game, team, and class rollups;
- newest, oldest, and game-title sorting;
- exact-profile grouping with visible incompatibility explanations relative to
  each prior group (never partial compatibility or mixed statistics);
- compatible game rollups (session count, score-change and buzz totals);
- compatible team rollups (session count, total/average final score and score
  activity);
- compatible class-label rollups inside one profile group;
- a separate quarantine/diagnostic list for unsupported and corrupt records that
  remains visible while filters are active.

Unknown envelope versions, unknown summary versions, and corrupt records expose
status and raw object-store key only; their metrics remain hidden. Unsupported
profile versions never enter `validRecords`, profile groups, team continuity, or
reports. Reports are descriptive summaries of stored fields, not new gameplay or
assessment claims.

## 12. Unknown versions and failure semantics

The decoder distinguishes corrupt data from unsupported envelope, summary, and
profile versions. Unknown versions never enter retention counts, compatibility
groups, or rollups. No downgrade, field dropping, shape guessing, or best-effort
aggregation is allowed. Bounded Summary V1 detail for an unsupported profile is
presentation-only and does not reinterpret unknown profile fields.

If IndexedDB is unavailable, blocked, quota-exceeded, corrupt, or a transaction
fails:

- in-memory gameplay and the just-derived current-session summary remain usable;
- durable save is reported as failed and may be retried;
- active recovery is not deleted unless completed save commits atomically;
- a failed retention pass does not negate a successful completion save;
- ledger mutation is disabled in a follower host tab;
- no failure detail is projected to the display.

## 13. Privacy exclusions

The ledger never stores or reports:

- full or partial event history, undo metadata, or active recovery envelopes;
- raw exact Final response text, exact wager values, caps, private reveal order,
  alternates, or teacher notes;
- controller identifiers, mappings, button indices, or local-input diagnostics;
- individual student identity, roster, representative, account, or device data;
- `PublicState`, sync envelopes, persistence warnings, lease/tab identities, or
  storage internals;
- accuracy, reaction time, duration inference, mastery, grades, psychometrics, or
  standards attainment.

The completed ledger, labels, profiles, reports, and persistence statuses remain
host-private and absent from `PublicState`, sync, and the display route.

## 14. Version boundaries

| Boundary | Version after Slice 16 |
| --- | ---: |
| Public-state wire | **8** |
| Sync envelope | **2** |
| Canonical game-file schema | **1** |
| Private active-session wire | **1** |
| IndexedDB schema | **2** |
| Session Summary contract | **1** |
| Completed-summary ledger envelope | **1** |
| Competitive profile | **1** |

Only the IndexedDB schema and the two new private Slice 16 contracts change.

## 15. Rejected alternatives

- **Store the full event history after completion.** Rejected: that is a future
  archive with a larger privacy and migration surface.
- **Compare by game id or title.** Rejected: either can remain unchanged while
  semantically meaningful content changes.
- **Compare by team name.** Rejected: names are presentation, not identity.
- **Hash an ad hoc object representation.** Rejected: Slice 12 already owns the
  canonical portable serialization.
- **Treat class label as compatibility.** Rejected: a label is optional grouping
  metadata, not game semantics.
- **Delete invalid records during retention.** Rejected: retention keeps newest
  valid records and must not silently destroy unknown future versions.
- **Save, then clear active recovery in separate transactions.** Rejected: a
  partial failure would make recovery and completion disagree.
- **Run retention in the completion transaction.** Rejected: cleanup failure
  must not lose an otherwise valid completion.
- **Best-effort unknown-version reporting.** Rejected: semantic reinterpretation
  would make comparisons untrustworthy.
- **Cloud analytics or a second reporting database.** Rejected: local-first,
  offline, and single-authority boundaries remain binding.

## 16. Explicit non-goals

No full completed-game archive; no transcript or telemetry store; no exact
private-response retention; no individual identity; no roster, LMS/GCS, grading,
mastery, standards, psychometric, reaction-time, or fairness claims; no backend,
accounts, cloud sync, cross-device reporting, export/import of ledger records,
portable report format, charts, dashboards, scheduled cleanup, or migrations for
unknown record versions; no `PublicState` or sync change; no game-file or active
wire change; no new gameplay, round type, scoring rule, command, event, reducer,
dependency, workflow, or deployment change. Phase 3, Slice 17, post-MVP arcs,
and `CQS-OD-066` remain outside this decision.

## 17. Inherited Final recovery flake

The inherited Final mid-refresh recovery flake is **not intentionally repaired**
by Slice 16. Review and verification must assess whether the new terminal
completion write, IndexedDB upgrade, or ledger boot/list work worsens its
frequency or failure mode. No improvement may be claimed without direct evidence;
any observed regression requires a separately bounded disposition before merge.

## 18. Consequences

Teachers receive a bounded, deletable, host-local history of privacy-minimized
completed summaries and exact-compatible reports. Active recovery remains
event-sourced and separate. Semantic drift becomes visible rather than silently
aggregated. This ADR is **Accepted**. Slice 16 was squash-merged via PR
[#40](https://github.com/ricktron/classroom-quiz-show/pull/40) at
`bc3cea65cab8db1481b0b2420be580cc69932f3d` from reviewed head
`942575c97b97df220c215a7d265736a797869157` (sole parent
`f92b65fa2d6619d9c2a4d09b5457f0976ff91079`; reviewed-head and squash trees
identical at `12fea1bc056e6968e13a651161cdf89a6158a558`). Owner policies A–G and
the version contracts above remain binding.
