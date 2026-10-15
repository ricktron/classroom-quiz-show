export const PERSISTENCE_DB_NAME = 'classroom-quiz-show-persistence'
export const PERSISTENCE_DB_VERSION = 4

export const OBJECT_STORE_SAVED_DEFINITIONS = 'savedDefinitions'
export const OBJECT_STORE_ACTIVE_SESSIONS = 'activeSessions'
export const OBJECT_STORE_COORDINATION = 'coordination'
export const OBJECT_STORE_COMPLETED_SUMMARIES = 'completedSummaries'
export const OBJECT_STORE_PACK_MEDIA_ASSETS = 'packMediaAssets'
/** Host-private Sony Buzz supported-profile team associations (Slice 21). */
export const OBJECT_STORE_SONY_BUZZ_MAPPINGS = 'sonyBuzzMappings'

export const ACTIVE_SESSION_KEY = 'current'

export const HOST_WRITER_LEASE_KEY = 'host-writer'
export const HOST_WRITER_LEASE_TTL_MS = 4000

/**
 * Per-browser-tab (per Electron window) lease identity that survives a reload
 * of the SAME tab. sessionStorage is tab-scoped; the value is claimed (removed)
 * while a document is live and stashed back only on pagehide, so a duplicated
 * tab or window.open copy never inherits a live window's identity.
 */
export const HOST_WINDOW_ID_SESSION_KEY = 'cqs:host-window-id:v1'

/**
 * Synchronous same-origin release marker written on pagehide by the window that
 * holds the writer lease. IndexedDB cannot commit synchronously during unload,
 * so this lets a reload or an Electron quit -> relaunch reclaim saving at once
 * instead of waiting out HOST_WRITER_LEASE_TTL_MS.
 */
export const HOST_WRITER_RELEASE_STORAGE_KEY = 'cqs:host-writer-released:v1'

/** Host-private active pack resource-scope pointer for same-origin display hydration. */
export const ACTIVE_PACK_RESOURCE_SCOPE_KEY = 'active-pack-resource-scope'

export const PERSISTENCE_WIRE_FORMAT = 'classroom-quiz-show/persistence-session'
export const PERSISTENCE_WIRE_VERSION = 1

export const COORDINATION_BROADCAST_CHANNEL =
  'classroom-quiz-show:persistence-coordination:v1'

/** Same-origin channel announcing the active pack resource scope (scope key only). */
export const PACK_MEDIA_SCOPE_BROADCAST_CHANNEL =
  'classroom-quiz-show:pack-media-scope:v1'

/**
 * Saved-definition record format. Version 2 adds optional authoring-draft JSON
 * and last-opened metadata. Version 1 records remain readable.
 */
export const SAVED_DEFINITION_RECORD_VERSION = 2
export const SUPPORTED_SAVED_DEFINITION_RECORD_VERSIONS = [1, 2] as const
