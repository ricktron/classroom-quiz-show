import { describe, expect, it } from 'vitest'
import { PUBLIC_STATE_SCHEMA_VERSION } from '../state/publicState'
import { SYNC_SCHEMA_VERSION } from '../sync/protocol'
import { SUPPORTED_SCHEMA_VERSION } from '../import/canonicalFormat'
import { PERSISTENCE_DB_VERSION, PERSISTENCE_WIRE_VERSION } from '../persistence/constants'
import { PRIVATE_STATE_SCHEMA_VERSION } from '../state/privateState'
import { SESSION_SUMMARY_CONTRACT_VERSION } from '../summary/contract'
import {
  COMPLETED_SUMMARY_RECORD_VERSION,
  COMPETITIVE_PROFILE_VERSION,
} from '../summary/completedSummary/constants'
import { TEAM_ACCENTS } from '../game/teams/accents'
import { THEME_IDS, resolveThemeId } from './themeRegistry'

/**
 * Slice 17 invariant proofs: theme stays out of schema/wire/storage/events,
 * accents are not themes, and contract versions remain unchanged.
 */

describe('Slice 17 isolation invariants', () => {
  it('keeps registry IDs exactly two and accents out of the registry', () => {
    expect([...THEME_IDS]).toEqual(['default', 'high-contrast'])
    for (const accent of TEAM_ACCENTS) {
      expect((THEME_IDS as readonly string[]).includes(accent)).toBe(false)
      expect(resolveThemeId(accent)).toBe('default')
    }
  })

  it('preserves schema, wire, sync, persistence, and summary contract versions', () => {
    expect(SUPPORTED_SCHEMA_VERSION).toBe(1)
    expect(PUBLIC_STATE_SCHEMA_VERSION).toBe(8)
    expect(SYNC_SCHEMA_VERSION).toBe(2)
    expect(PRIVATE_STATE_SCHEMA_VERSION).toBe(1)
    expect(PERSISTENCE_WIRE_VERSION).toBe(1)
    expect(PERSISTENCE_DB_VERSION).toBe(2)
    expect(SESSION_SUMMARY_CONTRACT_VERSION).toBe(1)
    expect(COMPLETED_SUMMARY_RECORD_VERSION).toBe(1)
    expect(COMPETITIVE_PROFILE_VERSION).toBe(1)
  })

  it('measures corrected opaque tile-edge contrast at approximately 3.63:1', () => {
    const lin = (c: number) => {
      const s = c / 255
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    const lum = (r: number, g: number, b: number) =>
      0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
    const ratio = (a: number[], b: number[]) => {
      const l1 = lum(a[0]!, a[1]!, a[2]!)
      const l2 = lum(b[0]!, b[1]!, b[2]!)
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    }
    // #35d6e8 on #0f5fb0 — binding correction supersedes translucent package edge.
    const measured = ratio([53, 214, 232], [15, 95, 176])
    expect(measured).toBeGreaterThan(3.5)
    expect(measured).toBeLessThan(3.8)
  })
})
