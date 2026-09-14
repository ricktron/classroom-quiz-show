import { useState } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAudioPlaybackController,
  resetDocumentAudioPlaybackController,
  type AudioPlaybackController,
} from '../audio/audioPlaybackController'
import { AudioControls } from './AudioControls'
import type { UsePresentationAudioResult } from './usePresentationAudio'
import { observePresentationCues } from '../audio/observePresentationCues'
import { createSessionStore } from '../state/store'

afterEach(() => {
  resetDocumentAudioPlaybackController()
})

function fakeDeps() {
  return {
    AudioContextCtor: vi.fn(function AudioContext() {
      return {
        state: 'running',
        destination: {},
        createGain: () => ({ gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }),
        createBufferSource: () => ({
          buffer: null,
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          onended: null,
        }),
        decodeAudioData: vi.fn(async () => ({ duration: 0.1 })),
        resume: vi.fn(async () => undefined),
        close: vi.fn(async () => undefined),
      }
    }) as unknown as typeof AudioContext,
    fetchImpl: vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })) as unknown as typeof fetch,
    registry: {
      'active-claim': '/a.wav',
      'positive-award': '/b.wav',
      incorrect: '/c.wav',
      'timer-expired': '/d.wav',
      'game-complete': '/e.wav',
    } as const,
  }
}

function ControlledAudio({ controller }: { readonly controller: AudioPlaybackController }) {
  const [status, setStatus] = useState(controller.getStatus())
  const audio: UsePresentationAudioResult = {
    status,
    controller,
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
  }
  return <AudioControls audio={audio} />
}

describe('AudioControls', () => {
  it('inactive exposes Enable Sound; switch uses stable Presentation sound name', async () => {
    const controller = createAudioPlaybackController(fakeDeps())
    render(<ControlledAudio controller={controller} />)

    expect(screen.getByTestId('audio-controls')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enable sound/i })).toBeEnabled()
    expect(screen.queryByTestId('audio-retry')).not.toBeInTheDocument()
    expect(screen.getByTestId('audio-mute')).toBeDisabled()
    expect(screen.getByTestId('audio-volume')).toBeDisabled()
    expect(screen.getByTestId('audio-status')).toHaveTextContent(/sound is off/i)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /enable sound/i }))
    })

    expect(screen.getByTestId('audio-status')).toHaveTextContent(/sound enabled/i)
    expect(screen.queryByTestId('audio-enable')).not.toBeInTheDocument()
    expect(screen.queryByTestId('audio-retry')).not.toBeInTheDocument()
    expect(screen.getByTestId('audio-mute')).toBeEnabled()
    expect(screen.getByTestId('audio-volume')).toBeEnabled()

    const muteSwitch = screen.getByRole('switch', { name: 'Presentation sound' })
    expect(muteSwitch).toHaveAttribute('aria-checked', 'true')
    expect(muteSwitch).toHaveTextContent('Mute')

    fireEvent.click(muteSwitch)
    expect(screen.getByRole('switch', { name: 'Presentation sound' })).toHaveAttribute(
      'aria-checked',
      'false',
    )
    expect(screen.getByTestId('audio-mute')).toHaveTextContent('Unmute')
    expect(screen.getByTestId('audio-status')).toHaveTextContent(/muted/i)

    fireEvent.click(screen.getByRole('switch', { name: 'Presentation sound' }))
    expect(screen.getByRole('switch', { name: 'Presentation sound' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    fireEvent.change(screen.getByTestId('audio-volume'), { target: { value: '0.5' } })
    expect(controller.getStatus().volume).toBe(0.5)
    controller.dispose()
  })

  it('panic mute stops audio immediately even before sound is enabled', () => {
    const controller = createAudioPlaybackController(fakeDeps())
    render(<ControlledAudio controller={controller} />)
    fireEvent.click(screen.getByTestId('audio-panic-mute'))
    expect(controller.getStatus().muted).toBe(true)
    controller.dispose()
  })

  it('failure state exposes exactly one retry action', () => {
    const controller = createAudioPlaybackController(fakeDeps())
    const audio: UsePresentationAudioResult = {
      status: {
        activation: 'failed',
        muted: true,
        volume: 0.35,
        message: 'Sound could not be enabled. boom',
      },
      controller,
      enableSound: async () => undefined,
      setMuted: () => undefined,
      setVolume: () => undefined,
    }
    render(<AudioControls audio={audio} />)
    expect(screen.getByTestId('audio-status')).toHaveTextContent(/could not be enabled/i)
    expect(screen.getByTestId('audio-retry')).toBeInTheDocument()
    expect(screen.queryByTestId('audio-enable')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /retry/i })).toHaveLength(1)
    controller.dispose()
  })
})

describe('presentation audio host wiring invariants', () => {
  it('SessionStore replacement rebaselines without historical cues', () => {
    const plays: string[] = []
    const first = createSessionStore()
    first.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 'a' })
    let observer = observePresentationCues({
      store: first,
      onCue: (cue) => {
        plays.push(cue)
      },
    })
    observer.detach()
    const second = createSessionStore({ initialHistory: first.getHistory() })
    observer = observePresentationCues({
      store: second,
      onCue: (cue) => {
        plays.push(cue)
      },
    })
    expect(plays).toEqual([])
    observer.detach()
  })

  it('controls are absent from projector display route module surface', async () => {
    const display = await import('../routes/DisplayRoute')
    expect(display.DisplayRoute.toString()).not.toMatch(/AudioControls|Enable Sound/)
  })
})
