/**
 * Host-private presentation-audio lifecycle.
 *
 * Owns:
 * - one document playback controller (survives SessionStore replacement)
 * - one observer attached to the current SessionStore (rebaselines on replace)
 *
 * Preferences (mute/volume/activation) live in page memory only — not IndexedDB
 * or localStorage.
 */

import { useEffect, useRef, useState } from 'react'
import type { SessionStore } from '../state/store'
import {
  DEFAULT_MASTER_VOLUME,
  getDocumentAudioPlaybackController,
  type AudioPlaybackController,
  type AudioPlaybackStatus,
} from '../audio/audioPlaybackController'
import { observePresentationCues } from '../audio/observePresentationCues'

export interface UsePresentationAudioResult {
  readonly status: AudioPlaybackStatus
  readonly enableSound: () => Promise<void>
  readonly setMuted: (muted: boolean) => void
  readonly setVolume: (volume: number) => void
  readonly controller: AudioPlaybackController
}

export function usePresentationAudio(store: SessionStore): UsePresentationAudioResult {
  const controllerRef = useRef<AudioPlaybackController | null>(null)
  if (controllerRef.current === null) {
    controllerRef.current = getDocumentAudioPlaybackController()
  }
  const controller = controllerRef.current

  const [status, setStatus] = useState<AudioPlaybackStatus>(() => controller.getStatus())

  useEffect(() => {
    return controller.subscribe(() => {
      setStatus(controller.getStatus())
    })
  }, [controller])

  useEffect(() => {
    const observer = observePresentationCues({
      store,
      onCue: (cueId) => {
        controller.playCue(cueId)
      },
    })
    return () => {
      observer.detach()
    }
  }, [store, controller])

  return {
    status,
    enableSound: async () => {
      const next = await controller.activate()
      setStatus(next)
    },
    setMuted: (muted) => {
      controller.setMuted(muted)
      setStatus(controller.getStatus())
    },
    setVolume: (volume) => {
      controller.setVolume(volume)
      setStatus(controller.getStatus())
    },
    controller,
  }
}

export { DEFAULT_MASTER_VOLUME }
