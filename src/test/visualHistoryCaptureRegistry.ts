/**
 * Capture registry for the S05 visual historian atlas.
 *
 * Compact surface rows expand through {@link expandSurface} so shared
 * authority / privacy / viewport defaults are not duplicated (Sonar CPD).
 * Automated entries map to a screenshot basename under
 * docs/design/history/2026-09-s05-complete/screenshots/.
 */

export type CaptureAuthority =
  | 'AUTOMATED-CAPTURE'
  | 'LOCAL-DESKTOP-CAPTURE'
  | 'OWNER-HARDWARE-CAPTURE'
  | 'S06-DEFERRED'

export type SurfaceRole = 'Audience' | 'Host' | 'Shared' | 'App'

export type SurfaceClass = 'normal' | 'edge' | 'recovery' | 'stress'

export interface VisualHistorySurface {
  readonly id: string
  readonly title: string
  readonly role: SurfaceRole
  readonly class: SurfaceClass
  readonly folder: string
  readonly basename: string | null
  readonly authority: CaptureAuthority
  readonly purpose: string
  readonly trigger: string
  readonly components: readonly string[]
  readonly route: string | null
  readonly privacy: 'public' | 'host-private' | 'shared-teacher'
  readonly viewport: '1920x1080' | '1280x720' | 'host-desktop' | 'n/a'
  readonly ownerInspectionRequired: boolean
  readonly notes?: string
}

/** Fields required on every compact row; omitted keys use {@link SURFACE_DEFAULTS}. */
interface SurfaceRow {
  readonly id: string
  readonly title: string
  readonly folder: string
  readonly basename: string | null
  readonly purpose: string
  readonly trigger: string
  readonly components: readonly string[]
  readonly role?: SurfaceRole
  readonly class?: SurfaceClass
  readonly authority?: CaptureAuthority
  readonly route?: string | null
  readonly privacy?: 'public' | 'host-private' | 'shared-teacher'
  readonly viewport?: '1920x1080' | '1280x720' | 'host-desktop' | 'n/a'
  readonly ownerInspectionRequired?: boolean
  readonly notes?: string
}

const SURFACE_DEFAULTS = {
  role: 'Audience' as const,
  class: 'normal' as const,
  authority: 'AUTOMATED-CAPTURE' as const,
  route: '#/display' as string | null,
  privacy: 'public' as const,
  viewport: '1920x1080' as const,
  ownerInspectionRequired: true,
}

function expandSurface(row: SurfaceRow): VisualHistorySurface {
  const surface: VisualHistorySurface = {
    id: row.id,
    title: row.title,
    role: row.role ?? SURFACE_DEFAULTS.role,
    class: row.class ?? SURFACE_DEFAULTS.class,
    folder: row.folder,
    basename: row.basename,
    authority: row.authority ?? SURFACE_DEFAULTS.authority,
    purpose: row.purpose,
    trigger: row.trigger,
    components: row.components,
    route: row.route !== undefined ? row.route : SURFACE_DEFAULTS.route,
    privacy: row.privacy ?? SURFACE_DEFAULTS.privacy,
    viewport: row.viewport ?? SURFACE_DEFAULTS.viewport,
    ownerInspectionRequired:
      row.ownerInspectionRequired ?? SURFACE_DEFAULTS.ownerInspectionRequired,
  }
  if (row.notes !== undefined) {
    return { ...surface, notes: row.notes }
  }
  return surface
}

/**
 * Canonical census for the S05-complete / pre-owner-playthrough milestone.
 * Keep IDs stable; add new milestone archives rather than rewriting history.
 */
const SURFACE_ROWS: readonly SurfaceRow[] = [
  { id: "APP-HOME", title: "Home / launch", role: "App", folder: "app", basename: "app-home-1920x1080.png", purpose: "Teacher entry: library, import, open classroom controls", trigger: "Navigate to Home with empty local library", components: ["HomeRoute"], route: "#/", privacy: "shared-teacher" },
  { id: "APP-HOME-WITH-GAME", title: "Home after demo import", role: "App", folder: "app", basename: "app-home-with-game-1920x1080.png", purpose: "Game library populated after successful import", trigger: "Import demo game on Home", components: ["HomeRoute"], route: "#/", privacy: "shared-teacher" },
  { id: "APP-HOST-EMPTY", title: "Host empty / load a game", role: "Host", folder: "host", basename: "host-empty-load-game.png", purpose: "Host console before a game is loaded", trigger: "Open Host with no active session game", components: ["HostRoute", "GamePackImportPanel"], route: "#/host", privacy: "host-private", viewport: "host-desktop" },
  { id: "AUTH-EDIT-DEMO", title: "Authoring edit after demo import", role: "App", folder: "authoring", basename: "authoring-edit-demo-1920x1080.png", purpose: "In-app board authoring surface for a saved game", trigger: "Home → Edit on demo game", components: ["AuthoringRoute"], route: "#/edit/:gameId", privacy: "host-private" },
  { id: "AUTH-IMPORT-SUCCESS", title: "Import quality report (success)", role: "App", folder: "authoring", basename: "authoring-import-success-1920x1080.png", purpose: "Teacher-facing import success / quality report", trigger: "Import demo game; quality report visible", components: ["HomeRoute", "ImportQualityReport"], route: "#/", privacy: "host-private" },
  { id: "AUTH-IMPORT-FAILURE", title: "Import validation failure", role: "App", class: "edge", folder: "authoring", basename: null, authority: "LOCAL-DESKTOP-CAPTURE", purpose: "Malformed/unsupported content fail-closed messaging", trigger: "Import intentionally invalid file on Home or Host", components: ["HomeRoute", "GamePackImportPanel"], route: "#/", privacy: "host-private", viewport: "n/a", notes: "Requires a prepared invalid fixture file; owner may use Host import panel." },
  { id: "SETUP-CLASS-NAMES", title: "Class Setup — team names", role: "Host", folder: "setup", basename: "setup-class-team-names.png", purpose: "Team naming board before play", trigger: "Home import demo → Class Setup names task", components: ["ClassroomSetupPanel"], route: "#/", privacy: "host-private", viewport: "host-desktop" },
  { id: "SETUP-SONY-COPY", title: "Class Setup — Sony ordinary copy", role: "Host", folder: "setup", basename: "setup-sony-ordinary-copy.png", purpose: "Teacher-facing Sony setup copy without WebHID jargon", trigger: "Class Setup visible after demo import", components: ["ClassroomSetupPanel"], route: "#/", privacy: "host-private", viewport: "host-desktop" },
  { id: "SETUP-PHYSICAL-SONY", title: "Sony physical pairing / sleep / wake", role: "Host", class: "edge", folder: "setup", basename: null, authority: "OWNER-HARDWARE-CAPTURE", purpose: "Physical controller readiness and recovery", trigger: "Namtai / Sony handsets on owner hardware", components: ["ClassroomSetupPanel"], route: null, privacy: "host-private", viewport: "n/a" },
  { id: "HOST-BOARD-CONTROL", title: "Host category-board control", role: "Host", folder: "host", basename: "host-board-control.png", purpose: "Private board controls with answers withheld from Audience", trigger: "Load board+Final sample; advance to board", components: ["CategoryBoardHost", "HostRoute"], route: "#/host", privacy: "host-private", viewport: "host-desktop" },
  { id: "HOST-CLUE-SELECTED", title: "Host clue selected / reveal controls", role: "Host", folder: "host", basename: "host-clue-selected.png", purpose: "Host prompt/answer reveal and scoring targets", trigger: "Select a board tile on Host", components: ["CategoryBoardHost", "TeamScoringPanel"], route: "#/host", privacy: "host-private", viewport: "host-desktop" },
  { id: "HOST-FINAL-SETUP", title: "Host Final setup / begin", role: "Host", folder: "host", basename: "host-final-setup.png", purpose: "Private Final controls before public wager window", trigger: "Advance to Final after board scoring", components: ["FinalWagerHostPanel"], route: "#/host", privacy: "host-private", viewport: "host-desktop" },
  { id: "HOST-FINAL-SETTLEMENT", title: "Host Final settlement controls", role: "Host", folder: "host", basename: "host-final-settlement.png", purpose: "Host adjudication during team reveal", trigger: "Reach Final team-reveal on Host", components: ["FinalWagerHostPanel"], route: "#/host", privacy: "host-private", viewport: "host-desktop" },
  { id: "HOST-ELECTRON-CHROME", title: "Electron Host window chrome", role: "Host", folder: "host", basename: null, authority: "LOCAL-DESKTOP-CAPTURE", purpose: "Native window chrome / menu / dual-window shell", trigger: "Packaged or `npm run desktop` Electron Host", components: ["desktop main process"], route: null, privacy: "host-private", viewport: "n/a" },
  { id: "AUD-BOARD-PRISTINE", title: "Audience pristine board", folder: "audience", basename: "audience-board-pristine-1920x1080.png", purpose: "Unused category board with eight stress teams", trigger: "Inject visualStressFreshBoardSnapshot", components: ["CategoryBoardDisplay", "AudienceDisplayShell", "TeamScoreboard"] },
  { id: "AUD-BOARD-PARTIAL", title: "Audience partially used board", folder: "audience", basename: "audience-board-partial-1920x1080.png", purpose: "Used vs unused tiles; long category titles; score extremes", trigger: "Inject visualStressBoardSnapshot", components: ["CategoryBoardDisplay", "TeamScoreboard"] },
  { id: "AUD-BOARD-CLEARED-CATEGORY", title: "Audience cleared-category board", class: "edge", folder: "round-flow", basename: "audience-board-category-cleared-1920x1080.png", purpose: "Durable Cleared label after category depletion", trigger: "Inject visualStressCategoryClearedBoardSnapshot", components: ["CategoryBoardDisplay"] },
  { id: "AUD-BOARD-DEPLETED", title: "Audience nearly/fully depleted board", class: "edge", folder: "audience", basename: "audience-board-depleted-1920x1080.png", purpose: "All tiles used; board exhaustion presentation", trigger: "Inject visualHistoryBoardDepletedSnapshot", components: ["CategoryBoardDisplay"] },
  { id: "AUD-BOARD-720P", title: "Audience board at 720p", class: "stress", folder: "stress", basename: "audience-board-partial-1280x720.png", purpose: "Projector 720p geometry stress for the same partial board", trigger: "Inject visualStressBoardSnapshot at 1280×720", components: ["CategoryBoardDisplay"], viewport: "1280x720" },
  { id: "AUD-CLUE-SELECTED", title: "Audience clue selected", folder: "clue", basename: "audience-clue-selected-1920x1080.png", purpose: "Category/value selection before prompt", trigger: "Inject visualStressSelectedSnapshot", components: ["CategoryBoardDisplay"] },
  { id: "AUD-CLUE-PROMPT", title: "Audience prompt (quiet cognition)", folder: "clue", basename: "audience-clue-prompt-1920x1080.png", purpose: "Prompt revealed without buzz arming", trigger: "Inject visualStressPromptOnlySnapshot", components: ["CategoryBoardDisplay"] },
  { id: "AUD-CLUE-PROMPT-LONG", title: "Audience long-prompt stress", class: "stress", folder: "stress", basename: "audience-clue-prompt-longtext-1920x1080.png", purpose: "Schema-max prompt readability with timer chrome", trigger: "Inject visualStressLongPromptSnapshot", components: ["CategoryBoardDisplay", "SignalRail"] },
  { id: "AUD-CLUE-IMAGE", title: "Audience image clue", class: "stress", folder: "stress", basename: "audience-clue-image-1920x1080.png", purpose: "Media clue projector balance", trigger: "Inject visualStressImagePromptSnapshot", components: ["MediaContentDisplay", "CategoryBoardDisplay"] },
  { id: "AUD-CLUE-ANSWER", title: "Audience answer revealed", folder: "clue", basename: "audience-clue-answer-revealed-1920x1080.png", purpose: "Answer reveal retaining the prompt", trigger: "Inject visualStressAnswerRevealSnapshot", components: ["CategoryBoardDisplay"] },
  { id: "AUD-BUZZ-ARMED", title: "Audience buzz open / waiting", folder: "buzz", basename: "audience-buzz-armed-waiting-1920x1080.png", purpose: "Response armed with no active claim", trigger: "Inject visualStressArmedWaitingBuzzSnapshot", components: ["BuzzQueueDisplay", "SignalRail"] },
  { id: "AUD-BUZZ-ACTIVE", title: "Audience active claim", folder: "buzz", basename: "audience-buzz-active-claim-1920x1080.png", purpose: "First active claim identity + waiting count", trigger: "Inject visualStressFirstActiveClaimSnapshot", components: ["BuzzQueueDisplay"] },
  { id: "AUD-BUZZ-MAX-WAITING", title: "Audience active claim max waiting", class: "stress", folder: "buzz", basename: "audience-buzz-active-max-waiting-1920x1080.png", purpose: "Eight-team waiting count stress", trigger: "Inject visualStressActiveClaimMaxWaitingSnapshot", components: ["BuzzQueueDisplay"] },
  { id: "AUD-OUTCOME-CORRECT", title: "Audience correct outcome", folder: "outcome", basename: "audience-outcome-correct-1920x1080.png", purpose: "Path A Correct adjudication presentation", trigger: "Inject visualStressBoardCorrectOutcomeSnapshot", components: ["BoardOutcomeDisplay"] },
  { id: "AUD-OUTCOME-INCORRECT", title: "Audience incorrect + promoted claim", folder: "outcome", basename: "audience-outcome-incorrect-with-active-1920x1080.png", purpose: "Incorrect outcome beside next active claim", trigger: "Inject visualStressBoardIncorrectWithActiveSnapshot", components: ["BoardOutcomeDisplay", "BuzzQueueDisplay"] },
  { id: "AUD-OUTCOME-PASSED", title: "Audience passed / no-response outcome", folder: "outcome", basename: "audience-outcome-passed-1920x1080.png", purpose: "Passed adjudication with exhausted queue", trigger: "Inject visualStressBoardPassedOutcomeSnapshot", components: ["BoardOutcomeDisplay"] },
  { id: "AUD-SCOREBOARD-STRESS", title: "Audience scoreboard stress (8 teams / negatives)", class: "stress", folder: "scoreboard", basename: "audience-scoreboard-stress-1920x1080.png", purpose: "Long names, negative and large scores, eight teams", trigger: "Board partial snapshot score strip/column", components: ["TeamScoreboard", "ScoreLayout"], notes: "Same frame as AUD-BOARD-PARTIAL; captured as dedicated crop-intent full frame." },
  { id: "AUD-ROUND-FINAL-BRIDGE", title: "Audience board → Final bridge", folder: "round-flow", basename: "audience-round-final-bridge-1920x1080.png", purpose: "Display-side transition into Final setup", trigger: "Inject visualStressFinalSetupFromBoardSnapshot", components: ["FinalWagerDisplay", "AudienceDisplayShell"] },
  { id: "AUD-FINAL-SETUP", title: "Audience Final setup", folder: "final", basename: "audience-final-setup-1920x1080.png", purpose: "Neutral Final getting-ready panel", trigger: "Inject visualHistoryFinalSetupSnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-FINAL-WAGER", title: "Audience Final wager phase", folder: "final", basename: "audience-final-wager-entry-1920x1080.png", purpose: "Public wager window without wager amounts", trigger: "Inject visualHistoryFinalWagerEntrySnapshot", components: ["FinalWagerDisplay", "SignalRail"] },
  { id: "AUD-FINAL-WAGERS-LOCKED", title: "Audience Final wagers locked", folder: "final", basename: "audience-final-wagers-locked-1920x1080.png", purpose: "Locked wager phase in words", trigger: "Inject visualHistoryFinalWagersLockedSnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-FINAL-RESPONSE", title: "Audience Final response phase", folder: "final", basename: "audience-final-response-entry-1920x1080.png", purpose: "Question public; answers/responses still private", trigger: "Inject visualHistoryFinalResponseEntrySnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-FINAL-RESPONSES-LOCKED", title: "Audience Final responses locked", folder: "final", basename: "audience-final-responses-locked-1920x1080.png", purpose: "Prompt remains; responses not yet public", trigger: "Inject visualHistoryFinalResponsesLockedSnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-FINAL-ANSWER", title: "Audience Final answer revealed", folder: "final", basename: "audience-final-answer-revealed-1920x1080.png", purpose: "Canonical answer beside prompt", trigger: "Inject visualHistoryFinalAnswerRevealedSnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-FINAL-TEAM-PENDING", title: "Audience Final team reveal pending settlement", folder: "final", basename: "audience-final-team-reveal-pending-1920x1080.png", purpose: "One team response/wager public before adjudication", trigger: "Inject visualHistoryFinalTeamRevealPendingSnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-FINAL-SETTLE-CORRECT", title: "Audience Final settlement correct", folder: "final", basename: "audience-final-settlement-correct-1920x1080.png", purpose: "Correct settlement wording + signed delta", trigger: "Inject visualHistoryFinalSettlementCorrectSnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-FINAL-SETTLE-INCORRECT", title: "Audience Final settlement incorrect", folder: "final", basename: "audience-final-settlement-incorrect-1920x1080.png", purpose: "Incorrect settlement wording + signed delta", trigger: "Inject visualHistoryFinalSettlementIncorrectSnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-FINAL-SETTLE-NO-RESPONSE", title: "Audience Final settlement no-response", folder: "final", basename: "audience-final-settlement-no-response-1920x1080.png", purpose: "No-response settlement wording", trigger: "Inject visualHistoryFinalSettlementNoResponseSnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-FINAL-RESOLUTION-LEADER", title: "Audience Final unique-leader resolution", folder: "final", basename: "audience-final-resolution-unique-leader-1920x1080.png", purpose: "Leads / settled state — not winner until complete", trigger: "Inject visualHistoryFinalResolutionUniqueLeaderSnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-FINAL-RESOLUTION-TIED", title: "Audience Final tied resolution", folder: "final", basename: "audience-final-resolution-tied-1920x1080.png", purpose: "Tied lead decision state without celebration", trigger: "Inject visualHistoryFinalResolutionTiedSnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-FINAL-SUDDEN-DEATH", title: "Audience Final sudden death", folder: "final", basename: "audience-final-sudden-death-1920x1080.png", purpose: "Neutral sudden-death panel", trigger: "Inject visualHistoryFinalSuddenDeathSnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-COMPLETE-WINNER", title: "Audience completed unique winner", folder: "completion", basename: "audience-final-complete-winner-1920x1080.png", purpose: "Winner naming only after explicit game completion", trigger: "Inject visualHistoryFinalCompleteWinnerSnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-COMPLETE-TIED", title: "Audience completed tied finish", folder: "completion", basename: "audience-final-complete-tied-1920x1080.png", purpose: "Tied-finish completion without inventing a winner", trigger: "Inject visualHistoryFinalCompleteTiedSnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-COMPLETE-GENERIC", title: "Audience generic safe completion", class: "recovery", folder: "completion", basename: "audience-final-complete-generic-safe-1920x1080.png", purpose: "Fail closed when unique winner cannot be publicly resolved", trigger: "Inject visualHistoryFinalCompleteGenericSafeSnapshot", components: ["FinalWagerDisplay"] },
  { id: "AUD-RECOVERY-WAITING", title: "Audience waiting / reconnect", class: "recovery", folder: "recovery", basename: "audience-recovery-waiting-1920x1080.png", purpose: "Fail-closed Display before valid host publish", trigger: "Open #/display with INITIAL_PUBLIC_STATE", components: ["AudienceDisplayShell", "NexusCore"] },
  { id: "AUD-RECOVERY-SCORES-UNAVAILABLE", title: "Audience scores unavailable", class: "recovery", folder: "recovery", basename: "audience-recovery-scores-unavailable-1920x1080.png", purpose: "Neutral Scores unavailable panel", trigger: "Inject visualHistoryScoresUnavailableSnapshot", components: ["ScoreLayout", "TeamScoreboard"] },
  { id: "AUD-RECOVERY-ROUND-UNAVAILABLE", title: "Audience round unavailable", class: "recovery", folder: "recovery", basename: "audience-recovery-round-unavailable-1920x1080.png", purpose: "Neutral round unavailable fail-closed scene", trigger: "Inject visualHistoryRoundUnavailableSnapshot", components: ["AudienceDisplayShell"] },
  { id: "AUD-HIGH-CONTRAST", title: "Audience high-contrast theme", class: "stress", folder: "stress", basename: "audience-board-high-contrast-1920x1080.png", purpose: "Deterministic high-contrast theme on partial board", trigger: "openDisplay(high-contrast) + visualStressBoardSnapshot", components: ["ThemeProvider", "CategoryBoardDisplay"], route: "#/display?theme=high-contrast" },
  { id: "AUD-REDUCED-MOTION", title: "Audience reduced motion", class: "stress", folder: "stress", basename: "audience-clue-reduced-motion-1920x1080.png", purpose: "prefers-reduced-motion presentation on armed clue", trigger: "emulateMedia(reducedMotion) + armed buzz snapshot", components: ["CategoryBoardDisplay", "SignalRail"] },
  { id: "DESKTOP-DUAL-WINDOW", title: "Electron Host + Display dual window", role: "Shared", folder: "host", basename: null, authority: "LOCAL-DESKTOP-CAPTURE", purpose: "Native dual-window placement on owner desktop", trigger: "Electron shell opens Host + Display windows", components: ["desktop main process"], route: null, privacy: "shared-teacher", viewport: "n/a" },
  { id: "SIDECAR-TWO-SCREEN", title: "MacBook Host + iPad Sidecar Audience", role: "Shared", class: "edge", folder: "host", basename: null, authority: "OWNER-HARDWARE-CAPTURE", purpose: "Owner playthrough two-screen Sidecar arrangement", trigger: "Rick Sidecar extended display playthrough", components: ["Electron display enumeration"], route: null, privacy: "shared-teacher", viewport: "n/a", notes: "Not classroom-projector qualification (S06)." },
  { id: "S06-WINDOWS-PROJECTOR", title: "Windows teacher + classroom projector", role: "Shared", class: "edge", folder: "stress", basename: null, authority: "S06-DEFERRED", purpose: "Actual classroom projector qualification", trigger: "Authorized S06 hardware qualification", components: ["Electron Display window"], route: null, viewport: "n/a" },
  { id: "S06-PHYSICAL-CONTROLLERS", title: "Physical Sony controllers in class", role: "Host", class: "edge", folder: "setup", basename: null, authority: "S06-DEFERRED", purpose: "Classroom physical controller evidence", trigger: "Authorized S06 hardware qualification", components: ["ClassroomSetupPanel", "input adapters"], route: null, privacy: "host-private", viewport: "n/a" },
  { id: "S06-SLEEP-WAKE-AUDIO", title: "Sleep/wake, disconnect, classroom audio", role: "Shared", class: "recovery", folder: "recovery", basename: null, authority: "S06-DEFERRED", purpose: "Physical recovery and audio qualification", trigger: "Authorized S06 hardware qualification", components: ["audio cues", "display placement"], route: null, privacy: "shared-teacher", viewport: "n/a" },
]

export const VISUAL_HISTORY_SURFACES: readonly VisualHistorySurface[] =
  SURFACE_ROWS.map(expandSurface)

export function automatedSurfaces(): readonly VisualHistorySurface[] {
  return VISUAL_HISTORY_SURFACES.filter(
    (s) => s.authority === 'AUTOMATED-CAPTURE' && s.basename !== null,
  )
}

export function ownerLocalSurfaces(): readonly VisualHistorySurface[] {
  return VISUAL_HISTORY_SURFACES.filter(
    (s) =>
      s.authority === 'LOCAL-DESKTOP-CAPTURE' || s.authority === 'OWNER-HARDWARE-CAPTURE',
  )
}

export function s06DeferredSurfaces(): readonly VisualHistorySurface[] {
  return VISUAL_HISTORY_SURFACES.filter((s) => s.authority === 'S06-DEFERRED')
}
