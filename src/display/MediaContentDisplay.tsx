import { useEffect, useState } from 'react'
import type { PublicPromptContent } from '../state/publicState'
import {
  ensureDisplayPackMediaHydration,
  subscribePackScopeAnnouncements,
} from '../pack/packMediaScopeSync'
import { resolvePackMediaSrc, resolveSameOriginMediaSrc } from './resolveSameOriginMediaSrc'
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

/** Presentation length bands for viewport-safe type scale (not schema truncation). */
function promptLengthBand(text: string): 'short' | 'medium' | 'long' {
  if (text.length > 320) return 'long'
  if (text.length > 160) return 'medium'
  return 'short'
}

function TextPrompt({ text }: { readonly text: string }) {
  return (
    <p className="mcd mcd__text" data-testid="mcd-text" data-length={promptLengthBand(text)}>
      {text}
    </p>
  )
}

/**
 * Pack-media hydration has not settled yet (FRC-6).
 *
 * Deliberately NOT `ImageFallback`: "Image unavailable" is a terminal claim,
 * and at this moment the Display does not know whether the image is available.
 * Saying so would be the projector asserting something it cannot verify.
 */
function ImageLoading({
  content,
}: {
  readonly content: Extract<PublicPromptContent, { kind: 'image' }>
}) {
  return (
    <div className="mcd mcd--image-loading" data-testid="mcd-image-loading">
      <p className="mcd__status">Loading image…</p>
      <p className="mcd__alt-fallback" data-testid="mcd-alt-fallback">
        {content.alt}
      </p>
    </div>
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
  /**
   * Has this document's first pack-media hydration attempt finished?
   *
   * Until it has, the authored path must NOT be resolved to its hosted URL. The
   * hosted URL is a real same-origin request, and a deployed build asset can sit
   * at an authored clue path — `public/media-fixtures/` ships real clue images,
   * and authored paths are not namespaced away from build output — so the
   * projector could paint a DIFFERENT clue's image for a moment before the pack
   * blob arrived. A fresh projector reaches this with no service worker at all,
   * so precache behaviour is not what protects it; not asking is (FRC-6).
   */
  const [hydrationSettled, setHydrationSettled] = useState(false)
  // Source-scoped failure: a prior failed source must not poison a later valid
  // source, and a stale onError from an abandoned src must be ignored. Scoped to
  // the resolved src, not the authored path: the same path first resolves to its
  // hosted URL and, once pack media hydrates, to the pack blob. A hosted-path
  // error that lands before hydration must not hide the blob (Court A/B
  // portable-packs failure, 2026-10-17).
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    /*
      Settle on BOTH outcomes.

      `setHydrationSettled(true)` is what releases the hosted-path fallback, so
      a rejecting hydration promise would leave this stuck on "Loading image…"
      for the rest of the lesson — a projector that never shows the clue. None
      of the three layers below `ensureDisplayPackMediaHydration` rejects today
      (`open`, `withTransaction` and `loadPackMediaAssets` all return results
      rather than throwing, and `close()` cannot throw), so this is not a live
      defect — but relying on that is relying on four other files not changing.
      Settling in `catch` too makes the guarantee local, and it fails OPEN to
      the pre-FRC-6 behaviour, which is the right direction: an honest hosted
      attempt beats a permanent placeholder.
    */
    const settle = (changed: boolean) => {
      if (cancelled) return
      setHydrationSettled(true)
      if (changed) setHydrateTick((tick) => tick + 1)
    }
    void ensureDisplayPackMediaHydration().then(settle, () => settle(false))
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
  // Before hydration settles, only a pack blob we already hold is safe to show.
  const src = hydrationSettled ? resolveSameOriginMediaSrc(path) : resolvePackMediaSrc(path)

  if (src === null) {
    // Unsettled is a loading state, not an unavailable one.
    return hydrationSettled ? (
      <ImageFallback content={content} />
    ) : (
      <ImageLoading content={content} />
    )
  }
  if (failedSrc === src) {
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
          setFailedSrc(src)
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
