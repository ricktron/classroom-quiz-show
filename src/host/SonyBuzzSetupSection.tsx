import { useEffect, useMemo, useRef, useState } from 'react'
import type { TeamDefinition } from '../game/teams/definition'
import {
  GAMEPAD_DEVICE_CLASSIFICATION_LABEL,
  GAMEPAD_DEVICE_CLASSIFICATION_MESSAGE,
} from '../input/gamepadDeviceProfile'
import { controllerLabel, type GamepadReportedMapping } from '../input/gamepadSource'
import {
  applySonyBuzzStagedProfile,
  cancelLastSonyBuzzCapture,
  describeSonyBuzzStagedProfile,
  discardSonyBuzzStagedProfile,
  emptySonyBuzzStagedProfile,
  previewSonyBuzzApply,
  sonyBuzzStagedProgress,
  stageSonyBuzzCapture,
  type SonyBuzzStagedProfile,
} from '../input/sonyBuzzProfile'
import {
  LOCAL_INPUT_ACTION_LABEL,
  secondaryActionLabel,
  type LocalInputAction,
} from '../input/logicalAction'
import type { GamepadControlRef, GamepadMapping } from '../input/gamepadMapping'
import {
  SONY_BUZZ_COLORS,
  SONY_BUZZ_HANDSET_SLOT_COUNT,
  SONY_BUZZ_RC_OWED_NOTE,
  SONY_BUZZ_SLOT4_TEACHER_NOTE,
  SONY_BUZZ_SUPPORTED_PROFILE_ID,
  sonyBuzzSlotId,
  type SonyBuzzSlotId,
  type SonyBuzzSlotTeamAssociation,
} from '../input/sonyBuzzSupportedProfile'
import {
  addRespondingSlot,
  classifyControllerLayer,
  classifyMappingLayer,
  classifyReceiverLayer,
  classifyTeacherSummary,
  controllerLayerLabel,
  discoveredControllerLine,
  mappingLayerLabel,
  nextRepairStep,
  receiverLayerLabel,
  repairStepCopy,
  slotIdForPrimaryRedButton,
  teacherSummaryLabel,
  type SonyBuzzRepairStep,
} from '../input/sonyBuzzTeacherReadiness'
import type { SonyBuzzTransportSnapshot } from '../input/sonyBuzzKeepAliveLifecycle'
import type { GamepadControllerInfo } from './useGamepadBuzzInput'
import './SonyBuzzSetupSection.css'

/**
 * Host-private Sony Buzz! setup surface (Slices 10 + 21).
 *
 * A bounded child of {@link GamepadInputHostPanel}. It does not own a poll loop —
 * capture and test-mode edges arrive from the parent’s single
 * `useGamepadBuzzInput` lifecycle. It scores nothing, arms nothing.
 *
 * Slice 21 adds the supported Namtai Wbuzz profile (WebHID keep-alive +
 * host-private team associations). Manual capture remains available.
 */

export interface SonyBuzzSetupSectionProps {
  readonly teams: readonly TeamDefinition[]
  readonly controllers: readonly GamepadControllerInfo[]
  readonly diagnosticsStatus: 'ok' | 'unsupported' | 'unreadable'
  readonly activeMapping: GamepadMapping
  /** Apply a validated mapping produced by this section. Parent owns storage. */
  readonly onApplyMapping: (mapping: GamepadMapping) => boolean
  /** Whether the parent is currently capturing for THIS section. */
  readonly capturing: boolean
  /** Begin / cancel guided capture for the next outstanding prompt. */
  readonly onCapturingChange: (capturing: boolean) => void
  /** Whether non-gameplay test mode is active. */
  readonly testMode: boolean
  readonly onTestModeChange: (testMode: boolean) => void
  /** Latest test-mode observation from the parent poll owner, if any. */
  readonly lastTestObservation: SonyBuzzTestObservation | null
  /** Deliver a captured control from the parent poll owner. */
  readonly pendingCapture: GamepadControlRef | null
  readonly onPendingCaptureConsumed: () => void
  /** Slice 21 supported-profile controls. */
  readonly supportedProfile?: SonyBuzzSupportedProfileSectionProps
}

export interface SonyBuzzSupportedProfileSectionProps {
  readonly transport: SonyBuzzTransportSnapshot
  readonly associations: readonly SonyBuzzSlotTeamAssociation[]
  readonly mappingStatus: string
  readonly wbuzzPresent: boolean
  readonly onConnect: () => void
  readonly onDisableKeepAlive: () => void
  readonly onSetSlotTeam: (slotId: SonyBuzzSlotId, teamId: string | null) => void
  readonly onSaveAssociations: () => void
  readonly onClearSavedMapping: () => void
}

export interface SonyBuzzTestObservation {
  readonly teamId: string
  readonly action: LocalInputAction
  readonly control: GamepadControlRef
}

function actionWords(action: LocalInputAction): string {
  return action.kind === 'secondary'
    ? secondaryActionLabel(action.slot)
    : LOCAL_INPUT_ACTION_LABEL[action.kind]
}

function mappingWords(mapping: GamepadReportedMapping): string {
  if (mapping.status !== 'available') return 'mapping unavailable'
  if (mapping.value === '') return 'empty mapping token'
  return `browser mapping “${mapping.value}”`
}

function SupportedProfileBlock({
  teams,
  supportedProfile,
  testMode,
  onTestModeChange,
  lastTestObservation,
}: {
  teams: readonly TeamDefinition[]
  supportedProfile: SonyBuzzSupportedProfileSectionProps
  testMode: boolean
  onTestModeChange: (testMode: boolean) => void
  lastTestObservation: SonyBuzzTestObservation | null
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [repairStep, setRepairStep] = useState<SonyBuzzRepairStep>('idle')
  const [repairReason, setRepairReason] = useState<'repair' | 'hardware-changed'>('repair')
  const [respondingSlots, setRespondingSlots] = useState<readonly SonyBuzzSlotId[]>([])
  const slots = useMemo(() => {
    const map = new Map<SonyBuzzSlotId, string>()
    for (const a of supportedProfile.associations) map.set(a.slotId, a.teamId)
    return map
  }, [supportedProfile.associations])

  const receiver = classifyReceiverLayer(supportedProfile.transport.health)
  const controllersLayer = classifyControllerLayer(respondingSlots.length)
  const mappingLayer = classifyMappingLayer(
    supportedProfile.mappingStatus,
    supportedProfile.associations.length,
  )
  const summary = classifyTeacherSummary({
    receiver,
    controllers: controllersLayer,
    mapping: mappingLayer,
  })

  useEffect(() => {
    if (repairStep !== 'observe-red') return
    if (!testMode || lastTestObservation === null) return
    const slot = slotIdForPrimaryRedButton(lastTestObservation.control.buttonIndex)
    if (slot === null) return
    setRespondingSlots((current) => addRespondingSlot(current, slot))
  }, [repairStep, testMode, lastTestObservation])

  const beginRepair = (reason: 'repair' | 'hardware-changed') => {
    setRepairReason(reason)
    setRespondingSlots([])
    setRepairStep('power-off')
    supportedProfile.onDisableKeepAlive()
    if (testMode) onTestModeChange(false)
  }

  const advanceRepair = () => {
    const next = nextRepairStep(repairStep)
    if (next === 'observe-red') {
      supportedProfile.onConnect()
      onTestModeChange(true)
    }
    setRepairStep(next)
  }

  const finishRepairIntoBuzzerCheck = () => {
    setRepairStep('done')
    onTestModeChange(true)
  }

  const exitRepair = () => {
    setRepairStep('idle')
    setRespondingSlots([])
  }

  const repairActive = repairStep !== 'idle' && repairStep !== 'done'
  const stepCopy =
    repairStep === 'power-off' ||
    repairStep === 'solid-blue' ||
    repairStep === 'bind-blink' ||
    repairStep === 'observe-red'
      ? repairStepCopy(repairStep)
      : null

  return (
    <div className="sbs__supported" data-testid="sbs-supported-profile">
      <h5 className="sbs__heading">Classroom buzzers</h5>
      <p className="host__note" data-testid="sbs-teacher-intro">
        Plug in the Sony Buzz receiver, click Connect, then assign each controller
        to a team. Keyboard buzzing stays available if a controller fails.
      </p>

      <div className="sbs__readiness" data-testid="sbs-readiness">
        <p className="sbs__readiness-summary" data-testid="sbs-teacher-summary">
          {teacherSummaryLabel(summary)}
        </p>
        <dl className="sbs__status" data-testid="sbs-readiness-layers">
          <dt>Receiver</dt>
          <dd data-testid="sbs-receiver-layer">{receiverLayerLabel(receiver)}</dd>
          <dt>Controllers</dt>
          <dd data-testid="sbs-controller-layer">
            {controllerLayerLabel(controllersLayer, respondingSlots.length)}
          </dd>
          <dt>Team mapping</dt>
          <dd data-testid="sbs-mapping-layer">{mappingLayerLabel(mappingLayer)}</dd>
        </dl>
        <p className="host__note" data-testid="sbs-readiness-note">
          Receiver connected does not mean controllers are ready. Pair the
          controllers before expecting buzzes.
        </p>
      </div>

      <dl className="sbs__status" data-testid="sbs-transport-status">
        <dt>Transport detail</dt>
        <dd data-testid="sbs-transport-health">{supportedProfile.transport.health}</dd>
        <dt>Message</dt>
        <dd data-testid="sbs-transport-message">{supportedProfile.transport.teacherMessage}</dd>
        <dt>Gamepad Wbuzz</dt>
        <dd data-testid="sbs-wbuzz-present">
          {supportedProfile.wbuzzPresent
            ? 'Detected (20 buttons)'
            : 'Not detected yet — press a handset after Connect'}
        </dd>
        <dt>Saved mapping</dt>
        <dd data-testid="sbs-mapping-status">{supportedProfile.mappingStatus}</dd>
      </dl>

      <div className="sbs__actions">
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="sbs-connect"
          onClick={() => supportedProfile.onConnect()}
        >
          Connect classroom buzzers
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="sbs-disable-keepalive"
          onClick={() => supportedProfile.onDisableKeepAlive()}
        >
          Skip buzzers for now
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="sbs-repair-connection"
          onClick={() => beginRepair('repair')}
        >
          Repair controller connection
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="sbs-hardware-changed"
          onClick={() => beginRepair('hardware-changed')}
        >
          Hardware changed?
        </button>
      </div>

      {repairActive || repairStep === 'done' ? (
        <div className="sbs__repair" data-testid="sbs-repair-flow">
          <h5 className="sbs__heading">
            {repairReason === 'hardware-changed'
              ? 'Hardware changed — repair connection'
              : 'Repair controller connection'}
          </h5>
          <p className="host__note" data-testid="sbs-repair-keepalive-note">
            Sony connection is paused for pairing (Disable). After controllers
            blink, Connect resumes keep-alive. Mapping is not cleared.
          </p>
          {stepCopy ? (
            <div data-testid={`sbs-repair-step-${repairStep}`}>
              <p className="sbs__repair-title">{stepCopy.title}</p>
              <p className="host__note">{stepCopy.body}</p>
              {stepCopy.cta ? (
                <button
                  type="button"
                  className="btn btn--secondary"
                  data-testid="sbs-repair-advance"
                  onClick={advanceRepair}
                >
                  {stepCopy.cta}
                </button>
              ) : null}
            </div>
          ) : null}

          {repairStep === 'observe-red' ? (
            <div data-testid="sbs-repair-observe">
              <ul className="sbs__discovered" data-testid="sbs-discovered-controllers">
                {respondingSlots.length === 0 ? (
                  <li data-testid="sbs-discovered-none">No controllers detected yet</li>
                ) : (
                  respondingSlots.map((_, i) => (
                    <li key={respondingSlots[i]} data-testid={`sbs-discovered-${i + 1}`}>
                      {discoveredControllerLine(i + 1)}
                    </li>
                  ))
                )}
              </ul>
              <div className="sbs__actions">
                <button
                  type="button"
                  className="btn btn--secondary"
                  data-testid="sbs-run-buzzer-check"
                  onClick={finishRepairIntoBuzzerCheck}
                >
                  Run Buzzer Check
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  data-testid="sbs-repair-exit"
                  onClick={exitRepair}
                >
                  Done with repair
                </button>
              </div>
            </div>
          ) : null}

          {repairStep === 'done' ? (
            <div data-testid="sbs-repair-done">
              <p className="host__note">
                Continue with Buzzer Check (non-gameplay), then confirm team
                assignments below. Same-profile hardware replacement does not
                require resetting the whole app.
              </p>
              <button
                type="button"
                className="btn btn--secondary"
                data-testid="sbs-repair-exit"
                onClick={exitRepair}
              >
                Close repair guide
              </button>
            </div>
          ) : null}

          {repairActive && repairStep !== 'observe-red' ? (
            <button
              type="button"
              className="btn btn--secondary"
              data-testid="sbs-repair-cancel"
              onClick={exitRepair}
            >
              Cancel repair
            </button>
          ) : null}
        </div>
      ) : null}

      <h5 className="sbs__heading">Team assignments (handset slots)</h5>
      <p className="host__note" data-testid="sbs-slot-disposition">
        Slots are profile positions, not physical handset numbers. Four-slot
        profile design; fresh product RC used three available controllers.
        {` ${SONY_BUZZ_SLOT4_TEACHER_NOTE}`}
      </p>
      <ul className="sbs__slot-list" data-testid="sbs-slot-assignments">
        {Array.from({ length: SONY_BUZZ_HANDSET_SLOT_COUNT }, (_, i) => {
          const slotId = sonyBuzzSlotId(i)!
          const value = slots.get(slotId) ?? ''
          return (
            <li key={slotId}>
              <label>
                Slot {slotId}
                {slotId === 4 ? ' (optional fourth)' : ''}
                <select
                  data-testid={`sbs-slot-${slotId}`}
                  value={value}
                  onChange={(e) => {
                    const next = e.target.value
                    supportedProfile.onSetSlotTeam(slotId, next.length === 0 ? null : next)
                  }}
                >
                  <option value="">Unassigned</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          )
        })}
      </ul>
      <div className="sbs__actions">
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="sbs-save-mapping"
          onClick={() => supportedProfile.onSaveAssociations()}
        >
          Save team mapping
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="sbs-clear-mapping"
          onClick={() => supportedProfile.onClearSavedMapping()}
        >
          Clear saved Sony mapping
        </button>
      </div>

      <p className="host__note" data-testid="sbs-buzzer-check-bridge">
        Buzzer Check (below) reports colors ({SONY_BUZZ_COLORS.join(', ')}) without
        changing the game. Secondary colors never score. After hardware changes:
        Repair controller connection → Buzzer Check → Confirm team assignments →
        Ready.
      </p>

      <button
        type="button"
        className="btn btn--secondary"
        data-testid="sbs-toggle-advanced"
        onClick={() => setShowAdvanced((v) => !v)}
      >
        {showAdvanced ? 'Hide advanced diagnostics' : 'Advanced diagnostics'}
      </button>
      <p className="host__note" data-testid="sbs-profile-id" hidden={!showAdvanced}>
        Profile <code>{SONY_BUZZ_SUPPORTED_PROFILE_ID}</code> — exact USB{' '}
        <code>054c:1000</code> only. Receiver keep-alive is health-only; Gamepad
        remains the gameplay input path.
      </p>
      {showAdvanced ? (
        <pre className="sbs__diag" data-testid="sbs-advanced-diag">
          {JSON.stringify(
            {
              health: supportedProfile.transport.health,
              sends: supportedProfile.transport.sends,
              failures: supportedProfile.transport.failures,
              lastError: supportedProfile.transport.lastError,
              deviceLabel: supportedProfile.transport.deviceLabel,
              framingOk: supportedProfile.transport.framingOk,
              ownerDisposition: SONY_BUZZ_RC_OWED_NOTE,
            },
            null,
            2,
          )}
        </pre>
      ) : null}
    </div>
  )
}

export function SonyBuzzSetupSection({
  teams,
  controllers,
  diagnosticsStatus,
  activeMapping,
  onApplyMapping,
  capturing,
  onCapturingChange,
  testMode,
  onTestModeChange,
  lastTestObservation,
  pendingCapture,
  onPendingCaptureConsumed,
  supportedProfile,
}: SonyBuzzSetupSectionProps) {
  const initialTeamId = teams[0]?.id ?? ''
  const [teamId, setTeamId] = useState<string>(initialTeamId)
  const [staged, setStaged] = useState<SonyBuzzStagedProfile>(() =>
    emptySonyBuzzStagedProfile(initialTeamId),
  )
  const [message, setMessage] = useState<string | null>(null)
  const [previewLines, setPreviewLines] = useState<readonly string[] | null>(null)

  useEffect(() => {
    if (teamId.length === 0 && teams[0]) {
      setTeamId(teams[0].id)
    }
  }, [teamId, teams])

  useEffect(() => {
    setStaged((current) => {
      if (current.teamId === teamId) return current
      return emptySonyBuzzStagedProfile(teamId)
    })
    setPreviewLines(null)
  }, [teamId])

  const stagedRef = useRef(staged)
  stagedRef.current = staged
  const teamsRef = useRef(teams)
  teamsRef.current = teams
  const mappingRef = useRef(activeMapping)
  mappingRef.current = activeMapping
  /** Prevents Strict Mode's setup→cleanup→setup from staging the same edge twice. */
  const handledCaptureRef = useRef<GamepadControlRef | null>(null)

  useEffect(() => {
    if (pendingCapture === null) {
      handledCaptureRef.current = null
      return
    }
    if (handledCaptureRef.current === pendingCapture) return
    handledCaptureRef.current = pendingCapture

    // Consume first so a remount cannot re-stage the same delivery.
    onPendingCaptureConsumed()
    onCapturingChange(false)

    const result = stageSonyBuzzCapture(
      stagedRef.current,
      pendingCapture,
      teamsRef.current,
      mappingRef.current,
    )
    if (result.ok) {
      setStaged(result.profile)
      setPreviewLines(null)
      const next = sonyBuzzStagedProgress(result.profile)
      setMessage(
        next.nextPrompt === null
          ? 'All five buttons are staged. Preview, then Apply, or Discard.'
          : `Captured. Next: ${next.nextPrompt.promptLabel}.`,
      )
      return
    }
    setMessage(result.issues[0] ?? 'That press could not be staged.')
  }, [pendingCapture, onPendingCaptureConsumed, onCapturingChange])

  const progress = useMemo(() => sonyBuzzStagedProgress(staged), [staged])
  const nameOf = (id: string) => teams.find((team) => team.id === id)?.name ?? id
  const surfaceState = describeSurfaceState(diagnosticsStatus, controllers)

  return (
    <section className="sbs" aria-labelledby="sbs-title" data-testid="sbs">
      <h4 id="sbs-title" className="sbs__heading">
        Sony Buzz
      </h4>
      <p className="host__note" data-testid="sbs-intro">
        Optional classroom buzzers. Connect the receiver, assign each controller
        to a team, then run Buzzer Check. A candidate match is not proof the class
        can play. Keyboard buzzing remains available if hardware is missing or
        fails. Assignments are lost when this page reloads unless you save the
        mapping. Advanced diagnostics stay folded away.
      </p>

      {supportedProfile ? (
        <SupportedProfileBlock
          teams={teams}
          supportedProfile={supportedProfile}
          testMode={testMode}
          onTestModeChange={onTestModeChange}
          lastTestObservation={lastTestObservation}
        />
      ) : null}

      <h5 className="sbs__heading">Manual capture (advanced)</h5>

      <p className="host__note" data-testid="sbs-surface-state" aria-live="polite">
        {surfaceState}
      </p>

      {controllers.length > 0 && (
        <ul className="sbs__devices" data-testid="sbs-devices">
          {controllers.map((pad) => (
            <li key={pad.controllerIndex} data-testid={`sbs-device-${pad.controllerIndex}`}>
              <span className="sbs__device-label">{controllerLabel(pad.controllerIndex)}</span>
              <span data-testid={`sbs-class-${pad.controllerIndex}`}>
                {GAMEPAD_DEVICE_CLASSIFICATION_LABEL[pad.classification]}
              </span>
              <span className="host__note">
                {pad.buttonCount} {pad.buttonCount === 1 ? 'button' : 'buttons'} ·{' '}
                {mappingWords(pad.reportedMapping)}
              </span>
              <p className="host__note" data-testid={`sbs-class-msg-${pad.controllerIndex}`}>
                {GAMEPAD_DEVICE_CLASSIFICATION_MESSAGE[pad.classification]}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="sbs__team-picker">
        <label htmlFor="sbs-team">Handset team (explicit)</label>
        <select
          id="sbs-team"
          data-testid="sbs-team"
          value={teamId}
          disabled={capturing || testMode}
          onChange={(event) => {
            setTeamId(event.target.value)
            setMessage('Team changed. Previous staged captures for the other team were discarded.')
          }}
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <p className="host__note" data-testid="sbs-progress" aria-live="polite">
        Staged progress for {nameOf(teamId)}: {progress.captured} of {progress.total}
        {progress.nextPrompt
          ? ` — next prompt: ${progress.nextPrompt.promptLabel} (${progress.nextPrompt.colourLabel})`
          : ' — complete'}
      </p>

      <fieldset className="sbs__actions">
        <legend className="visually-hidden">Sony Buzz setup actions</legend>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="sbs-capture"
          disabled={
            diagnosticsStatus === 'unsupported' ||
            testMode ||
            progress.nextPrompt === null ||
            teamId.length === 0
          }
          onClick={() => {
            if (capturing) {
              onCapturingChange(false)
              setMessage('Capture cancelled. Staged progress was left as it was.')
              return
            }
            onCapturingChange(true)
            setMessage(
              progress.nextPrompt
                ? `${progress.nextPrompt.promptLabel} (${progress.nextPrompt.colourLabel}). Use Cancel to stop.`
                : 'Nothing left to capture.',
            )
          }}
        >
          {capturing ? 'Cancel capture' : 'Capture next button'}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="sbs-undo-last"
          disabled={capturing || testMode || staged.staged.length === 0}
          onClick={() => {
            setStaged(cancelLastSonyBuzzCapture(staged))
            setPreviewLines(null)
            setMessage('Last staged capture removed.')
          }}
        >
          Remove last capture
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="sbs-preview"
          disabled={capturing || testMode || progress.captured === 0}
          onClick={() => {
            const preview = previewSonyBuzzApply(staged, activeMapping, teams)
            if (!preview.ok) {
              setPreviewLines(null)
              const first = preview.issues[0]
              setMessage(
                typeof first === 'string'
                  ? first
                  : (first?.message ?? 'This staged profile cannot be applied.'),
              )
              return
            }
            setPreviewLines(describeSonyBuzzStagedProfile(staged))
            setMessage(
              'Preview ready. Apply to use these bindings, or Discard to leave the active mapping unchanged.',
            )
          }}
        >
          Preview
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="sbs-apply"
          disabled={capturing || testMode || progress.nextPrompt !== null}
          onClick={() => {
            const result = applySonyBuzzStagedProfile(staged, activeMapping, teams)
            if (!result.ok) {
              const first = result.issues[0]
              setMessage(
                typeof first === 'string'
                  ? first
                  : (first?.message ?? 'Apply refused. The active mapping was left unchanged.'),
              )
              return
            }
            if (!onApplyMapping(result.mapping)) {
              setMessage('Apply refused by mapping validation. The active mapping was left unchanged.')
              return
            }
            setStaged(emptySonyBuzzStagedProfile(teamId))
            setPreviewLines(null)
            setMessage(
              `Applied handset profile for ${nameOf(teamId)}. Bindings are session-local and lost on reload.`,
            )
          }}
        >
          Apply
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="sbs-discard"
          disabled={capturing || testMode || staged.staged.length === 0}
          onClick={() => {
            setStaged(discardSonyBuzzStagedProfile(teamId))
            setPreviewLines(null)
            setMessage('Staged profile discarded. The active controller mapping was not changed.')
          }}
        >
          Discard staged
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="sbs-test-mode"
          disabled={diagnosticsStatus === 'unsupported' || capturing}
          aria-pressed={testMode}
          onClick={() => {
            onTestModeChange(!testMode)
            setMessage(
              testMode
                ? 'Buzzer Check off. Controller presses can reach gameplay again when buzzing is on.'
                : 'Buzzer Check on. Presses report team and action here and do not change scores, queues, timers, or content.',
            )
          }}
        >
          {testMode ? 'Leave Buzzer Check' : 'Run Buzzer Check'}
        </button>
      </fieldset>

      {previewLines !== null && (
        <ul className="sbs__preview" data-testid="sbs-preview-list">
          {previewLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      <p className="host__note" data-testid="sbs-status" aria-live="polite">
        {message ?? ''}
      </p>

      <p className="host__note" data-testid="sbs-test-outcome" aria-live="polite">
        {describeTestOutcome(lastTestObservation, testMode, nameOf)}
      </p>

      <p className="host__note" data-testid="sbs-keyboard-fallback">
        Keyboard buzzing remains available whether or not a Sony Buzz! candidate is
        present.
      </p>
    </section>
  )
}

function describeTestOutcome(
  observation: SonyBuzzTestObservation | null,
  testMode: boolean,
  nameOf: (teamId: string) => string,
): string {
  if (observation !== null) {
    return `Buzzer Check: ${nameOf(observation.teamId)} · ${actionWords(observation.action)} · ${controllerLabel(observation.control.controllerIndex)} · button ${observation.control.buttonIndex + 1}`
  }
  if (testMode) {
    return 'Buzzer Check is on. Press a mapped button to see its team and action. Nothing is scored.'
  }
  return 'Buzzer Check is off.'
}

function describeSurfaceState(
  status: 'ok' | 'unsupported' | 'unreadable',
  controllers: readonly GamepadControllerInfo[],
): string {
  if (status === 'unsupported') {
    return 'Controller input is unsupported in this browser. Keyboard buzzing remains available.'
  }
  if (status === 'unreadable') {
    return 'Controller state is unreadable in this browser. Nothing was buzzed. Keyboard buzzing remains available.'
  }
  if (controllers.length === 0) {
    return 'No controller detected. Keyboard buzzing remains available.'
  }
  const kinds = new Set(controllers.map((pad) => pad.classification))
  if (kinds.has('candidate-sony-buzz-wired') || kinds.has('candidate-sony-buzz-wireless')) {
    return 'At least one candidate Sony Buzz! controller is visible (USB id evidence only).'
  }
  if ([...kinds].every((kind) => kind === 'identity-unavailable')) {
    return 'Controllers are visible, but identity is unavailable for classification.'
  }
  return 'Controllers are visible. None matched the primary-source Sony Buzz! USB ids (unrecognized). Manual assignment remains available.'
}
