import { useEffect, useState } from 'react'
import type { PublicPromptContent } from '../state/publicState'
import {
  ensureDisplayPackMediaHydration,
  subscribePackScopeAnnouncements,
} from '../pack/packMediaScopeSync'
import { resolveSameOriginMediaSrc } from './resolveSameOriginMediaSrc'
import './MediaContentDisplay.css'

/**
 * Projector-safe renderer for `PublicPromptContent` (Slice 11 + Slice 19).
 *
 * Accepts ONLY the public DTO — never private domain types — so the display
 * bundle cannot pull trusted board definitions into the projector path.
 *
 *  - text  → large-type text presentation
 *  - image → same-origin `<img>` plus optional caption/attribution; on load
 *            failure, "Image unavailable" and the authored alt as visible
 *            fallback text (no invented clue content)
 *  - unknown kind → unavailable (exhaustive switch; no silent default content)
 *
 * Slice 19: image prompts may resolve through host-private pack media hydrated
 * from IndexedDB into the shared runtime registry. No pack metadata enters
 * PublicState.
 */

export interface MediaContentDisplayProps {
  readonly content: PublicPromptContent
}

function UnavailableMedia({ reason }: { readonly reason: string }) {
  return (
    <div className="mcd mcd--unavailable" data-testid="mcd-unavailable">
      <p className="mcd__unavailable-text">{reason}</p>
    </div>
  )
}

function TextPrompt({ text }: { readonly text: string }) {
  return (
    <p className="mcd mcd__text" data-testid="mcd-text">
      {text}
    </p>
  )
}

function ImageFallback({
  content,
}: {
  readonly content: Extract<PublicPromptContent, { kind: 'image' }>
}) {
  return (
    <div className="mcd mcd--image-fallback" data-testid="mcd-image-fallback">
      <p className="mcd__status">Image unavailable</p>
      <p className="mcd__alt-fallback" data-testid="mcd-alt-fallback">
        {content.alt}
      </p>
      {content.caption !== null && (
        <p className="mcd__caption" data-testid="mcd-caption">
          {content.caption}
        </p>
      )}
      {content.attribution !== null && (
        <p className="mcd__attribution" data-testid="mcd-attribution">
          {content.attribution}
        </p>
      )}
    </div>
  )
}

function ImagePrompt({
  content,
}: {
  readonly content: Extract<PublicPromptContent, { kind: 'image' }>
}) {
  const path = content.source.path
  const [hydrateTick, setHydrateTick] = useState(0)
  // Path-scoped failure: a prior failed source must not poison a later valid
  // source, and a stale onError from an abandoned src must be ignored.
  const [failedForPath, setFailedForPath] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void ensureDisplayPackMediaHydration().then((changed) => {
      if (!cancelled && changed) setHydrateTick((tick) => tick + 1)
    })
    const unsubscribe = subscribePackScopeAnnouncements(() => {
      void ensureDisplayPackMediaHydration().then((changed) => {
        if (!cancelled && changed) setHydrateTick((tick) => tick + 1)
      })
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [path])

  // hydrateTick forces re-resolve after async pack registry hydration.
  void hydrateTick
  const src = resolveSameOriginMediaSrc(path)
  const failed = src === null || failedForPath === path

  if (failed || src === null) {
    return <ImageFallback content={content} />
  }

  return (
    <figure className="mcd mcd--image" data-testid="mcd-image">
      <img
        className="mcd__img"
        src={src}
        alt={content.alt}
        data-testid="mcd-img"
        onError={(event) => {
          if (event.currentTarget.getAttribute('src') !== src) return
          setFailedForPath(path)
        }}
      />
      {content.caption !== null && (
        <figcaption className="mcd__caption" data-testid="mcd-caption">
          {content.caption}
        </figcaption>
      )}
      {content.attribution !== null && (
        <p className="mcd__attribution" data-testid="mcd-attribution">
          {content.attribution}
        </p>
      )}
    </figure>
  )
}

export function MediaContentDisplay({ content }: MediaContentDisplayProps) {
  if (content.kind === 'text') {
    return <TextPrompt text={content.text} />
  }
  if (content.kind === 'image') {
    // Remount when the source path changes so local failure state cannot leak.
    return <ImagePrompt key={content.source.path} content={content} />
  }
  // Exhaustive for the typed union; an unknown runtime kind fails closed.
  return <UnavailableMedia reason="This clue is not available" />
}
