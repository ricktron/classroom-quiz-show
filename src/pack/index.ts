export {
  PACK_EXTENSION,
  PACK_FORMAT,
  PACK_FORMAT_VERSION,
  PACK_MIME,
  GAME_ENTRY_PATH,
  MANIFEST_PATH,
  MEDIA_PREFIX,
} from './constants'

export {
  MAX_PACK_ENTRY_COUNT,
  MAX_PACK_GAME_BYTES,
  MAX_PACK_INPUT_BYTES,
  MAX_PACK_MANIFEST_BYTES,
  MAX_PACK_MEDIA_BYTES,
  MAX_PACK_MEDIA_COUNT,
  MAX_PACK_TOTAL_EXTRACTED_BYTES,
  MAX_PACK_TOTAL_MEDIA_BYTES,
} from './limits'

export {
  PACK_ISSUE_CODES,
  PACK_STAGES,
  packFailure,
  packIssue,
  sortPackIssues,
  type PackIssue,
  type PackIssueCode,
  type PackIssueContext,
  type PackStage,
} from './issues'

export { bytesToHex, sha256Hex } from './hash'
export { decodeUtf8Strict, encodeUtf8, Utf8DecodeError } from './utf8'

export {
  createPackPathTracker,
  isAllowedV1EntryPath,
  isGameEntryPath,
  isManifestPath,
  isMediaEntryPath,
  sourcePathFromPackMediaPath,
  toPackMediaPath,
  validatePackEntryPath,
  type PackPathTracker,
} from './paths'

export {
  isSupportedPackMediaType,
  sniffMediaBytes,
  type MediaSniffResult,
  type SniffedMediaType,
} from './mediaSniff'

export {
  inventoryPackMedia,
  inventorySourcePaths,
  type PackMediaInventoryEntry,
} from './mediaInventory'

export {
  buildManifest,
  buildManifestWithHashes,
  packManifestSchema,
  parseManifestJson,
  serializeManifest,
  type PackManifest,
  type PackManifestMediaEntry,
} from './manifest'

export { packZipEntryOrder, writePackZip, type PackZipEntries } from './zipWrite'
export { readPackZip, type ReadPackZipResult } from './zipRead'

export {
  createHostedMediaResolver,
  createRegistryMediaResolver,
  readResponseBodyBounded,
  registryFromAssets,
  type HostedMediaFetchEnv,
  type LocalMediaRegistry,
  type ResolveMediaBytes,
} from './acquireMedia'

export {
  browserDecodeImage,
  type BrowserDecodeImageEnv,
} from './browserDecodeImage'

export { resourceScopeKeyFromGameBytes, resourceScopeKeyFromGameText } from './resourceScope'

export {
  ensureDisplayPackMediaHydration,
  hydratePackRegistryFromActiveScope,
  publishActivePackResourceScope,
  readActivePackResourceScope,
  subscribePackScopeAnnouncements,
  type PackScopeAnnouncement,
} from './packMediaScopeSync'

export {
  hydratePackMediaForDefinition,
  hydratePackMediaForGameText,
  collectReferencedPackScopeKeys,
  type PackMediaHydrationOptions,
} from './hydratePackMedia'

export {
  commitPackMediaAssets,
  createPackAssetStorage,
  clearAllPackMediaAssets,
  deletePackMediaScope,
  gcUnreferencedPackScopes,
  listPackMediaScopeKeys,
  loadPackMediaAssets,
  packMediaStorageKey,
  type PackMediaAssetRecord,
} from './packMediaPersistence'

export {
  createPackResourceRegistry,
  getSharedPackResourceRegistry,
  setSharedPackResourceRegistryForTests,
  type PackResourceAsset,
  type PackResourceRegistry,
  type PackResourceRegistryEnv,
} from './resourceRegistry'

export {
  buildPackFromDefinition,
  type BuildPackOptions,
  type BuildPackResult,
  type DecodeImage,
} from './buildPack'

export {
  commitPackAssets,
  importPackFromBytes,
  type CommitPackAssetsInput,
  type ImportPackOptions,
  type ImportPackResult,
  type PackAssetStorage,
  type PackMediaAsset,
} from './importPack'

export {
  defaultPackFilename,
  downloadPackFile,
  type DownloadPackEnvironment,
  type DownloadPackInput,
} from './downloadPack'
