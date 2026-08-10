import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createAudioPlaybackController,
  DEFAULT_MASTER_VOLUME,
  resetDocumentAudioPlaybackController,
  getDocumentAudioPlaybackController,
} from './audioPlaybackController'
import { PRESENTATION_CUE_IDS } from './presentationCueId'
import type { CueRegistry } from './cueRegistry'

function fakeWavBytes(): ArrayBuffer {
  // Minimal valid-enough buffer; decodeAudioData is mocked.
  return new Uint8Array([1, 2, 3, 4]).buffer
}

function createFakeAudioContext() {
  const sources: Array<{ stop: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> }> = []
  const gain = { gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }
  const ctx = {
    state: 'suspended' as AudioContextState,
    destination: {},
    createGain: vi.fn(() => gain),
    createBufferSource: vi.fn(() => {
      const source = {
        buffer: null as AudioBuffer | null,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        onended: null as (() => void) | null,
      }
      sources.push(source)
      return source
    }),
    decodeAudioData: vi.fn(async () => ({ duration: 0.1 }) as AudioBuffer),
    resume: vi.fn(async () => {
      ctx.state = 'running'
    }),
    close: vi.fn(async () => {
      ctx.state = 'closed'
    }),
  }
  return { ctx, gain, sources }
}

const registry: CueRegistry = {
  'active-claim': '/audio/active-claim.wav',
  'positive-award': '/audio/positive-award.wav',
  incorrect: '/audio/incorrect.wav',
  'timer-expired': '/audio/timer-expired.wav',
  'game-complete': '/audio/game-complete.wav',
}

afterEach(() => {
  resetDocumentAudioPlaybackController()
})

describe('audioPlaybackController', () => {
  it('does not rely on context before explicit activation', async () => {
    const { ctx } = createFakeAudioContext()
    const AudioContextCtor = vi.fn(function AudioContext() {
      return ctx
    }) as unknown as typeof AudioContext
    const controller = createAudioPlaybackController({
      registry,
      AudioContextCtor,
      fetchImpl: vi.fn() as unknown as typeof fetch,
    })
    expect(controller.getStatus().activation).toBe('inactive')
    expect(AudioContextCtor).not.toHaveBeenCalled()
    controller.playCue('active-claim')
    expect(AudioContextCtor).not.toHaveBeenCalled()
  })

  it('explicit activation creates/resumes context, loads five buffers, default gain 0.35', async () => {
    const { ctx, gain } = createFakeAudioContext()
    const AudioContextCtor = vi.fn(function AudioContext() {
      return ctx
    }) as unknown as typeof AudioContext
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => fakeWavBytes(),
    })) as unknown as typeof fetch
    const controller = createAudioPlaybackController({
      registry,
      AudioContextCtor,
      fetchImpl,
    })
    const status = await controller.activate()
    expect(status.activation).toBe('ready')
    expect(status.muted).toBe(false)
    expect(status.volume).toBe(DEFAULT_MASTER_VOLUME)
    expect(gain.gain.value).toBe(DEFAULT_MASTER_VOLUME)
    expect(ctx.resume).toHaveBeenCalled()
    expect(fetchImpl).toHaveBeenCalledTimes(PRESENTATION_CUE_IDS.length)
    expect(ctx.decodeAudioData).toHaveBeenCalledTimes(PRESENTATION_CUE_IDS.length)
  })

  it('volume clamp and mute/unmute', async () => {
    const { ctx, gain } = createFakeAudioContext()
    const controller = createAudioPlaybackController({
      registry,
      AudioContextCtor: vi.fn(function AudioContext() {
        return ctx
      }) as unknown as typeof AudioContext,
      fetchImpl: vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => fakeWavBytes(),
      })) as unknown as typeof fetch,
    })
    await controller.activate()
    controller.setVolume(2)
    expect(controller.getStatus().volume).toBe(1)
    controller.setVolume(-1)
    expect(controller.getStatus().volume).toBe(0)
    controller.setVolume(DEFAULT_MASTER_VOLUME)
    controller.setMuted(true)
    expect(gain.gain.value).toBe(0)
    expect(controller.getStatus().muted).toBe(true)
    controller.setMuted(false)
    expect(gain.gain.value).toBe(DEFAULT_MASTER_VOLUME)
  })

  it('latest cue stops/replaces prior source; muted skips play attempt', async () => {
    const { ctx, sources } = createFakeAudioContext()
    const attempts: string[] = []
    const controller = createAudioPlaybackController({
      registry,
      AudioContextCtor: vi.fn(function AudioContext() {
        return ctx
      }) as unknown as typeof AudioContext,
      fetchImpl: vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => fakeWavBytes(),
      })) as unknown as typeof fetch,
      onPlayAttempt: (cue) => attempts.push(cue),
    })
    await controller.activate()
    controller.playCue('active-claim')
    controller.playCue('positive-award')
    expect(sources[0]?.stop).toHaveBeenCalled()
    expect(attempts).toEqual(['active-claim', 'positive-award'])
    controller.setMuted(true)
    controller.playCue('incorrect')
    expect(attempts).toEqual(['active-claim', 'positive-award'])
  })

  it('decode/load failure produces safe presentation status', async () => {
    const { ctx } = createFakeAudioContext()
    const controller = createAudioPlaybackController({
      registry,
      AudioContextCtor: vi.fn(function AudioContext() {
        return ctx
      }) as unknown as typeof AudioContext,
      fetchImpl: vi.fn(async () => ({
        ok: false,
        arrayBuffer: async () => fakeWavBytes(),
      })) as unknown as typeof fetch,
    })
    const status = await controller.activate()
    expect(status.activation).toBe('failed')
    expect(status.message).toMatch(/could not be enabled/i)
    controller.playCue('active-claim')
  })

  it('playback and resume exceptions do not escape', async () => {
    const { ctx } = createFakeAudioContext()
    ctx.createBufferSource = vi.fn(() => {
      throw new Error('boom')
    })
    const controller = createAudioPlaybackController({
      registry,
      AudioContextCtor: vi.fn(function AudioContext() {
        return ctx
      }) as unknown as typeof AudioContext,
      fetchImpl: vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => fakeWavBytes(),
      })) as unknown as typeof fetch,
    })
    await controller.activate()
    expect(() => controller.playCue('timer-expired')).not.toThrow()
  })

  it('cleanup stops sources and closes context; document owner is singular', async () => {
    const { ctx, sources } = createFakeAudioContext()
    const first = getDocumentAudioPlaybackController({
      registry,
      AudioContextCtor: vi.fn(function AudioContext() {
        return ctx
      }) as unknown as typeof AudioContext,
      fetchImpl: vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => fakeWavBytes(),
      })) as unknown as typeof fetch,
    })
    const second = getDocumentAudioPlaybackController()
    expect(second).toBe(first)
    await first.activate()
    first.playCue('game-complete')
    first.dispose()
    expect(sources[0]?.stop).toHaveBeenCalled()
    expect(ctx.close).toHaveBeenCalled()
  })
})
