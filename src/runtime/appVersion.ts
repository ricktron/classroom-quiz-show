/**
 * Application version identity for teacher-facing surfaces.
 *
 * Kept in lockstep with `package.json` `version` (asserted by unit test).
 * Do not embed this string in desktop appId / productName (ADR-021 / desktop
 * identity invariants).
 */
export const CQS_APP_VERSION = '0.1.0' as const
