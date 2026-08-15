import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/host/TeamNameSelectionBoard.css'), 'utf8')

describe('team-name selection presentation contract', () => {
  it('keeps long names wrapping and supports 1920 and 1280 projector widths', () => {
    expect(css).toContain('overflow-wrap: anywhere')
    expect(css).toContain('grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr))')
    expect(css).toContain('@media (max-width: 1280px)')
    expect(css).toContain('@media (max-width: 720px)')
  })

  it('does not communicate choice by color alone', () => {
    expect(css).toContain('.tnsb__ordinal')
    expect(css).toContain('.tnsb__choice--selected')
    expect(css).toContain('.tnsb__choice--subdued')
    expect(css).toContain("data-high-contrast='true'")
    expect(css).toContain("data-grayscale='true'")
    expect(css).toContain("data-reduced-motion='true'")
  })
})
