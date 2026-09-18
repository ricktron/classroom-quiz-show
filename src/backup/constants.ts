/**
 * Backup interchange constants (S04C-H3).
 *
 * Teacher-facing aggregate backup of library Games + pack media.
 * Distinct from per-game `classroom-quiz-show/game` export and from
 * private active-session wire format.
 */

export const BACKUP_FORMAT = 'classroom-quiz-show/backup' as const
export const BACKUP_SCHEMA_VERSION = 1 as const
export const SUPPORTED_BACKUP_SCHEMA_VERSIONS = [BACKUP_SCHEMA_VERSION] as const

export const BACKUP_FILENAME = 'classroom-quiz-show.backup.json' as const
export const BACKUP_EXTENSION = '.backup.json' as const
export const BACKUP_MIME = 'application/json;charset=utf-8' as const

/**
 * Character-length guard for backup JSON text. Larger than a single game file
 * because a library may contain many games and base64 media.
 */
export const MAX_BACKUP_TEXT_LENGTH = 48 * 1024 * 1024

/** Soft structural caps — fail closed when exceeded. */
export const MAX_BACKUP_GAME_COUNT = 256
export const MAX_BACKUP_MEDIA_COUNT = 1024
export const MAX_BACKUP_DOCUMENT_DEPTH = 20

/** Maximum nesting depth scanned for safety (matches import order of magnitude). */
export const MAX_BACKUP_SINGLE_GAME_JSON_LENGTH = 1_000_000
export const MAX_BACKUP_DRAFT_JSON_LENGTH = 2_000_000
export const MAX_BACKUP_MEDIA_BYTES = 4 * 1024 * 1024
export const MAX_BACKUP_TOTAL_MEDIA_BYTES = 40 * 1024 * 1024
