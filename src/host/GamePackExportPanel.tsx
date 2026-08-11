import { useEffect, useState } from 'react'
import type { GameDefinition } from '../game/gameDefinition'
import type { RoundRegistry } from '../game/registry'
import {
  buildPackFromDefinition,
  createHostedMediaResolver,
  downloadPackFile,
  getSharedPackResourceRegistry,
  packIssue,
  sniffMediaBytes,
  type DownloadPackEnvironment,
  type PackIssue,
  type PackResourceRegistry,
} from '../pack'
import type { ResolveMediaBytes } from '../pack/acquireMedia'
import { browserDecodeImage } from '../pack/browserDecodeImage'
import './GamePackExportPanel.css'

/**
 * Host-only portable-pack export surface (Slice 19).
 *
 * Captures the loaded definition synchronously, builds a self-contained pack,
 * and triggers download. JSON-only export remains on `GameExportPanel`.
 */

export interface GamePackExportPanelProps {
  readonly definition: GameDefinition | null
  readonly registry: RoundRegistry
  readonly packRegistry?: PackResourceRegistry
  readonly download?: typeof downloadPackFile
  readonly downloadEnvironment?: DownloadPackEnvironment
  readonly acquireMediaBytes?: ResolveMediaBytes
}

type PanelStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'success'; readonly filename: string }
  | { readonly kind: 'failure'; readonly issues: readonly PackIssue[] }
  | { readonly kind: 'download-failure'; readonly message: string }

const PRIVACY_WARNING =
  'Portable pack files contain answer keys, alternates, teacher notes, and embedded clue media. Keep them on the host side.'

const MEDIA_INCLUSION_NOTE =
  'This download includes embedded raster media referenced by the loaded game. Plain JSON export does not include image bytes.'

export function GamePackExportPanel({
  definition,
  registry,
  packRegistry = getSharedPackResourceRegistry(),
  download = downloadPackFile,
  downloadEnvironment,
  acquireMediaBytes,
}: GamePackExportPanelProps) {
  const [status, setStatus] = useState<PanelStatus>({ kind: 'idle' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setStatus({ kind: 'idle' })
  }, [definition])

  const loaded = definition !== null

  async function runExport(): Promise<void> {
    const captured = definition
    if (captured === null) return

    setBusy(true)
    try {
      const resolver =
        acquireMediaBytes ??
        createCombinedMediaResolver(packRegistry, import.meta.env.BASE_URL || '/')

      const built = await buildPackFromDefinition(captured, {
        registry,
        acquireMediaBytes: resolver,
        decodeImage: browserDecodeImage,
      })

      if (built.status !== 'success') {
        setStatus({ kind: 'failure', issues: built.issues })
        return
      }

      try {
        if (downloadEnvironment) {
          download({ filename: built.filename, bytes: built.bytes }, downloadEnvironment)
        } else {
          download({ filename: built.filename, bytes: built.bytes })
        }
        setStatus({ kind: 'success', filename: built.filename })
      } catch {
        setStatus({
          kind: 'download-failure',
          message: 'The pack file was prepared but the browser download failed.',
        })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="pack-export" aria-labelledby="pack-export-title">
      <h3 id="pack-export-title">Export portable pack file</h3>
      <p className="host__note">
        Download the loaded game as a self-contained <code>.cqs-pack</code> archive with embedded
        media. Use plain JSON export when you only need the game definition.
      </p>

      {!loaded ? (
        <p className="host__note" data-testid="pack-export-no-game">
          No game loaded.
        </p>
      ) : (
        <>
          <dl className="foundation__kv" aria-label="Pack export game summary">
            <dt>game title</dt>
            <dd data-testid="pack-export-game-title">{definition.title}</dd>
            <dt>game id</dt>
            <dd data-testid="pack-export-game-id">{definition.id}</dd>
          </dl>
          <p className="host__note pack-export__warning" data-testid="pack-export-privacy-warning">
            {PRIVACY_WARNING}
          </p>
          <p className="host__note" data-testid="pack-export-media-note">
            {MEDIA_INCLUSION_NOTE}
          </p>
        </>
      )}

      <div className="pack-export__actions">
        <button
          type="button"
          className="btn"
          data-testid="pack-export-download"
          disabled={!loaded || busy}
          onClick={() => void runExport()}
        >
          Download pack file
        </button>
      </div>

      <div className="foundation__panel" aria-label="Pack export status" aria-live="polite">
        <h4>Pack export status (host-only)</h4>
        <PackExportStatus status={status} />
      </div>
    </section>
  )
}

function PackExportStatus({ status }: { readonly status: PanelStatus }) {
  if (status.kind === 'idle') {
    return (
      <p className="host__note" data-testid="pack-export-result">
        No pack export attempted yet.
      </p>
    )
  }

  if (status.kind === 'success') {
    return (
      <div className="pack-export__result pack-export__result--ok" data-testid="pack-export-result">
        <p className="pack-export__headline">Pack export ready: {status.filename}</p>
      </div>
    )
  }

  if (status.kind === 'download-failure') {
    return (
      <div className="pack-export__result pack-export__result--bad" data-testid="pack-export-result">
        <p className="pack-export__headline">Download failed</p>
        <p className="host__note">{status.message}</p>
      </div>
    )
  }

  return (
    <div className="pack-export__result pack-export__result--bad" data-testid="pack-export-result">
      <p className="pack-export__headline">
        Pack export failed ({status.issues.length}{' '}
        {status.issues.length === 1 ? 'problem' : 'problems'}).
      </p>
      <ol className="pack-export__issues" data-testid="pack-export-issues">
        {status.issues.map((issue, index) => (
          <li key={`${issue.code}-${issue.path}-${index}`} className="pack-export__issue">
            <code className="pack-export__issue-code">{issue.code}</code>
            {issue.path.length > 0 && <code className="pack-export__issue-path">{issue.path}</code>}
            <span className="pack-export__issue-message">{issue.message}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function createCombinedMediaResolver(
  packRegistry: PackResourceRegistry,
  baseUrl: string,
): ResolveMediaBytes {
  const hosted = createHostedMediaResolver({ baseUrl, fetch: globalThis.fetch.bind(globalThis) })
  return async (sourcePath) => {
    const bytes = packRegistry.resolveBytes(sourcePath)
    if (bytes !== null) {
      if (bytes.length > 0) {
        const sniff = sniffMediaBytes(bytes)
        if (sniff.status !== 'success') {
          return {
            status: 'failure',
            issue: packIssue(
              'pack-media-type-unsupported',
              'media',
              sourcePath,
              `Local pack media at ${JSON.stringify(sourcePath)} is not a supported raster image.`,
            ),
          }
        }
      }
      return { status: 'success', bytes }
    }
    return hosted(sourcePath)
  }
}
