import { describe, expect, it } from 'vitest'
import { INITIAL_PUBLIC_STATE, type PublicState } from '../state/publicState'
import {
  SYNC_PROTOCOL,
  SYNC_SCHEMA_VERSION,
  decodeEnvelope,
  encodeEnvelope,
} from './protocol'

const validPublicState: PublicState = { ...INITIAL_PUBLIC_STATE, revision: 3 }

describe('encode/decode round-trip', () => {
  it('accepts a valid public-state envelope', () => {
    const encoded = encodeEnvelope({ type: 'public-state', revision: 3, payload: validPublicState })
    const decoded = decodeEnvelope(encoded)
    expect(decoded.ok).toBe(true)
    if (decoded.ok && decoded.message.type === 'public-state') {
      expect(decoded.message.revision).toBe(3)
      expect(decoded.message.payload).toEqual(validPublicState)
    }
  })

  it('accepts a valid request-state envelope', () => {
    const decoded = decodeEnvelope(encodeEnvelope({ type: 'request-state' }))
    expect(decoded).toEqual({ ok: true, message: { type: 'request-state' } })
  })
})

describe('decodeEnvelope — fail closed', () => {
  it('rejects a non-object', () => {
    expect(decodeEnvelope('nope')).toEqual({ ok: false, reason: 'not-an-object' })
    expect(decodeEnvelope(null)).toEqual({ ok: false, reason: 'not-an-object' })
  })

  it('rejects foreign / wrong-protocol traffic', () => {
    expect(decodeEnvelope({ protocol: 'someone-else', schemaVersion: 1, message: {} })).toEqual({
      ok: false,
      reason: 'wrong-protocol',
    })
  })

  it('rejects an unknown schema version', () => {
    expect(
      decodeEnvelope({
        protocol: SYNC_PROTOCOL,
        schemaVersion: SYNC_SCHEMA_VERSION + 1,
        message: { type: 'request-state' },
      }),
    ).toEqual({ ok: false, reason: 'unsupported-version' })
  })

  it('rejects an unknown message type', () => {
    expect(
      decodeEnvelope({
        protocol: SYNC_PROTOCOL,
        schemaVersion: SYNC_SCHEMA_VERSION,
        message: { type: 'take-over-as-host' },
      }),
    ).toEqual({ ok: false, reason: 'unknown-type' })
  })

  it('rejects a public-state message with a malformed payload', () => {
    expect(
      decodeEnvelope({
        protocol: SYNC_PROTOCOL,
        schemaVersion: SYNC_SCHEMA_VERSION,
        message: { type: 'public-state', revision: 1, payload: { schemaVersion: 999 } },
      }),
    ).toEqual({ ok: false, reason: 'malformed-payload' })
  })

  it('rejects a public-state message with a non-numeric revision', () => {
    expect(
      decodeEnvelope({
        protocol: SYNC_PROTOCOL,
        schemaVersion: SYNC_SCHEMA_VERSION,
        message: { type: 'public-state', revision: 'soon', payload: validPublicState },
      }),
    ).toEqual({ ok: false, reason: 'malformed-payload' })
  })

  it('never throws on arbitrary garbage', () => {
    for (const junk of [undefined, 42, [], { message: 7 }, { protocol: SYNC_PROTOCOL }]) {
      expect(() => decodeEnvelope(junk)).not.toThrow()
      expect(decodeEnvelope(junk).ok).toBe(false)
    }
  })
})
