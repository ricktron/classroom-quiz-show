/**
 * Teacher-initiated clipboard write for the diagnostic report.
 *
 * Uses platform capabilities already available in the Host document.
 * No dependency. No network. Failure returns 'failed' without claiming success.
 *
 * Order: async Clipboard API, then a same-document `execCommand('copy')`
 * fallback (needed in some Electron renderer permission contexts).
 */
export type DiagnosticCopyResult = 'copied' | 'failed'

export async function copyDiagnosticText(text: string): Promise<DiagnosticCopyResult> {
  if (typeof navigator !== 'undefined') {
    const clipboard = navigator.clipboard
    if (clipboard && typeof clipboard.writeText === 'function') {
      try {
        await clipboard.writeText(text)
        return 'copied'
      } catch {
        // Fall through — Electron and some locked-down contexts reject writeText.
      }
    }
  }
  return copyViaExecCommand(text)
}

function copyViaExecCommand(text: string): DiagnosticCopyResult {
  if (typeof document === 'undefined') return 'failed'
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.setAttribute('aria-hidden', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  try {
    const ok = document.execCommand('copy')
    return ok ? 'copied' : 'failed'
  } catch {
    return 'failed'
  } finally {
    document.body.removeChild(textarea)
  }
}
