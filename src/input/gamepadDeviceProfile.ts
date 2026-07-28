import type { GamepadControllerSnapshot, GamepadReportedId } from './gamepadSource'

/**
 * Host-private device PROFILE classification (Slice 10).
 *
 * Pure, application-owned, and deliberately weak: a match against primary-source
 * USB vendor/product facts is a **candidate**, never compatibility proof. Absence
 * of those tokens does not prove the device is *not* a Sony Buzz controller.
 * Name-only strings ("Sony", "Buzz", "Hub", …) are never enough.
 *
 * Nothing here is persisted, exported, synced, or projected. Classification never
 * enters {@link import('./gamepadMapping').GamepadMapping}, a command, an event,
 * private gameplay state, or `PublicState`.
 *
 * ## Primary-source USB facts used for candidate detection
 *
 * - Sony vendor ID: `054c`
 * - Wired Buzz product ID: `0002`
 * - Wireless Buzz product ID: `1000`
 *
 * The exact `Gamepad.id` format is unspecified across browsers and OS versions.
 * Detection therefore looks for those hex tokens as **standalone hex words**
 * inside the bounded reported id, not for a single assumed string shape.
 */

/** Sony USB vendor id (primary source). */
export const SONY_USB_VENDOR_ID = '054c'

/** Wired Sony Buzz! USB product id (primary source). */
export const SONY_BUZZ_WIRED_PRODUCT_ID = '0002'

/** Wireless Sony Buzz! USB product id (primary source). */
export const SONY_BUZZ_WIRELESS_PRODUCT_ID = '1000'

/**
 * Every classification this build can emit. Bounded and typed.
 *
 * No member means "supported", "compatible", "certified", "validated", or
 * "guaranteed". Candidate is the strongest positive claim allowed before owner
 * physical validation.
 */
export const GAMEPAD_DEVICE_CLASSIFICATIONS = [
  'candidate-sony-buzz-wired',
  'candidate-sony-buzz-wireless',
  'unrecognized',
  'identity-unavailable',
] as const

export type GamepadDeviceClassification = (typeof GAMEPAD_DEVICE_CLASSIFICATIONS)[number]

/** Host-facing label for a classification. Host-only copy — never projected. */
export const GAMEPAD_DEVICE_CLASSIFICATION_LABEL: Readonly<
  Record<GamepadDeviceClassification, string>
> = {
  'candidate-sony-buzz-wired': 'Candidate Sony Buzz! (wired USB ids)',
  'candidate-sony-buzz-wireless': 'Candidate Sony Buzz! (wireless USB ids)',
  unrecognized: 'Unrecognized controller',
  'identity-unavailable': 'Controller identity unavailable',
}

/**
 * Calm host copy distinguishing each classification.
 *
 * Explicitly refuses supported-hardware language. Candidate is evidence from USB
 * ids in the browser string, not a physical validation result.
 */
export const GAMEPAD_DEVICE_CLASSIFICATION_MESSAGE: Readonly<
  Record<GamepadDeviceClassification, string>
> = {
  'candidate-sony-buzz-wired':
    'This controller’s reported identifier includes the primary-source Sony wired Buzz! USB vendor and product ids. That is a candidate match only — not proof the hardware works here. Owner physical checks are still required.',
  'candidate-sony-buzz-wireless':
    'This controller’s reported identifier includes the primary-source Sony wireless Buzz! USB vendor and product ids. That is a candidate match only — not proof the hardware works here. Owner physical checks are still required.',
  unrecognized:
    'This controller’s reported identifier does not include the primary-source Sony Buzz! USB vendor and product ids. It may still be usable through manual button assignment. Keyboard buzzing remains available.',
  'identity-unavailable':
    'This controller did not report a usable identifier, so it cannot be classified. Manual button assignment and keyboard buzzing remain available.',
}

/** Words that must NEVER appear in classification labels or messages. */
const FORBIDDEN_CLAIM_WORDS = [
  'supported',
  'compatible',
  'certified',
  'validated',
  'guaranteed',
] as const

/**
 * Structural guard: classification copy must not claim hardware support.
 *
 * Exported so tests can assert the vocabulary stays honest as copy evolves.
 */
export function classificationCopyClaimsSupport(text: string): boolean {
  const lower = text.toLowerCase()
  return FORBIDDEN_CLAIM_WORDS.some((word) => lower.includes(word))
}

/**
 * Classify one host-private reported id.
 *
 * Rules:
 * - unavailable / empty → `identity-unavailable`;
 * - standalone hex tokens `054c` + `0002` → wired candidate;
 * - standalone hex tokens `054c` + `1000` → wireless candidate;
 * - if both product ids appear with the vendor, wired wins (more specific product
 *   first in the primary-source table order used here is wired, then wireless —
 *   actually if both appear it's ambiguous; fail closed to unrecognized? Or prefer
 *   the first match found). Prefer: if wired product present with vendor → wired;
 *   else if wireless product with vendor → wireless; else unrecognized.
 * - a string that merely contains "Sony", "Buzz", "Hub", "Logitech", or
 *   "joystick" without the VID/PID tokens → `unrecognized`.
 */
export function classifyGamepadReportedId(reportedId: GamepadReportedId): GamepadDeviceClassification {
  if (reportedId.status !== 'available') return 'identity-unavailable'
  const tokens = hexTokenSet(reportedId.value)
  if (!tokens.has(SONY_USB_VENDOR_ID)) return 'unrecognized'
  if (tokens.has(SONY_BUZZ_WIRED_PRODUCT_ID)) return 'candidate-sony-buzz-wired'
  if (tokens.has(SONY_BUZZ_WIRELESS_PRODUCT_ID)) return 'candidate-sony-buzz-wireless'
  return 'unrecognized'
}

/** Classify one controller observation. */
export function classifyGamepadController(
  controller: Pick<GamepadControllerSnapshot, 'reportedId'>,
): GamepadDeviceClassification {
  return classifyGamepadReportedId(controller.reportedId)
}

/**
 * Extract standalone hexadecimal words from an untrusted identifier.
 *
 * "Standalone" means a run of hex digits bounded by non-hex characters (or the
 * string edges). That accepts common browser shapes such as
 * `Vendor: 054c Product: 0002`, `054c-0002-…`, and `054c:0002` without treating a
 * longer hex blob that merely *contains* those digits as a match.
 */
function hexTokenSet(value: string): ReadonlySet<string> {
  const tokens = new Set<string>()
  const pattern = /[0-9a-f]+/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(value)) !== null) {
    tokens.add(match[0].toLowerCase())
  }
  return tokens
}
