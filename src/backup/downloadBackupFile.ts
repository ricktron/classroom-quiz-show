/**
 * Browser download adapter for backup files (S04C-H3).
 * Mirrors downloadGameFile: pure builders never call DOM APIs.
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
  // Reuse the injectable download boundary; MIME remains application/json.
  void BACKUP_MIME
  downloadGameFile(input, environment)
}
