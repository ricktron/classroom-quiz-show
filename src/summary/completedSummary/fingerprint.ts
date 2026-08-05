import { exportGameDefinition } from '../../export/exportGame'
import type { GameDefinition } from '../../game/gameDefinition'

export type GameDefinitionFingerprintResultV1 =
  | { readonly status: 'success'; readonly sha256: string }
  | { readonly status: 'failure'; readonly message: string }

export async function fingerprintGameDefinitionV1(
  definition: unknown,
): Promise<GameDefinitionFingerprintResultV1> {
  try {
    const exported = exportGameDefinition(definition)
    if (exported.status !== 'success') {
      return {
        status: 'failure',
        message: 'The game definition could not be canonically exported for fingerprinting.',
      }
    }
    const subtle = globalThis.crypto?.subtle
    if (subtle === undefined) {
      return { status: 'failure', message: 'Web Crypto SHA-256 is unavailable.' }
    }
    const bytes = new TextEncoder().encode(exported.jsonText)
    const digest = await subtle.digest('SHA-256', bytes)
    const sha256 = [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
    if (!/^[0-9a-f]{64}$/.test(sha256)) {
      return { status: 'failure', message: 'SHA-256 returned an invalid digest.' }
    }
    return { status: 'success', sha256 }
  } catch {
    return { status: 'failure', message: 'The game definition fingerprint could not be computed.' }
  }
}

export type FingerprintableGameDefinition = GameDefinition
