import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

/**
 * Vitest/jsdom + Node 22 native BroadcastChannel can throw
 * ERR_INVALID_ARG_TYPE on same-process MessageEvent delivery.
 * Replace with an in-memory hub for unit tests; Playwright e2e uses real BC.
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

    private toHandler(listener: EventListenerOrEventListenerObject): Handler {
      return typeof listener === 'function'
        ? (listener as unknown as Handler)
        : (event) => listener.handleEvent(event as unknown as Event)
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
      if (type === 'message' && !this.closed) this.listeners.add(this.toHandler(listener))
    }

    removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
      if (type === 'message') this.listeners.delete(this.toHandler(listener))
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
