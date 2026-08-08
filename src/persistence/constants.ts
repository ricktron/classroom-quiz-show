export const PERSISTENCE_DB_NAME = 'classroom-quiz-show-persistence'
export const PERSISTENCE_DB_VERSION = 3

export const OBJECT_STORE_SAVED_DEFINITIONS = 'savedDefinitions'
export const OBJECT_STORE_ACTIVE_SESSIONS = 'activeSessions'
export const OBJECT_STORE_COORDINATION = 'coordination'
export const OBJECT_STORE_COMPLETED_SUMMARIES = 'completedSummaries'
export const OBJECT_STORE_PACK_MEDIA_ASSETS = 'packMediaAssets'

export const ACTIVE_SESSION_KEY = 'current'

export const HOST_WRITER_LEASE_KEY = 'host-writer'
export const HOST_WRITER_LEASE_TTL_MS = 4000

/** Host-private active pack resource-scope pointer for same-origin display hydration. */
export const ACTIVE_PACK_RESOURCE_SCOPE_KEY = 'active-pack-resource-scope'

export const PERSISTENCE_WIRE_FORMAT = 'classroom-quiz-show/persistence-session'
export const PERSISTENCE_WIRE_VERSION = 1

export const COORDINATION_BROADCAST_CHANNEL =
  'classroom-quiz-show:persistence-coordination:v1'

/** Same-origin channel announcing the active pack resource scope (scope key only). */
export const PACK_MEDIA_SCOPE_BROADCAST_CHANNEL =
  'classroom-quiz-show:pack-media-scope:v1'

export const SAVED_DEFINITION_RECORD_VERSION = 1
