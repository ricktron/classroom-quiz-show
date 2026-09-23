/**
 * Unit tests for remount-safe semantic presentation acknowledgement.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  PRESENTATION_ACK_HOLD_MS,
  useSemanticPresentationAck,
} from './useSemanticPresentationAck'

describe('useSemanticPresentationAck', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('seeds first observation without acknowledging', () => {
    const { result } = renderHook(() => useSemanticPresentationAck('board'))
    expect(result.current.seeded).toBe(true)
    expect(result.current.changed).toBe(false)
  })

  it('acknowledges observed identity transition', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useSemanticPresentationAck(id),
      { initialProps: { id: 'board' as string | null } },
    )
    expect(result.current.changed).toBe(false)

    rerender({ id: 'selected:Cat:100' })
    expect(result.current.changed).toBe(true)

    act(() => {
      vi.advanceTimersByTime(PRESENTATION_ACK_HOLD_MS)
    })
    expect(result.current.changed).toBe(false)
  })

  it('does not restart acknowledgement for the same identity', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useSemanticPresentationAck(id),
      { initialProps: { id: 'board' as string | null } },
    )
    rerender({ id: 'selected:Cat:100' })
    expect(result.current.changed).toBe(true)

    rerender({ id: 'selected:Cat:100' })
    expect(result.current.changed).toBe(true)

    act(() => {
      vi.advanceTimersByTime(PRESENTATION_ACK_HOLD_MS)
    })
    expect(result.current.changed).toBe(false)

    rerender({ id: 'selected:Cat:100' })
    expect(result.current.changed).toBe(false)
  })

  it('rapid replacement transfers ownership to the newer identity', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) => useSemanticPresentationAck(id),
      { initialProps: { id: 'board' as string | null } },
    )
    rerender({ id: 'selected:A:100' })
    expect(result.current.changed).toBe(true)

    act(() => {
      vi.advanceTimersByTime(200)
    })
    rerender({ id: 'selected:B:200' })
    expect(result.current.changed).toBe(true)

    // Stale first hold must not clear the newer acknowledgement early.
    act(() => {
      vi.advanceTimersByTime(220)
    })
    expect(result.current.changed).toBe(true)

    act(() => {
      vi.advanceTimersByTime(PRESENTATION_ACK_HOLD_MS)
    })
    expect(result.current.changed).toBe(false)
  })

  it('clears acknowledgement when motion ownership yields', () => {
    const { result, rerender } = renderHook(
      ({ id, owns }: { id: string | null; owns: boolean }) =>
        useSemanticPresentationAck(id, { ownsMotion: owns }),
      { initialProps: { id: 'board' as string | null, owns: true } },
    )
    rerender({ id: 'selected:Cat:100', owns: true })
    expect(result.current.changed).toBe(true)

    rerender({ id: 'selected:Cat:100', owns: false })
    expect(result.current.changed).toBe(false)
  })

  it('respects custom shouldAcknowledge predicate', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string | null }) =>
        useSemanticPresentationAck(id, {
          shouldAcknowledge: (prev, next) =>
            !!prev?.startsWith('board:') && !!next?.startsWith('final:'),
        }),
      { initialProps: { id: 'board:board' as string | null } },
    )
    rerender({ id: 'board:selected' })
    expect(result.current.changed).toBe(false)

    rerender({ id: 'final:setup' })
    expect(result.current.changed).toBe(true)
  })
})
