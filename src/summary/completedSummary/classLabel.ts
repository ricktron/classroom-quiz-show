export const CLASS_LABEL_MAX_LENGTH = 80

export type ClassLabelValidation =
  | { readonly ok: true; readonly value: string | null }
  | { readonly ok: false; readonly message: string }

export function validateClassLabel(value: unknown): ClassLabelValidation {
  if (value === null) return { ok: true, value: null }
  if (typeof value !== 'string') {
    return { ok: false, message: 'Class label must be null or a string.' }
  }
  if (value.length === 0 || value.trim().length === 0) {
    return {
      ok: false,
      message: 'Class label must be null or a non-empty, non-whitespace string.',
    }
  }
  if (value.length > CLASS_LABEL_MAX_LENGTH) {
    return {
      ok: false,
      message: `Class label must be at most ${CLASS_LABEL_MAX_LENGTH} characters; it is not truncated.`,
    }
  }
  if (value !== value.trim()) {
    return {
      ok: false,
      message: 'Class label must not have leading or trailing whitespace; it is not trimmed.',
    }
  }
  return { ok: true, value }
}
