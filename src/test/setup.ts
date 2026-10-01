import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

/**
 * Vitest/jsdom + Node 22 native BroadcastChannel can throw
 * ERR_INVALID_ARG_TYPE on same-process MessageEvent delivery
 * (`MessageEvent` vs environment `Event`). Replace with an in-memory
 * hub that mirrors BroadcastChannel peer semantics for unit tests.
 * Browser / Playwright e2e still exercise the real channel.
 */
function installVitestBroadcastChannelPolyfill(): void {
  type Handler = (event: { data: unknown }) => void
  const hubs = new Map<string, Set<VitestBroadcastChannel>>()

  class VitestBroadcastChannel {
    onmessage: Handler | null = null
    private readonly listeners = new Set<Handler>()
    private closed = false
    private readonly channelName: string

    constructor(name: string) {
      this.channelName = name
      let peers = hubs.get(name)
      if (!peers) {
        peers = new Set()
        hubs.set(name, peers)
      }
      peers.add(this)
    }

    postMessage(data: unknown): void {
      if (this.closed) return
      const peers = hubs.get(this.channelName)
      if (!peers) return
      for (const peer of peers) {
        if (peer === this || peer.closed) continue
        const event = { data }
        peer.onmessage?.(event)
        for (const listener of [...peer.listeners]) listener(event)
      }
    }

    addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
      if (type !== 'message' || this.closed) return
      const handler: Handler =
        typeof listener === 'function'
          ? (listener as unknown as Handler)
          : (event) => listener.handleEvent(event as unknown as Event)
      this.listeners.add(handler)
    }

    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
      if (type !== 'message') return
      const handler: Handler =
        typeof listener === 'function'
          ? (listener as unknown as Handler)
          : (event) => listener.handleEvent(event as unknown as Event)
      this.listeners.delete(handler)
    }

    close(): void {
      if (this.closed) return
      this.closed = true
      this.listeners.clear()
      this.onmessage = null
      const peers = hubs.get(this.channelName)
      peers?.delete(this)
      if (peers && peers.size === 0) hubs.delete(this.channelName)
    }

    dispatchEvent(): boolean {
      return false
    }
  }

  ;(globalThis as unknown as { BroadcastChannel: typeof BroadcastChannel }).BroadcastChannel =
    VitestBroadcastChannel as unknown as typeof BroadcastChannel
}

installVitestBroadcastChannelPolyfill()

afterEach(() => {
  cleanup()
})
