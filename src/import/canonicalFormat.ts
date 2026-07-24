/**
 * The canonical Classroom Quiz Show game-file format (Slice 4).
 *
 * A game file is a single JSON **object** with an explicit format identity and
 * an explicit schema version. Discrimination is by these two fields only —
 * there is NO shape guessing, no "best effort" version detection, and no silent
 * upgrade or downgrade.
 *
 * ```jsonc
 * {
 *   "format": "classroom-quiz-show/game",   // exact string; identifies the format
 *   "schemaVersion": 1,                     // exact integer; the only supported version
 *   "id": "sample-foundation-game",         // stable, supplied game id
 *   "title": "Foundation Sample Game",      // authored/public title
 *   "rounds": [                             // ordered; array order IS round order
 *     {
 *       "id": "round-1",                    // stable, supplied round id (unique in file)
 *       "type": "placeholder",              // must be a REGISTERED round type
 *       "title": "Round One",
 *       "config": { "note": "…" }           // type-specific, data-only config
 *     }
 *   ]
 * }
 * ```
 *
 * **Unknown-key policy: STRICT.** Every object in the canonical document is
 * validated with a strict Zod object, so an unknown or misspelled key is a hard
 * error rather than a silently dropped field. The one exception is a round's
 * `config`, whose permitted keys are decided by the round type's own schema
 * supplied by the registry — which is itself strict for the built-in type.
 *
 * **Identifiers are supplied, not generated.** `id` fields come from the
 * imported document and are validated; the pipeline never invents, rewrites, or
 * de-duplicates an id (that would be silent repair — see ADR-004).
 */

/** Exact top-level `format` value. Anything else fails at the `format` stage. */
export const CANONICAL_GAME_FILE_FORMAT = 'classroom-quiz-show/game'

/** The only `schemaVersion` this build implements and tests. */
export const SUPPORTED_SCHEMA_VERSION = 1

/**
 * Every schema version this build actually supports. There is exactly one: no
 * migrations are implemented, so no other version can be accepted. A future
 * migration layer would add a version here only alongside a real, tested
 * migration — never as a speculative "probably compatible" entry.
 */
export const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [SUPPORTED_SCHEMA_VERSION]

/**
 * Modest size guard for the JSON *text* transport (characters, not bytes). It
 * exists so a pathological paste cannot make `JSON.parse` allocate without
 * bound. It is deliberately generous: a classroom game file is kilobytes.
 */
export const MAX_IMPORT_TEXT_LENGTH = 1_000_000

/** Maximum object/array nesting depth accepted anywhere in the document. */
export const MAX_DOCUMENT_DEPTH = 16

/** Maximum number of rounds in one game file. */
export const MAX_ROUNDS = 100

/** Maximum length of any authored title. */
export const MAX_TITLE_LENGTH = 200

/** Maximum length of any identifier (`id`, round `type`). */
export const MAX_ID_LENGTH = 64

/**
 * Identifier grammar for `id` fields: starts alphanumeric, then alphanumerics,
 * dot, underscore, or hyphen. Deliberately conservative so ids stay safe to use
 * in URLs, filenames, and DOM keys, and so whitespace-only ids cannot sneak in.
 */
export const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/**
 * Round-type grammar: lower-case kebab identifiers (e.g. `placeholder`,
 * `category-board`). Matching the convention used by the built-in registry.
 */
export const ROUND_TYPE_PATTERN = /^[a-z0-9][a-z0-9-]*$/
