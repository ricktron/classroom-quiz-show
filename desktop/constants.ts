/**
 * Durable desktop-shell constants.
 *
 * The Electron main process may own native windows, the custom origin, HID
 * permission mediation, and packaging identity. It must not own gameplay,
 * scoring, persistence authority, Gamepad polling, Sony keep-alive, or import
 * validation. See ADR-021.
 */

/** Stable custom-scheme origin used as the production desktop renderer origin. */
export const DESKTOP_PROTOCOL_SCHEME = 'cqs'
export const DESKTOP_PROTOCOL_HOST = 'app'
export const DESKTOP_ORIGIN = `${DESKTOP_PROTOCOL_SCHEME}://${DESKTOP_PROTOCOL_HOST}`

/** Hash routes served inside the existing React/Vite application. */
export const DESKTOP_HOST_HASH = '#/host'
export const DESKTOP_DISPLAY_HASH = '#/display'

export const DESKTOP_HOST_ENTRY_URL = `${DESKTOP_ORIGIN}/index.html${DESKTOP_HOST_HASH}`
export const DESKTOP_DISPLAY_ENTRY_URL = `${DESKTOP_ORIGIN}/index.html${DESKTOP_DISPLAY_HASH}`

/**
 * Exact Sony Buzz USB ids for HID permission mediation.
 *
 * Must remain identical to the in-app supported profile
 * `cqs.sony-buzz.namtai-wbuzz-wireless.v1` (Namtai wireless Wbuzz 054c:1000).
 * Do not broaden. Unit tests assert equality with the renderer constants.
 */
export const DESKTOP_SONY_VENDOR_ID = 0x054c
export const DESKTOP_SONY_PRODUCT_ID = 0x1000

/** Named window used by the existing Host "Open display in new window" action. */
export const DESKTOP_DISPLAY_WINDOW_NAME = 'quiz-show-display'

export const DESKTOP_HOST_WINDOW_TITLE = 'Classroom Quiz Show'
export const DESKTOP_DISPLAY_WINDOW_TITLE = 'Classroom Quiz Show — Display'
