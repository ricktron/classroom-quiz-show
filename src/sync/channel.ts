/**
 * Transport abstraction over BroadcastChannel.
 *
 * A `SyncChannel` is the minimal surface the broadcaster/receiver need. Keeping
 * it small lets us:
 *   - back it with a real BroadcastChannel in the browser,
 *   - degrade to a safe no-op when BroadcastChannel is unavailable, and
 *   - substitute a deterministic in-memory hub in unit tests.
 *
 * BroadcastChannel delivers a message to every OTHER subscriber on the same
 * name within the same origin, but NOT back to the poster. The in-memory hub
 * mirrors that semantics so tests behave like the real thing.
 */
export interface SyncChannel {
  /** Post a structured-cloneable value to other subscribers. */
  post(data: unknown): void
  /** Subscribe to inbound messages. Returns an unsubscribe function. */
  subscribe(handler: (data: unknown) => void): () => void
  /** Release all resources. Idempotent. */
  close(): void
}

export function isBroadcastChannelSupported(): boolean {
  return typeof BroadcastChannel !== 'undefined'
}

/** A channel that drops everything. Used when the environment has no support. */
export function createNoopChannel(): SyncChannel {
  return {
    post() {},
    subscribe() {
      return () => {}
    },
    close() {},
  }
}

/**
 * Real BroadcastChannel-backed channel. If BroadcastChannel is unavailable, or
 * construction throws for any reason, this degrades to a no-op channel so the
 * host stays authoritative and the display stays in its safe waiting state.
 */
export function createBroadcastChannelTransport(
  name: string,
): SyncChannel {
  if (!isBroadcastChannelSupported()) return createNoopChannel()

  let channel: BroadcastChannel
  try {
    channel = new BroadcastChannel(name)
  } catch {
    return createNoopChannel()
  }

  const handlers = new Set<(data: unknown) => void>()
  const onMessage = (event: MessageEvent) => {
    for (const handler of [...handlers]) handler(event.data)
  }
  channel.addEventListener('message', onMessage)

  let closed = false
  return {
    post(data) {
      if (closed) return
      try {
        channel.postMessage(data)
      } catch {
        /* channel closing / non-cloneable — ignore, fail closed */
      }
    },
    subscribe(handler) {
      handlers.add(handler)
      return () => {
        handlers.delete(handler)
      }
    },
    close() {
      if (closed) return
      closed = true
      handlers.clear()
      channel.removeEventListener('message', onMessage)
      channel.close()
    },
  }
}

/**
 * Deterministic in-memory hub for tests. Every channel it creates shares one
 * message bus; posting delivers synchronously to the OTHER channels' handlers
 * (never the poster), matching BroadcastChannel semantics without real async.
 */
export function createMemoryChannelHub(): { createChannel(): SyncChannel } {
  interface Member {
    handlers: Set<(data: unknown) => void>
    closed: boolean
  }
  const members = new Set<Member>()

  return {
    createChannel() {
      const self: Member = { handlers: new Set(), closed: false }
      members.add(self)
      return {
        post(data) {
          if (self.closed) return
          for (const member of members) {
            if (member === self || member.closed) continue
            for (const handler of [...member.handlers]) handler(data)
          }
        },
        subscribe(handler) {
          self.handlers.add(handler)
          return () => {
            self.handlers.delete(handler)
          }
        },
        close() {
          self.closed = true
          self.handlers.clear()
          members.delete(self)
        },
      }
    },
  }
}
