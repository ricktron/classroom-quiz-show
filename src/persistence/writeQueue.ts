import { persistenceErr, persistenceOk, type PersistenceResult } from './results'

/**
 * Serializes async persistence writes.
 *
 * The active-session path also uses a generation counter: every enqueue receives
 * a newer generation, and a stale task can detect it before touching storage.
 */
export class PersistenceWriteQueue {
  private tail: Promise<void> = Promise.resolve()
  private activeSessionGeneration = 0

  nextActiveSessionGeneration(): number {
    this.activeSessionGeneration += 1
    return this.activeSessionGeneration
  }

  isLatestActiveSessionGeneration(generation: number): boolean {
    return generation === this.activeSessionGeneration
  }

  enqueue<T>(work: () => Promise<PersistenceResult<T>>): Promise<PersistenceResult<T>> {
    const run = this.tail.then(work, work)
    this.tail = run.then(
      () => undefined,
      () => undefined,
    )
    return run.catch(() =>
      persistenceErr('internal', 'The persistence write queue failed unexpectedly.'),
    )
  }
}

export function createPersistenceWriteQueue(): PersistenceWriteQueue {
  return new PersistenceWriteQueue()
}

export function skippedStaleWrite(): PersistenceResult<void> {
  return persistenceOk(undefined)
}
