/**
 * Closed, application-owned theme registry (Slice 17).
 *
 * Theme IDs are exact, case-sensitive membership only. Imported content can never
 * supply a theme, CSS, token, selector, class, URL, gradient, or animation.
 * Unknown or hostile candidates resolve to `default`.
 */

export const THEME_IDS = ['default', 'high-contrast'] as const
export type ThemeId = (typeof THEME_IDS)[number]
export const DEFAULT_THEME_ID: ThemeId = 'default'

const THEME_ID_SET: ReadonlySet<string> = new Set(THEME_IDS)

export type ThemeMeta = {
  readonly id: ThemeId
  readonly label: string
}

/** Stable visible labels for the host selector. */
export const THEME_META: readonly ThemeMeta[] = [
  { id: 'default', label: 'Default' },
  { id: 'high-contrast', label: 'High contrast' },
] as const

export function isThemeId(candidate: unknown): candidate is ThemeId {
  return typeof candidate === 'string' && THEME_ID_SET.has(candidate)
}

/**
 * Resolve any candidate to an authorized theme ID.
 * Exact membership only — no trim, case fold, aliases, or fuzzy match.
 */
export function resolveThemeId(candidate: unknown): ThemeId {
  return isThemeId(candidate) ? candidate : DEFAULT_THEME_ID
}

/**
 * Theme-dependent custom-property names that every authorized theme block must
 * declare. Shared structural scales (fonts, spacing steps, durations) live on
 * `:root` and are intentionally excluded.
 */
export const THEME_DEPENDENT_TOKEN_NAMES = [
  '--surface-shell',
  '--surface-canvas',
  '--surface-base',
  '--surface-raised',
  '--surface-recessed',
  '--surface-host',
  '--surface-projector',
  '--surface-board',
  '--surface-tile',
  '--surface-tile-selected',
  '--surface-question',
  '--surface-tile-used',
  '--surface-cleared',
  '--surface-overlay',
  '--surface-scrim',
  '--surface-dialog',
  '--surface-input',
  '--surface-disabled',
  '--fg-primary',
  '--fg-secondary',
  '--fg-muted',
  '--fg-strong',
  '--fg-inverse',
  '--fg-interactive',
  '--fg-disabled',
  '--fg-on-accent',
  '--fg-on-accent-fill',
  '--fg-on-danger',
  '--fg-on-success',
  '--fg-on-warning',
  '--fg-score',
  '--fg-score-negative',
  '--fg-timer',
  '--fg-question',
  '--border-subtle',
  '--border-standard',
  '--border-strong',
  '--border-selected',
  '--border-focus',
  '--border-board-grid',
  '--border-tile',
  '--border-panel',
  '--border-active',
  '--border-waiting',
  '--border-disabled',
  '--bs-waiting',
  '--bs-used',
  '--state-accent',
  '--state-accent-strong',
  '--state-accent-fill-hover',
  '--state-structural',
  '--state-host',
  '--state-host-wash',
  '--state-active',
  '--state-waiting',
  '--state-selected',
  '--state-success',
  '--state-success-wash',
  '--state-warning',
  '--state-warning-wash',
  '--state-danger',
  '--state-danger-wash',
  '--state-dormant',
  '--state-cleared',
  '--state-winner',
  '--state-tie',
  '--state-timer-normal',
  '--state-timer-urgent',
  '--state-expired',
  '--team-crimson',
  '--team-azure',
  '--team-emerald',
  '--team-amber',
  '--team-violet',
  '--team-teal',
  '--team-rose',
  '--team-slate',
  '--shadow-surface',
  '--shadow-elevated',
  '--edge-board',
  '--edge-tile',
  '--edge-selected',
  '--glow-active',
  '--opacity-scrim',
  '--opacity-lattice',
  '--bw-standard',
  '--bw-strong',
  '--bw-emphasis',
  '--focus-width',
  '--accent-bar-height',
] as const

export type ThemeDependentTokenName = (typeof THEME_DEPENDENT_TOKEN_NAMES)[number]
