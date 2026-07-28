import { useState } from 'react'
import type { PublicPromptContent } from '../state/publicState'
import { resolveSameOriginMediaSrc } from './resolveSameOriginMediaSrc'
import './MediaContentDisplay.css'

/**
 * Projector-safe renderer for `PublicPromptContent` (Slice 11).
 *
 * Accepts ONLY the public DTO — never private domain types — so the display
 * bundle cannot pull trusted board definitions into the projector path.
 *
 *  - text  → large-type text presentation
 *  - image → same-origin `<img>` plus optional caption/attribution; on load
 *            failure, "Image unavailable" and the authored alt as visible
 *            fallback text (no invented clue content)
 *  - unknown kind → unavailable (exhaustive switch; no silent default content)
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

function ImagePrompt({
  content,
}: {
  readonly content: Extract<PublicPromptContent, { kind: 'image' }>
}) {
  const [failed, setFailed] = useState(false)
  const src = resolveSameOriginMediaSrc(content.source.path)

  if (failed) {
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

  return (
    <figure className="mcd mcd--image" data-testid="mcd-image">
      <img
        className="mcd__img"
        src={src}
        alt={content.alt}
        data-testid="mcd-img"
        onError={() => setFailed(true)}
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
  switch (content.kind) {
    case 'text':
      return <TextPrompt text={content.text} />
    case 'image':
      return <ImagePrompt content={content} />
    default: {
      // Exhaustive: an unknown wire kind must not fabricate clue content.
      const _exhaustive: never = content
      void _exhaustive
      return <UnavailableMedia reason="This clue is not available" />
    }
  }
}
