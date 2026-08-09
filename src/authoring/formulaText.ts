/**
 * Formula-injection-safe workbook text writes.
 *
 * Teacher/external text that begins with spreadsheet formula markers must remain
 * literal text cells, never executable formulas.
 */

const FORMULA_LEADERS = new Set(['=', '+', '-', '@', '\t', '\r'])

export function isFormulaLeadingText(value: string): boolean {
  if (value.length === 0) return false
  return FORMULA_LEADERS.has(value[0]!)
}

/**
 * SheetJS cell object for a literal string that must not become a formula.
 */
export function literalTextCell(value: string): { t: 's'; v: string; z?: string } {
  // SheetJS treats `t: 's'` string cells as literal text even when the value
  // begins with `=`, `+`, `-`, or `@`.
  return { t: 's', v: value }
}

export function cellLooksLikeFormula(cell: {
  readonly f?: unknown
  readonly F?: unknown
  readonly t?: unknown
  readonly v?: unknown
}): boolean {
  if (typeof cell.f === 'string' && cell.f.length > 0) return true
  if (typeof cell.F === 'string' && cell.F.length > 0) return true
  if (cell.t === 's' || typeof cell.v === 'string') {
    // A formula-typed cell is authoritative even if a cached value exists.
    return false
  }
  return false
}
