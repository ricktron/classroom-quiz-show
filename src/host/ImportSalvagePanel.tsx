import { useEffect, useRef } from 'react'
import type { ImportCorrectionView } from '../import/salvage'
import './ImportSalvagePanel.css'

type FailClosedProps = {
  readonly kind: 'fail-closed'
  readonly headline: string
  readonly detail: string
  readonly onDismiss: () => void
}

type CorrectionProps = {
  readonly kind: 'correction'
  readonly view: ImportCorrectionView
  readonly busy?: boolean
  readonly onKeep: () => void
  readonly onOpen: () => void
  readonly onDiscard: () => void
  readonly keepLabel?: string
}

export type ImportSalvagePanelProps = FailClosedProps | CorrectionProps

/**
 * Teacher-facing salvage review. Host only. Does not render imported text as HTML.
 */
export function ImportSalvagePanel(props: ImportSalvagePanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  const headline = props.kind === 'fail-closed' ? props.headline : props.view.headline
  const detail = props.kind === 'fail-closed' ? props.detail : props.view.detail

  return (
    <section className="import-salvage" aria-labelledby="import-salvage-title" data-testid="import-salvage">
      <h3 id="import-salvage-title" tabIndex={-1} ref={headingRef}>
        {headline}
      </h3>
      <p>{detail}</p>
      {props.kind === 'correction' ? <CorrectionLists view={props.view} /> : null}
      <div className="home__actions">
        {props.kind === 'fail-closed' ? (
          <button type="button" className="btn" onClick={props.onDismiss} data-testid="import-salvage-dismiss">
            Back to import
          </button>
        ) : props.view.persisted ? (
          <>
            <button
              type="button"
              className="btn"
              disabled={props.busy}
              onClick={props.onOpen}
              data-testid="import-salvage-open"
            >
              Open to finish
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={props.onDiscard}
              data-testid="import-salvage-close"
            >
              Close this note
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn"
              disabled={props.busy}
              onClick={props.onKeep}
              data-testid="import-salvage-keep"
            >
              {props.kind === 'correction' ? (props.keepLabel ?? 'Keep usable parts') : 'Keep usable parts'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={props.onDiscard}
              data-testid="import-salvage-discard"
            >
              Discard this import
            </button>
          </>
        )}
      </div>
    </section>
  )
}

function CorrectionLists({ view }: { readonly view: ImportCorrectionView }) {
  return (
    <>
      <p className="import-salvage__counts" aria-live="polite">
        {view.kept.length} ready to use. {view.needsTeacher.length} need you. {view.rejected.length} not kept.
      </p>
      <DetailList title="What can be used" items={view.kept} empty="Nothing is ready to play yet." />
      <DetailList title="What you need to finish" items={view.needsTeacher} empty="Nothing else is required." />
      <DetailList title="What was not kept" items={view.rejected} empty="Nothing was thrown away beyond the notes above." />
    </>
  )
}

function DetailList({
  title,
  items,
  empty,
}: {
  readonly title: string
  readonly items: readonly string[]
  readonly empty: string
}) {
  return (
    <details className="import-salvage__details">
      <summary>
        {title}
        {items.length > 0 ? ` (${items.length})` : ''}
      </summary>
      {items.length === 0 ? (
        <p className="host__note">{empty}</p>
      ) : (
        <ul className="import-salvage__list">
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      )}
    </details>
  )
}
