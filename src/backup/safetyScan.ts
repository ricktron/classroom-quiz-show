import {
  MAX_BACKUP_DOCUMENT_DEPTH,
} from './constants'
import { backupIssue, type BackupIssue } from './issues'
import { UNSAFE_OBJECT_KEYS, isPlainRecord } from '../import/safetyScan'

const MAX_SCAN_ISSUES = 40

/**
 * Fail-closed safety scan for untrusted backup documents.
 * Mirrors the game-import safety posture: no silent repair.
 */
export function scanBackupDocument(root: unknown): readonly BackupIssue[] {
  const issues: BackupIssue[] = []
  const ancestors = new Set<object>()
  let truncated = false

  const push = (issue: BackupIssue): void => {
    if (issues.length >= MAX_SCAN_ISSUES) {
      truncated = true
      return
    }
    issues.push(issue)
  }

  function walk(value: unknown, path: string, depth: number): void {
    if (truncated) return
    if (depth > MAX_BACKUP_DOCUMENT_DEPTH) {
      push(
        backupIssue(
          'document-too-deep',
          'safety',
          path,
          'Backup document nests too deeply.',
        ),
      )
      return
    }

    if (value === null || typeof value === 'string' || typeof value === 'boolean') return
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        push(
          backupIssue(
            'non-finite-number',
            'safety',
            path,
            'Backup contains a non-finite number.',
          ),
        )
      }
      return
    }
    if (typeof value !== 'object') {
      push(
        backupIssue(
          'non-data-value',
          'safety',
          path,
          'Backup contains a non-JSON data value.',
        ),
      )
      return
    }

    if (ancestors.has(value)) {
      push(
        backupIssue(
          'cyclic-reference',
          'safety',
          path,
          'Backup contains a cyclic reference.',
        ),
      )
      return
    }

    if (Array.isArray(value)) {
      ancestors.add(value)
      for (let i = 0; i < value.length; i += 1) {
        walk(value[i], `${path}[${i}]`, depth + 1)
        if (truncated) break
      }
      ancestors.delete(value)
      return
    }

    if (!isPlainRecord(value)) {
      push(
        backupIssue(
          'non-data-value',
          'safety',
          path,
          'Backup contains a non-plain object.',
        ),
      )
      return
    }

    ancestors.add(value)
    for (const key of Object.keys(value)) {
      if (UNSAFE_OBJECT_KEYS.includes(key)) {
        push(
          backupIssue(
            'unsafe-object-key',
            'safety',
            path === '/' ? `/${key}` : `${path}/${key}`,
            `Unsafe object key “${key}” is not allowed in a backup.`,
          ),
        )
        continue
      }
      walk(value[key], path === '/' ? `/${key}` : `${path}/${key}`, depth + 1)
      if (truncated) break
    }
    ancestors.delete(value)
  }

  walk(root, '/', 0)
  if (truncated) {
    issues.push(
      backupIssue(
        'issues-truncated',
        'safety',
        '/',
        'Additional backup safety issues were truncated.',
      ),
    )
  }
  return issues
}
