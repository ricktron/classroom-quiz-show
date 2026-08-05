import { describe, expect, it } from 'vitest'
import { fingerprintGameDefinitionV1 } from './fingerprint'
import { completedHistory } from './testHistory'

describe('fingerprintGameDefinitionV1', () => {
  it('hashes the canonical exported UTF-8 bytes as lowercase SHA-256', async () => {
    const { definition } = completedHistory()
    const first = await fingerprintGameDefinitionV1(definition)
    const second = await fingerprintGameDefinitionV1(definition)
    expect(first).toEqual(second)
    expect(first.status).toBe('success')
    if (first.status === 'success') {
      expect(first.sha256).toMatch(/^[0-9a-f]{64}$/)
    }
  })

  it('fails closed for an invalid definition', async () => {
    await expect(fingerprintGameDefinitionV1({})).resolves.toMatchObject({
      status: 'failure',
    })
  })
})
