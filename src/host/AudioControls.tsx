import type { UsePresentationAudioResult } from './usePresentationAudio'
import { DEFAULT_MASTER_VOLUME } from '../audio/audioPlaybackController'
import './AudioControls.css'

export interface AudioControlsProps {
  readonly audio: UsePresentationAudioResult
}

/**
 * Host-private presentation audio controls.
 *
 * Never rendered on the projector/display route.
 */
export function AudioControls({ audio }: AudioControlsProps) {
  const { status, enableSound, setMuted, setVolume } = audio
  const ready = status.activation === 'ready'
  const activating = status.activation === 'activating'
  const failed = status.activation === 'failed'
  const inactive = status.activation === 'inactive'
  const soundOn = ready && !status.muted

  return (
    <section className="audio-controls" aria-labelledby="audio-controls-title" data-testid="audio-controls">
      <h3 id="audio-controls-title" className="audio-controls__title">
        Presentation sound
      </h3>
      <p className="host__note audio-controls__intro">
        Optional classroom feedback cues. Sound never changes scoring, timers, or
        who is active — visuals remain complete when muted.
      </p>

      <div className="audio-controls__row" role="group" aria-label="Sound activation">
        {inactive && (
          <button
            type="button"
            className="btn"
            data-testid="audio-enable"
            aria-label="Enable Sound"
            disabled={activating}
            onClick={() => {
              void enableSound()
            }}
          >
            Enable Sound
          </button>
        )}
        {activating && (
          <button type="button" className="btn" data-testid="audio-enabling" disabled>
            Enabling…
          </button>
        )}
        {failed && (
          <button
            type="button"
            className="btn"
            data-testid="audio-retry"
            aria-label="Retry enabling sound"
            disabled={activating}
            onClick={() => {
              void enableSound()
            }}
          >
            Retry
          </button>
        )}
      </div>

      <div className="audio-controls__row">
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="audio-mute"
          role="switch"
          aria-checked={soundOn}
          aria-label="Presentation sound"
          disabled={!ready}
          onClick={() => {
            setMuted(!status.muted)
          }}
        >
          {status.muted ? 'Unmute' : 'Mute'}
        </button>
        <button
          type="button"
          className="btn btn--destructive"
          data-testid="audio-panic-mute"
          aria-label="Mute all sounds"
          onClick={() => {
            setMuted(true)
          }}
        >
          Mute all sounds
        </button>

        <label className="audio-controls__volume" htmlFor="audio-volume">
          Volume
          <input
            id="audio-volume"
            data-testid="audio-volume"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={ready ? status.volume : DEFAULT_MASTER_VOLUME}
            disabled={!ready}
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={ready ? status.volume : DEFAULT_MASTER_VOLUME}
            aria-valuetext={`${Math.round((ready ? status.volume : DEFAULT_MASTER_VOLUME) * 100)} percent`}
            onChange={(event) => {
              setVolume(Number(event.target.value))
            }}
          />
        </label>
      </div>

      <p
        className="audio-controls__status"
        data-testid="audio-status"
        role="status"
        aria-live="polite"
      >
        {status.message}
      </p>
    </section>
  )
}
