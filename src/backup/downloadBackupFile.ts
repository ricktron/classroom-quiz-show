/**
 * Browser download adapter for backup files (S04C-H3).
 * Mirrors downloadGameFile: pure builders never call DOM APIs.
 *
 * BACKUP_MIME is wired into the Blob type for download only. Import trust
 * never uses MIME, filename, or extension — parseBackupFromJsonText remains
 * the fail-closed authority.
 */

import { BACKUP_MIME } from './constants'
import type { DownloadEnvironment } from '../export/downloadGameFile'
import { downloadGameFile } from '../export/downloadGameFile'

export interface DownloadBackupInput {
  readonly filename: string
  readonly text: string
}

export function downloadBackupFile(
  input: DownloadBackupInput,
  environment?: DownloadEnvironment,
): void {
  downloadGameFile(
    {
      filename: input.filename,
      text: input.text,
      mimeType: BACKUP_MIME,
    },
    environment,
  )
}
