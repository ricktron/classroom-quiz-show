import { sha256Hex } from './hash'

/**
 * Deterministic pack resource scope from canonical game JSON bytes (Slice 19).
 *
 * The digest is host-private — not authored game identity and not public wire.
 */

export async function resourceScopeKeyFromGameBytes(gameBytes: Uint8Array): Promise<string> {
  return sha256Hex(gameBytes)
}

export async function resourceScopeKeyFromGameText(gameJsonText: string): Promise<string> {
  return resourceScopeKeyFromGameBytes(new TextEncoder().encode(gameJsonText))
}
