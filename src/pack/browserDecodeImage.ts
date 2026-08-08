import type { SniffedMediaType } from './mediaSniff'

/**
 * Browser raster decode boundary for portable packs (Slice 19).
 *
 * Validates that sniffed PNG/JPEG/WebP/GIF bytes actually decode as an image.
 * Does not persist Blob URLs, insert DOM nodes, or accept SVG/arbitrary MIME.
 */

export interface BrowserDecodeImageEnv {
  readonly createImageBitmap?: (
    image: ImageBitmapSource,
    options?: ImageBitmapOptions,
  ) => Promise<ImageBitmap>
  readonly createObjectURL?: (blob: Blob) => string
  readonly revokeObjectURL?: (url: string) => void
  readonly Image?: typeof Image
}

export async function browserDecodeImage(
  bytes: Uint8Array,
  mediaType: SniffedMediaType,
  env: BrowserDecodeImageEnv = {},
): Promise<boolean> {
  const blob = new Blob([new Uint8Array(bytes)], { type: mediaType })
  const createImageBitmapFn =
    'createImageBitmap' in env
      ? env.createImageBitmap
      : typeof createImageBitmap === 'function'
        ? createImageBitmap.bind(globalThis)
        : undefined

  if (createImageBitmapFn) {
    let bitmap: ImageBitmap | null = null
    try {
      bitmap = await createImageBitmapFn(blob)
      return true
    } catch {
      return false
    } finally {
      if (bitmap) {
        try {
          bitmap.close()
        } catch {
          // Best-effort only.
        }
      }
    }
  }

  const ImageCtor =
    'Image' in env ? env.Image : typeof Image !== 'undefined' ? Image : undefined
  const createObjectURL =
    'createObjectURL' in env
      ? env.createObjectURL
      : typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
        ? (b: Blob) => URL.createObjectURL(b)
        : undefined
  const revokeObjectURL =
    'revokeObjectURL' in env
      ? env.revokeObjectURL
      : typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function'
        ? (u: string) => URL.revokeObjectURL(u)
        : undefined

  if (!ImageCtor || !createObjectURL || !revokeObjectURL) {
    return false
  }

  let objectUrl: string | null = null
  try {
    objectUrl = createObjectURL(blob)
    const url = objectUrl
    await new Promise<void>((resolve, reject) => {
      const image = new ImageCtor()
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('image decode failed'))
      image.src = url
    })
    return true
  } catch {
    return false
  } finally {
    if (objectUrl !== null) {
      try {
        revokeObjectURL(objectUrl)
      } catch {
        // Best-effort only.
      }
    }
  }
}
