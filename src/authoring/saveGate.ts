/**
 * Serializes authoring persistence writes and drops stale generations.
 *
 * UI completion gating is not enough: a late IndexedDB transaction must not
 * replace a newer requested save.
 */

export interface GenerationWriteGate {
  readonly begin: () => number
  readonly latest: () => number
  readonly enqueue: <T>(
    generation: number,
    write: () => Promise<T>,
  ) => Promise<{ readonly skipped: true } | { readonly skipped: false; readonly value: T }>
}

export function createGenerationWriteGate(): GenerationWriteGate {
  let latest = 0
  let chain: Promise<unknown> = Promise.resolve()

  return {
    begin(): number {
      latest += 1
      return latest
    },
    latest(): number {
      return latest
    },
    enqueue<T>(generation: number, write: () => Promise<T>) {
      const run = chain.then(async () => {
        if (generation !== latest) return { skipped: true as const }
        return { skipped: false as const, value: await write() }
      })
      chain = run.then(
        () => undefined,
        () => undefined,
      )
      return run
    },
  }
}
