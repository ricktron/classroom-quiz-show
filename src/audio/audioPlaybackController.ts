/**
 * Slice 22 — one Web Audio playback owner per host document.
 *
 * Lifecycle:
 * - inactive until explicit Enable Sound (user gesture)
 * - one AudioContext + master GainNode
 * - five decoded AudioBuffers loaded during activation
 * - latest-cue-wins overlap (stop prior short source)
 * - mute/volume are presentation-only page memory
 *
 * Audio failure never throws into gameplay callers.
 */

import { CORE_CUE_REGISTRY, type CueRegistry } from './cueRegistry'
import { PRESENTATION_CUE_IDS, type PresentationCueId } from './presentationCueId'

export const DEFAULT_MASTER_VOLUME = 0.35

export type AudioActivationStatus =
  | 'inactive'
  | 'activating'
  | 'ready'
  | 'failed'

export interface AudioPlaybackStatus {
  readonly activation: AudioActivationStatus
  readonly muted: boolean
  readonly volume: number
  readonly message: string
}

export interface AudioPlaybackController {
  readonly getStatus: () => AudioPlaybackStatus
  readonly activate: () => Promise<AudioPlaybackStatus>
  readonly setMuted: (muted: boolean) => void
  readonly setVolume: (volume: number) => void
  readonly playCue: (cueId: PresentationCueId) => void
  readonly subscribe: (listener: () => void) => () => void
  readonly dispose: () => void
}

export interface AudioPlaybackControllerOptions {
  readonly registry?: CueRegistry
  readonly AudioContextCtor?: typeof AudioContext
  readonly fetchImpl?: typeof fetch
  /** Optional diagnostics sink (e2e / unit). Not a UI surface. */
  readonly onPlayAttempt?: (cueId: PresentationCueId) => void
}

type AudioContextLike = AudioContext
type AudioBufferSourceLike = AudioBufferSourceNode

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MASTER_VOLUME
  return Math.min(1, Math.max(0, value))
}

let documentOwner: AudioPlaybackController | null = null

/** Return the single document-scoped playback owner, creating it if needed. */
export function getDocumentAudioPlaybackController(
  options: AudioPlaybackControllerOptions = {},
): AudioPlaybackController {
  if (documentOwner === null) {
    documentOwner = createAudioPlaybackController(options)
  }
  return documentOwner
}

/** Test/reset helper — disposes and clears the document owner. */
export function resetDocumentAudioPlaybackController(): void {
  if (documentOwner !== null) {
    documentOwner.dispose()
    documentOwner = null
  }
}

export function createAudioPlaybackController(
  options: AudioPlaybackControllerOptions = {},
): AudioPlaybackController {
  const registry = options.registry ?? CORE_CUE_REGISTRY
  const AudioContextCtor = options.AudioContextCtor ?? globalThis.AudioContext
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis)
  const onPlayAttempt = options.onPlayAttempt

  let activation: AudioActivationStatus = 'inactive'
  let muted = true
  let volume = DEFAULT_MASTER_VOLUME
  let message = 'Sound is off. Select Enable Sound to play presentation cues.'
  let context: AudioContextLike | null = null
  let masterGain: GainNode | null = null
  let activeSource: AudioBufferSourceLike | null = null
  const buffers = new Map<PresentationCueId, AudioBuffer>()
  const listeners = new Set<() => void>()
  let disposed = false

  function emit(): void {
    for (const listener of [...listeners]) {
      try {
        listener()
      } catch {
        // Ignore listener failures.
      }
    }
  }

  function getStatus(): AudioPlaybackStatus {
    return { activation, muted, volume, message }
  }

  function applyGain(): void {
    if (masterGain === null) return
    masterGain.gain.value = muted ? 0 : volume
  }

  async function decodeAll(): Promise<void> {
    if (context === null) throw new Error('Audio context missing')
    const pending: Promise<void>[] = []
    for (const cueId of PRESENTATION_CUE_IDS) {
      pending.push(
        (async () => {
          const url = registry[cueId]
          const response = await fetchImpl(url)
          if (!response.ok) {
            throw new Error(`Failed to fetch audio asset for ${cueId}`)
          }
          const bytes = await response.arrayBuffer()
          const buffer = await context!.decodeAudioData(bytes.slice(0))
          buffers.set(cueId, buffer)
        })(),
      )
    }
    await Promise.all(pending)
    for (const cueId of PRESENTATION_CUE_IDS) {
      if (!buffers.has(cueId)) {
        throw new Error(`Missing decoded buffer for ${cueId}`)
      }
    }
  }

  async function activate(): Promise<AudioPlaybackStatus> {
    if (disposed) {
      return getStatus()
    }
    if (activation === 'ready') {
      return getStatus()
    }
    if (AudioContextCtor === undefined) {
      activation = 'failed'
      message = 'Sound unavailable in this browser.'
      emit()
      return getStatus()
    }

    activation = 'activating'
    message = 'Enabling sound…'
    emit()

    try {
      // Create/resume synchronously within the user-gesture call stack when possible.
      if (context === null) {
        try {
          context = new AudioContextCtor({ latencyHint: 'interactive' })
        } catch {
          context = new AudioContextCtor()
        }
        masterGain = context.createGain()
        masterGain.connect(context.destination)
      }

      // Kick resume immediately (Safari/iOS user-activation guidance).
      const resumePromise =
        context.state === 'suspended' ? context.resume() : Promise.resolve()

      await resumePromise
      if (context.state === 'suspended') {
        await context.resume()
      }
      if (context.state !== 'running' && context.state !== 'suspended') {
        // Some fakes use custom states; continue if decode works.
      }

      await decodeAll()

      muted = false
      volume = DEFAULT_MASTER_VOLUME
      applyGain()
      activation = 'ready'
      message = 'Sound enabled.'
      emit()
      return getStatus()
    } catch (error) {
      buffers.clear()
      activation = 'failed'
      const detail = error instanceof Error ? error.message : 'Unknown audio error'
      message = `Sound could not be enabled. ${detail}`
      emit()
      return getStatus()
    }
  }

  function stopActiveSource(): void {
    if (activeSource === null) return
    try {
      activeSource.onended = null
      activeSource.stop()
    } catch {
      // already stopped
    }
    try {
      activeSource.disconnect()
    } catch {
      // ignore
    }
    activeSource = null
  }

  function playCue(cueId: PresentationCueId): void {
    if (disposed) return
    if (activation !== 'ready') return
    if (muted) return
    if (context === null || masterGain === null) return

    const buffer = buffers.get(cueId)
    if (buffer === undefined) return

    try {
      onPlayAttempt?.(cueId)
      stopActiveSource()
      if (context.state === 'suspended') {
        void context.resume().catch(() => {
          // consumed — no backlog
        })
      }
      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(masterGain)
      source.onended = () => {
        if (activeSource === source) activeSource = null
      }
      activeSource = source
      source.start(0)
    } catch {
      // Playback exceptions stay presentation-local.
      activeSource = null
    }
  }

  function setMuted(next: boolean): void {
    if (disposed) return
    muted = Boolean(next)
    applyGain()
    if (activation === 'ready') {
      message = muted ? 'Sound muted.' : 'Sound enabled.'
    }
    emit()
  }

  function setVolume(next: number): void {
    if (disposed) return
    volume = clampVolume(next)
    applyGain()
    emit()
  }

  const api: AudioPlaybackController = {
    getStatus,
    activate,
    setMuted,
    setVolume,
    playCue,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      stopActiveSource()
      buffers.clear()
      try {
        masterGain?.disconnect()
      } catch {
        // ignore
      }
      masterGain = null
      if (context !== null) {
        void context.close().catch(() => {
          // ignore
        })
        context = null
      }
      listeners.clear()
      if (documentOwner === api) {
        documentOwner = null
      }
    },
  }

  return api
}
